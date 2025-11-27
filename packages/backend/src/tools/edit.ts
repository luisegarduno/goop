import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { readFile, writeFile } from "fs/promises";
import { resolve, sep } from "path";

export const EditFileInputSchema = z.object({
  path: z
    .string()
    .describe("The file path to edit (relative to working directory)"),
  old_string: z
    .string()
    .describe(
      "The exact string to search for and replace (ALL occurrences will be replaced)"
    ),
  new_string: z.string().describe("The string to replace it with"),
});

export type EditFileInput = z.infer<typeof EditFileInputSchema>;

export class EditFileTool implements Tool<EditFileInput> {
  name = "edit_file";
  description =
    "Edit a file by replacing ALL occurrences of an old string with a new string (exact match required)";
  schema = EditFileInputSchema;

  async execute(input: EditFileInput, context: ToolContext): Promise<string> {
    try {
      const normalizedWorkingDir = resolve(context.workingDir);
      const filePath = resolve(context.workingDir, input.path);

      // Security: ensure we don't edit outside working directory
      if (!filePath.startsWith(normalizedWorkingDir + sep)) {
        throw new Error(
          "Access denied: cannot edit files outside working directory"
        );
      }

      // Read current content
      const content = await readFile(filePath, "utf-8");

      // Check if old_string exists
      if (!content.includes(input.old_string)) {
        throw new Error(
          `String not found in file. The exact string "${input.old_string.substring(
            0,
            50
          )}${input.old_string.length > 50 ? "..." : ""}" does not exist in ${
            input.path
          }`
        );
      }

      // Count occurrences
      const occurrences = content.split(input.old_string).length - 1;

      // Perform replacement (replaces ALL occurrences)
      const newContent = content.replaceAll(input.old_string, input.new_string);

      // Write back
      await writeFile(filePath, newContent, "utf-8");

      return `Successfully replaced ${occurrences} occurrence(s) in ${input.path}`;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`File not found: ${input.path}`);
      }
      if (error.code === "EACCES") {
        throw new Error(`Permission denied: ${input.path}`);
      }
      throw new Error(`Failed to edit file: ${error.message}`);
    }
  }
}
