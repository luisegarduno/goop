import { z } from "zod";
import { Tool, ToolContext } from "./base";
import { readFile } from "fs/promises";
import { resolve } from "path";

export const ReadFileInputSchema = z.object({
  path: z.string().describe("The file path to read"),
});

export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

export class ReadFileTool implements Tool<ReadFileInput> {
  name = "read_file";
  description = "Read the contents of a file from the local filesystem";
  schema = ReadFileInputSchema;

  async execute(input: ReadFileInput, context: ToolContext): Promise<string> {
    try {
      const filePath = resolve(context.workingDir, input.path);

      // Basic security: ensure we don't read outside working directory
      if (!filePath.startsWith(context.workingDir)) {
        throw new Error(
          "Access denied: cannot read files outside working directory"
        );
      }

      const content = await readFile(filePath, "utf-8");
      return content;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`File not found: ${input.path}`);
      }
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }
}
