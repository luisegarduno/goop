import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { readFile } from "fs/promises";
import { resolve, relative, sep } from "path";
import fg from "fast-glob";

// Security limits to prevent ReDoS attacks
const MAX_PATTERN_LENGTH = 500;
const MAX_TOTAL_MATCHES = 10000;
const OPERATION_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Validates a regex pattern for known ReDoS vulnerabilities
 */
function validateRegexPattern(pattern: string): void {
  if (pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error(
      `Regex pattern too long (max ${MAX_PATTERN_LENGTH} characters)`
    );
  }

  // Check for nested quantifiers: (x+)*, (x*)+ (x+)+, (x*)*
  // This catches patterns like (a+)*, (b*)+ which cause catastrophic backtracking
  if (/\([^)]*[*+][^)]*\)[*+]/.test(pattern)) {
    throw new Error(
      `Regex pattern contains potentially dangerous nested quantifiers that could cause ReDoS attacks`
    );
  }

  // Check for multiple consecutive quantifiers: ++, **, *+, +*
  if (/[*+]{2,}/.test(pattern)) {
    throw new Error(
      `Regex pattern contains consecutive quantifiers that could cause ReDoS attacks`
    );
  }

  // Check for deeply nested groups (3+ levels) which can be problematic
  let depth = 0;
  let maxDepth = 0;
  for (const char of pattern) {
    if (char === '(') {
      depth++;
      maxDepth = Math.max(maxDepth, depth);
    } else if (char === ')') {
      depth--;
    }
  }
  if (maxDepth > 5) {
    throw new Error(
      `Regex pattern has too many nested groups (max 5 levels) which could cause ReDoS attacks`
    );
  }
}

export const GrepInputSchema = z.object({
  pattern: z.string().describe("Regular expression pattern to search for"),
  glob: z
    .string()
    .optional()
    .describe(
      "Glob pattern to filter files (e.g., '**/*.ts'). Default: '**/*' (all files)"
    ),
  context_lines: z
    .number()
    .optional()
    .describe(
      "Number of context lines to show before and after matches. Default: 0"
    ),
});

export type GrepInput = z.infer<typeof GrepInputSchema>;

export class GrepTool implements Tool<GrepInput> {
  name = "grep";
  description =
    "Search for a regex pattern in files matching a glob pattern, with optional context lines";
  schema = GrepInputSchema;

  async execute(input: GrepInput, context: ToolContext): Promise<string> {
    try {
      const globPattern = input.glob || "**/*";
      const contextLines = input.context_lines || 0;

      // Validate regex pattern for ReDoS vulnerabilities
      validateRegexPattern(input.pattern);

      // Start timeout tracking
      const startTime = Date.now();
      const checkTimeout = () => {
        if (Date.now() - startTime > OPERATION_TIMEOUT_MS) {
          throw new Error(
            `Grep operation timed out after ${OPERATION_TIMEOUT_MS}ms`
          );
        }
      };

      // Find matching files
      const files = await fg(globPattern, {
        cwd: context.workingDir,
        absolute: true,
        onlyFiles: true,
        ignore: [
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/build/**",
        ],
      });

      checkTimeout();

      // Security: ensure all files are within working directory
      const normalizedWorkingDir = resolve(context.workingDir);
      for (const file of files) {
        const normalizedPath = resolve(file);
        if (!normalizedPath.startsWith(normalizedWorkingDir + sep)) {
          throw new Error(
            "Access denied: glob pattern matches files outside working directory"
          );
        }
      }

      // Compile regex pattern
      let regex: RegExp;
      try {
        regex = new RegExp(input.pattern, "gm");
      } catch (error: any) {
        throw new Error(`Invalid regex pattern: ${error.message}`);
      }

      // Search through files
      const results: string[] = [];
      let totalMatches = 0;

      for (const filePath of files) {
        checkTimeout();

        try {
          const content = await readFile(filePath, "utf-8");
          const lines = content.split("\n");
          const relPath = relative(context.workingDir, filePath);
          const matchedLines = new Set<number>();

          // Find all matches with timeout and limit protection
          for (let index = 0; index < lines.length; index++) {
            checkTimeout();

            if (totalMatches >= MAX_TOTAL_MATCHES) {
              throw new Error(
                `Maximum match limit reached (${MAX_TOTAL_MATCHES}). Refine your search pattern.`
              );
            }

            const line = lines[index];
            if (line !== undefined && regex.test(line)) {
              matchedLines.add(index);
              totalMatches++;
            }
          }

          // Add context lines
          const linesToShow = new Set<number>();
          matchedLines.forEach((lineNum) => {
            for (
              let i = lineNum - contextLines;
              i <= lineNum + contextLines;
              i++
            ) {
              if (i >= 0 && i < lines.length) {
                linesToShow.add(i);
              }
            }
          });

          // Format output
          if (linesToShow.size > 0) {
            results.push(`\n${relPath}:`);
            const sortedLines = Array.from(linesToShow).sort((a, b) => a - b);

            sortedLines.forEach((lineNum, idx) => {
              const isMatch = matchedLines.has(lineNum);
              const prefix = isMatch ? "→" : " ";
              results.push(`${prefix} ${lineNum + 1}: ${lines[lineNum]}`);

              // Add separator for gaps in line numbers
              const nextLine = sortedLines[idx + 1];
              if (
                idx < sortedLines.length - 1 &&
                nextLine !== undefined &&
                nextLine > lineNum + 1
              ) {
                results.push("  ...");
              }
            });
          }
        } catch (error: any) {
          // Re-throw security-related errors (timeout, match limit)
          if (
            error.message.includes("timed out") ||
            error.message.includes("Maximum match limit")
          ) {
            throw error;
          }

          // Skip files that can't be read (binary, permission issues, etc.)
          if (error.code !== "ENOENT" && error.code !== "EISDIR") {
            console.warn(`Skipping ${filePath}: ${error.message}`);
          }
        }
      }

      if (results.length === 0) {
        return `No matches found for pattern "${input.pattern}" in ${files.length} files`;
      }

      return `Found ${totalMatches} match(es) in ${
        results.length / 2
      } file(s):\n${results.join("\n")}`;
    } catch (error: any) {
      throw new Error(`Grep failed: ${error.message}`);
    }
  }
}
