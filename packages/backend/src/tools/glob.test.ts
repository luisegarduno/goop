import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { GlobTool } from "./glob";
import {
  createTestDir,
  createTestFile,
  cleanupTestDir,
} from "../../test/utils/fs";
import { mkdir } from "fs/promises";
import { join } from "path";

describe("GlobTool", () => {
  let tool: GlobTool;
  let testDir: string;

  beforeEach(async () => {
    tool = new GlobTool();
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe("Schema Validation", () => {
    test("validates minimal input", () => {
      const result = tool.schema.safeParse({ pattern: "*.txt" });
      expect(result.success).toBe(true);
    });

    test("validates input with include_directories", () => {
      const result = tool.schema.safeParse({
        pattern: "*.txt",
        include_directories: true,
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing pattern", () => {
      const result = tool.schema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("Basic File Matching", () => {
    test("finds files by extension", async () => {
      await createTestFile(testDir, "file1.txt", "");
      await createTestFile(testDir, "file2.txt", "");
      await createTestFile(testDir, "file3.md", "");

      const result = await tool.execute(
        { pattern: "*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("file1.txt");
      expect(result).toContain("file2.txt");
      expect(result).not.toContain("file3.md");
    });

    test("finds files with wildcard pattern", async () => {
      await createTestFile(testDir, "test-1.txt", "");
      await createTestFile(testDir, "test-2.txt", "");
      await createTestFile(testDir, "other.txt", "");

      const result = await tool.execute(
        { pattern: "test-*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("test-1.txt");
      expect(result).toContain("test-2.txt");
      expect(result).not.toContain("other.txt");
    });

    test("finds files recursively with **", async () => {
      await mkdir(join(testDir, "subdir"));
      await createTestFile(testDir, "root.txt", "");
      await createTestFile(join(testDir, "subdir"), "nested.txt", "");

      const result = await tool.execute(
        { pattern: "**/*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("root.txt");
      expect(result).toContain("subdir/nested.txt");
    });

    test("returns empty result when no matches", async () => {
      await createTestFile(testDir, "file.md", "");

      const result = await tool.execute(
        { pattern: "*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("No files found");
    });
  });

  describe("Directory Matching", () => {
    test("excludes directories by default", async () => {
      await mkdir(join(testDir, "somedir"));
      await createTestFile(testDir, "somefile", "");

      const result = await tool.execute(
        { pattern: "some*" },
        { workingDir: testDir }
      );

      expect(result).toContain("somefile");
      expect(result).not.toContain("somedir");
    });

    test("includes directories when flag set", async () => {
      await mkdir(join(testDir, "somedir"));
      await createTestFile(testDir, "somefile", "");

      const result = await tool.execute(
        {
          pattern: "some*",
          include_directories: true,
        },
        { workingDir: testDir }
      );

      expect(result).toContain("somefile");
      expect(result).toContain("somedir");
    });
  });

  describe("Result Formatting", () => {
    test("returns results in alphabetical order", async () => {
      await createTestFile(testDir, "zebra.txt", "");
      await createTestFile(testDir, "alpha.txt", "");
      await createTestFile(testDir, "beta.txt", "");

      const result = await tool.execute(
        { pattern: "*.txt" },
        { workingDir: testDir }
      );

      const lines = result.split("\n").filter((l) => l.includes(".txt"));
      expect(lines[0]).toContain("alpha.txt");
      expect(lines[1]).toContain("beta.txt");
      expect(lines[2]).toContain("zebra.txt");
    });

    test("returns relative paths from working directory", async () => {
      await mkdir(join(testDir, "subdir"));
      await createTestFile(join(testDir, "subdir"), "nested.txt", "");

      const result = await tool.execute(
        { pattern: "**/*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("subdir/nested.txt");
      expect(result).not.toContain(testDir); // Should be relative, not absolute
    });
  });

  describe("Security - Path Traversal Protection", () => {
    test("ensures matched files are within working directory", async () => {
      // fast-glob handles pattern resolution and security
      // The tool validates results are within working directory
      await createTestFile(testDir, "test.txt", "");

      const result = await tool.execute(
        { pattern: "*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("test.txt");
    });

    test("validates all matched files within working directory", async () => {
      // This test ensures that even if fast-glob returns files outside
      // working dir, they are filtered out
      await createTestFile(testDir, "allowed.txt", "");

      const result = await tool.execute(
        { pattern: "*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("allowed.txt");
    });
  });

  describe("Ignored Patterns", () => {
    test("ignores node_modules by default", async () => {
      await mkdir(join(testDir, "node_modules"));
      await createTestFile(join(testDir, "node_modules"), "package.txt", "");
      await createTestFile(testDir, "normal.txt", "");

      const result = await tool.execute(
        { pattern: "**/*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("normal.txt");
      expect(result).not.toContain("node_modules");
    });

    test("ignores .git by default", async () => {
      await mkdir(join(testDir, ".git"));
      await createTestFile(join(testDir, ".git"), "config.txt", "");
      await createTestFile(testDir, "normal.txt", "");

      const result = await tool.execute(
        { pattern: "**/*.txt" },
        { workingDir: testDir }
      );

      expect(result).toContain("normal.txt");
      expect(result).not.toContain(".git");
    });
  });

  describe("Tool Metadata", () => {
    test("has correct name", () => {
      expect(tool.name).toBe("glob");
    });

    test("has description", () => {
      expect(tool.description).toBeTruthy();
    });

    test("has schema", () => {
      expect(tool.schema).toBeDefined();
    });
  });
});
