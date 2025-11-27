import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { readFile } from "fs/promises";
import { resolve, relative, sep } from "path";
import fg from "fast-glob";

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
        try {
          const content = await readFile(filePath, "utf-8");
          const lines = content.split("\n");
          const relPath = relative(context.workingDir, filePath);
          const matchedLines = new Set<number>();

          // Find all matches
          lines.forEach((line, index) => {
            if (regex.test(line)) {
              matchedLines.add(index);
              totalMatches++;
            }
          });

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
