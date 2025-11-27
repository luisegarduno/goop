import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { relative } from "path";
import fg from "fast-glob";

export const GlobInputSchema = z.object({
  pattern: z
    .string()
    .describe(
      "Glob pattern to match files (e.g., '**/*.ts', 'src/**/*.{js,jsx}')"
    ),
  include_directories: z
    .boolean()
    .optional()
    .describe("Include directories in results. Default: false (files only)"),
});

export type GlobInput = z.infer<typeof GlobInputSchema>;

export class GlobTool implements Tool<GlobInput> {
  name = "glob";
  description = "Find files and optionally directories matching a glob pattern";
  schema = GlobInputSchema;

  async execute(input: GlobInput, context: ToolContext): Promise<string> {
    try {
      const includeDirs = input.include_directories || false;

      // Find matching files/directories
      const matches = await fg(input.pattern, {
        cwd: context.workingDir,
        absolute: true,
        onlyFiles: !includeDirs,
        ignore: ["**/node_modules/**", "**/.git/**"],
      });

      // Security: ensure all matches are within working directory
      for (const match of matches) {
        if (!match.startsWith(context.workingDir)) {
          throw new Error(
            "Access denied: glob pattern matches paths outside working directory"
          );
        }
      }

      // Convert to relative paths for cleaner output
      const relativeMatches = matches.map((match) =>
        relative(context.workingDir, match)
      );

      if (relativeMatches.length === 0) {
        return `No files found matching pattern "${input.pattern}"`;
      }

      // Sort alphabetically for consistent output
      relativeMatches.sort();

      return `Found ${
        relativeMatches.length
      } match(es):\n${relativeMatches.join("\n")}`;
    } catch (error: any) {
      throw new Error(`Glob failed: ${error.message}`);
    }
  }
}
