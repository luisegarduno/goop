import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { ReadFileTool } from "./read";
import {
  createTestDir,
  createTestFile,
  cleanupTestDir,
} from "../../test/utils/fs";

describe("ReadFileTool", () => {
  let tool: ReadFileTool;
  let testDir: string;

  beforeEach(async () => {
    tool = new ReadFileTool();
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe("Schema Validation", () => {
    test("validates correct input", () => {
      const result = tool.schema.safeParse({ path: "test.txt" });
      expect(result.success).toBe(true);
    });

    test("rejects missing path", () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });

    test("rejects non-string path", () => {
      const result = tool.schema.safeParse({ path: 123 });
      expect(result.success).toBe(false);
    });

    test("allows empty string path (validation at execution)", () => {
      const result = tool.schema.safeParse({ path: "" });
      // Schema validation allows empty strings, but execution would fail
      expect(result.success).toBe(true);
    });
  });

  describe("Successful File Reading", () => {
    test("reads existing file content", async () => {
      const content = "Hello from test file!";
      await createTestFile(testDir, "test.txt", content);

      const result = await tool.execute(
        { path: "test.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe(content);
    });

    test("reads file with UTF-8 content", async () => {
      const content = "Hello 世界 🌍";
      await createTestFile(testDir, "utf8.txt", content);

      const result = await tool.execute(
        { path: "utf8.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe(content);
    });

    test("reads file in subdirectory", async () => {
      const { mkdir } = await import("fs/promises");
      const subdir = `${testDir}/subdir`;
      await mkdir(subdir);

      const content = "Subdirectory content";
      await createTestFile(subdir, "nested.txt", content);

      const result = await tool.execute(
        { path: "subdir/nested.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe(content);
    });

    test("reads empty file", async () => {
      await createTestFile(testDir, "empty.txt", "");

      const result = await tool.execute(
        { path: "empty.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe("");
    });

    test("reads large file", async () => {
      const largeContent = "x".repeat(100000); // 100KB
      await createTestFile(testDir, "large.txt", largeContent);

      const result = await tool.execute(
        { path: "large.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe(largeContent);
    });

    test("reads file with special characters in name", async () => {
      const content = "Special name test";
      await createTestFile(testDir, "file-with_special.chars.txt", content);

      const result = await tool.execute(
        { path: "file-with_special.chars.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe(content);
    });
  });

  describe("Security - Path Traversal Protection", () => {
    test("blocks relative path traversal (../)", async () => {
      await expect(
        tool.execute({ path: "../etc/passwd" }, { workingDir: testDir })
      ).rejects.toThrow("Access denied");
    });

    test("blocks multiple level traversal (../../)", async () => {
      await expect(
        tool.execute({ path: "../../etc/passwd" }, { workingDir: testDir })
      ).rejects.toThrow("Access denied");
    });

    test("blocks absolute path outside working dir", async () => {
      await expect(
        tool.execute({ path: "/etc/passwd" }, { workingDir: testDir })
      ).rejects.toThrow("Access denied");
    });

    test("blocks path with . current dir then traversal", async () => {
      await expect(
        tool.execute({ path: "./../../etc/passwd" }, { workingDir: testDir })
      ).rejects.toThrow("Access denied");
    });

    test("blocks path with subdirectory then traversal", async () => {
      await expect(
        tool.execute(
          { path: "subdir/../../etc/passwd" },
          { workingDir: testDir }
        )
      ).rejects.toThrow("Access denied");
    });

    test("allows legitimate subdirectory access", async () => {
      const { mkdir } = await import("fs/promises");
      const subdir = `${testDir}/allowed`;
      await mkdir(subdir);
      await createTestFile(subdir, "safe.txt", "Safe content");

      const result = await tool.execute(
        { path: "allowed/safe.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe("Safe content");
    });

    test("allows . current directory", async () => {
      await createTestFile(testDir, "current.txt", "Current dir");

      const result = await tool.execute(
        { path: "./current.txt" },
        { workingDir: testDir }
      );

      expect(result).toBe("Current dir");
    });
  });

  describe("Error Handling", () => {
    test("throws error for non-existent file", async () => {
      await expect(
        tool.execute({ path: "nonexistent.txt" }, { workingDir: testDir })
      ).rejects.toThrow("File not found");
    });

    test("throws error for directory path", async () => {
      const { mkdir } = await import("fs/promises");
      await mkdir(`${testDir}/somedir`);

      await expect(
        tool.execute({ path: "somedir" }, { workingDir: testDir })
      ).rejects.toThrow();
    });

    test("error message includes file path", async () => {
      await expect(
        tool.execute({ path: "missing.txt" }, { workingDir: testDir })
      ).rejects.toThrow("missing.txt");
    });
  });

  describe("Tool Metadata", () => {
    test("has correct name", () => {
      expect(tool.name).toBe("read_file");
    });

    test("has description", () => {
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe("string");
    });

    test("has schema", () => {
      expect(tool.schema).toBeDefined();
    });
  });
});
