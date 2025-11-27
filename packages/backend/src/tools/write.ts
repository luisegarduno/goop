import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { writeFile, mkdir } from "fs/promises";
import { resolve, dirname } from "path";

export const WriteFileInputSchema = z.object({
  path: z.string().describe("The file path to write (relative to working directory)"),
  content: z.string().describe("The content to write to the file"),
});

export type WriteFileInput = z.infer<typeof WriteFileInputSchema>;

export class WriteFileTool implements Tool<WriteFileInput> {
  name = "write_file";
  description = "Write content to a file, creating it if it doesn't exist or overwriting if it does";
  schema = WriteFileInputSchema;

  async execute(input: WriteFileInput, context: ToolContext): Promise<string> {
    try {
      const filePath = resolve(context.workingDir, input.path);

      // Security: ensure we don't write outside working directory
      if (!filePath.startsWith(context.workingDir)) {
        throw new Error(
          "Access denied: cannot write files outside working directory"
        );
      }

      // Ensure parent directory exists
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });

      // Write the file
      await writeFile(filePath, input.content, "utf-8");

      const bytes = Buffer.byteLength(input.content, "utf-8");
      return `Successfully wrote ${bytes} bytes to ${input.path}`;
    } catch (error: any) {
      if (error.code === "EACCES") {
        throw new Error(`Permission denied: ${input.path}`);
      }
      if (error.code === "EISDIR") {
        throw new Error(`Path is a directory: ${input.path}`);
      }
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
}
