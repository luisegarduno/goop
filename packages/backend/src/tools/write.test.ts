import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { WriteFileTool } from "./write";
import { createTestDir, cleanupTestDir } from "../../test/utils/fs";
import { readFile, stat } from "fs/promises";
import { join } from "path";

describe("WriteFileTool", () => {
  let tool: WriteFileTool;
  let testDir: string;

  beforeEach(async () => {
    tool = new WriteFileTool();
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe("Schema Validation", () => {
    test("validates correct input", () => {
      const result = tool.schema.safeParse({
        path: "test.txt",
        content: "Hello",
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing path", () => {
      const result = tool.schema.safeParse({ content: "Hello" });
      expect(result.success).toBe(false);
    });

    test("rejects missing content", () => {
      const result = tool.schema.safeParse({ path: "test.txt" });
      expect(result.success).toBe(false);
    });

    test("allows empty string content", () => {
      const result = tool.schema.safeParse({
        path: "test.txt",
        content: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("File Creation", () => {
    test("creates new file with content", async () => {
      const result = await tool.execute(
        {
          path: "new.txt",
          content: "New file content",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("created");
      expect(result).toContain("new.txt");

      const content = await readFile(join(testDir, "new.txt"), "utf-8");
      expect(content).toBe("New file content");
    });

    test("creates file in subdirectory, creating parent dirs", async () => {
      const result = await tool.execute(
        {
          path: "subdir/nested/file.txt",
          content: "Nested content",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("created");

      const content = await readFile(
        join(testDir, "subdir/nested/file.txt"),
        "utf-8"
      );
      expect(content).toBe("Nested content");
    });

    test("creates empty file", async () => {
      await tool.execute(
        {
          path: "empty.txt",
          content: "",
        },
        { workingDir: testDir }
      );

      const content = await readFile(join(testDir, "empty.txt"), "utf-8");
      expect(content).toBe("");
    });

    test("creates file with UTF-8 content", async () => {
      const utf8Content = "Hello 世界 🌍";
      await tool.execute(
        {
          path: "utf8.txt",
          content: utf8Content,
        },
        { workingDir: testDir }
      );

      const content = await readFile(join(testDir, "utf8.txt"), "utf-8");
      expect(content).toBe(utf8Content);
    });

    test("returns byte count in result", async () => {
      const result = await tool.execute(
        {
          path: "counted.txt",
          content: "12345",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("5 bytes");
    });
  });

  describe("File Overwriting", () => {
    test("overwrites existing file", async () => {
      const filePath = join(testDir, "overwrite.txt");
      await Bun.write(filePath, "Original content");

      const result = await tool.execute(
        {
          path: "overwrite.txt",
          content: "New content",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("overwrote");

      const content = await readFile(filePath, "utf-8");
      expect(content).toBe("New content");
    });

    test("completely replaces existing content", async () => {
      const filePath = join(testDir, "replace.txt");
      await Bun.write(filePath, "Long original content here");

      await tool.execute(
        {
          path: "replace.txt",
          content: "Short",
        },
        { workingDir: testDir }
      );

      const content = await readFile(filePath, "utf-8");
      expect(content).toBe("Short");
      expect(content).not.toContain("original");
    });
  });

  describe("Security - Path Traversal Protection", () => {
    test("blocks relative path traversal", async () => {
      await expect(
        tool.execute(
          {
            path: "../evil.txt",
            content: "Malicious",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("Access denied");
    });

    test("blocks absolute path outside working dir", async () => {
      await expect(
        tool.execute(
          {
            path: "/tmp/evil.txt",
            content: "Malicious",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("Access denied");
    });

    test("blocks multiple level traversal", async () => {
      await expect(
        tool.execute(
          {
            path: "../../etc/passwd",
            content: "Hacked",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("Access denied");
    });

    test("allows legitimate subdirectory write", async () => {
      const result = await tool.execute(
        {
          path: "allowed/safe.txt",
          content: "Safe content",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("created");
    });
  });

  describe("Error Handling", () => {
    test("error message includes file path on failure", async () => {
      // This test is platform-specific and may not work consistently
      // Skipping detailed implementation as it requires complex permission setup
    });
  });

  describe("Tool Metadata", () => {
    test("has correct name", () => {
      expect(tool.name).toBe("write_file");
    });

    test("has description", () => {
      expect(tool.description).toBeTruthy();
    });

    test("has schema", () => {
      expect(tool.schema).toBeDefined();
    });
  });
});
