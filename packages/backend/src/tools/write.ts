import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { resolve, sep } from "path";

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
      const normalizedWorkingDir = resolve(context.workingDir);
      const filePath = resolve(context.workingDir, input.path);

      // Security: ensure we don't write outside working directory
      if (!filePath.startsWith(normalizedWorkingDir + sep)) {
        throw new Error(
          "Access denied: cannot write files outside working directory"
        );
      }

      // Check if file exists before writing
      const fileExisted = await Bun.file(filePath).exists();

      // Write the file (Bun.write automatically creates parent directories)
      await Bun.write(filePath, input.content);

      const bytes = Buffer.byteLength(input.content, "utf-8");
      const action = fileExisted ? "overwrote" : "created";
      return `Successfully ${action} ${input.path} (${bytes} bytes)`;
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
