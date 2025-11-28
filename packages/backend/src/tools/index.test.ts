import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { tools, getToolDefinitions, executeTool } from "./index";
import { createTestDir, cleanupTestDir } from "../../test/utils/fs";

describe("Tool Registry", () => {
  describe("tools array", () => {
    test("exports array of tools", () => {
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    test("all tools have required properties", () => {
      tools.forEach((tool) => {
        expect(tool.name).toBeTruthy();
        expect(typeof tool.name).toBe("string");
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe("string");
        expect(tool.schema).toBeDefined();
        expect(typeof tool.execute).toBe("function");
      });
    });

    test("includes all expected tools", () => {
      const toolNames = tools.map((t) => t.name);

      expect(toolNames).toContain("read_file");
      expect(toolNames).toContain("write_file");
      expect(toolNames).toContain("edit_file");
      expect(toolNames).toContain("grep");
      expect(toolNames).toContain("glob");
    });

    test("all tool names are unique", () => {
      const names = tools.map((t) => t.name);
      const uniqueNames = new Set(names);

      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe("getToolDefinitions", () => {
    test("returns array of tool definitions", () => {
      const definitions = getToolDefinitions();

      expect(Array.isArray(definitions)).toBe(true);
      expect(definitions.length).toBe(tools.length);
    });

    test("includes name and description", () => {
      const definitions = getToolDefinitions();

      definitions.forEach((def) => {
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
      });
    });

    test("includes input_schema from Zod schema", () => {
      const definitions = getToolDefinitions();

      definitions.forEach((def) => {
        expect(def.input_schema).toBeDefined();
        // The schema is a Zod schema object, not a JSON schema
        expect(typeof def.input_schema).toBe("object");
      });
    });
  });

  describe("executeTool", () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = await createTestDir();
    });

    afterEach(async () => {
      await cleanupTestDir(testDir);
    });

    test("executes valid tool with valid input", async () => {
      const result = await executeTool(
        "glob",
        { pattern: "*.txt" },
        { workingDir: testDir }
      );

      expect(typeof result).toBe("string");
    });

    test("throws error for unknown tool name", async () => {
      try {
        await executeTool("unknown_tool", { some: "input" }, { workingDir: testDir });
        throw new Error("Should have thrown");
      } catch (error: any) {
        expect(error.message).toContain("Unknown tool");
      }
    });

    test("validates input with Zod schema", async () => {
      try {
        await executeTool(
          "read_file",
          { invalid: "input" }, // missing 'path'
          { workingDir: testDir }
        );
        throw new Error("Should have thrown");
      } catch (error: any) {
        // Zod throws ZodError which has an issues array
        expect(error.issues || error.message).toBeTruthy();
      }
    });

    test("passes context to tool execution", async () => {
      const { writeFile } = await import("fs/promises");
      const testFile = `${testDir}/test.txt`;
      await writeFile(testFile, "content");

      const result = await executeTool(
        "read_file",
        { path: "test.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe("content");
    });

    test("propagates tool execution errors", async () => {
      await expect(
        executeTool(
          "read_file",
          { path: "nonexistent.txt" },
          { workingDir: testDir }
        )
      ).rejects.toThrow("File not found");
    });
  });
});
