import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { EditFileTool } from "./edit";
import {
  createTestDir,
  createTestFile,
  cleanupTestDir,
} from "../../test/utils/fs";
import { readFile } from "fs/promises";
import { join } from "path";

describe("EditFileTool", () => {
  let tool: EditFileTool;
  let testDir: string;

  beforeEach(async () => {
    tool = new EditFileTool();
    testDir = await createTestDir();
  });

  afterEach(async () => {
    await cleanupTestDir(testDir);
  });

  describe("Schema Validation", () => {
    test("validates correct input", () => {
      const result = tool.schema.safeParse({
        path: "test.txt",
        old_string: "old",
        new_string: "new",
      });
      expect(result.success).toBe(true);
    });

    test("rejects missing path", () => {
      const result = tool.schema.safeParse({
        old_string: "old",
        new_string: "new",
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing old_string", () => {
      const result = tool.schema.safeParse({
        path: "test.txt",
        new_string: "new",
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing new_string", () => {
      const result = tool.schema.safeParse({
        path: "test.txt",
        old_string: "old",
      });
      expect(result.success).toBe(false);
    });

    test("allows empty new_string", () => {
      const result = tool.schema.safeParse({
        path: "test.txt",
        old_string: "old",
        new_string: "",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Successful Editing", () => {
    test("replaces single occurrence", async () => {
      await createTestFile(testDir, "single.txt", "Hello world");

      const result = await tool.execute(
        {
          path: "single.txt",
          old_string: "world",
          new_string: "universe",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("1 occurrence");

      const content = await readFile(join(testDir, "single.txt"), "utf-8");
      expect(content).toBe("Hello universe");
    });

    test("replaces ALL occurrences", async () => {
      await createTestFile(testDir, "multiple.txt", "foo bar foo baz foo");

      const result = await tool.execute(
        {
          path: "multiple.txt",
          old_string: "foo",
          new_string: "qux",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("3 occurrence");

      const content = await readFile(join(testDir, "multiple.txt"), "utf-8");
      expect(content).toBe("qux bar qux baz qux");
    });

    test("replaces with empty string (deletion)", async () => {
      await createTestFile(testDir, "delete.txt", "Remove THIS word");

      await tool.execute(
        {
          path: "delete.txt",
          old_string: "THIS ",
          new_string: "",
        },
        { workingDir: testDir }
      );

      const content = await readFile(join(testDir, "delete.txt"), "utf-8");
      expect(content).toBe("Remove word");
    });

    test("replaces multiline string", async () => {
      await createTestFile(
        testDir,
        "multiline.txt",
        "Line 1\nOld block\nLine 3"
      );

      await tool.execute(
        {
          path: "multiline.txt",
          old_string: "Old block",
          new_string: "New block",
        },
        { workingDir: testDir }
      );

      const content = await readFile(join(testDir, "multiline.txt"), "utf-8");
      expect(content).toBe("Line 1\nNew block\nLine 3");
    });

    test("replaces string with special characters", async () => {
      await createTestFile(testDir, "special.txt", "Price: $100.00");

      await tool.execute(
        {
          path: "special.txt",
          old_string: "$100.00",
          new_string: "$200.00",
        },
        { workingDir: testDir }
      );

      const content = await readFile(join(testDir, "special.txt"), "utf-8");
      expect(content).toBe("Price: $200.00");
    });

    test("handles case-sensitive replacement", async () => {
      await createTestFile(testDir, "case.txt", "Hello HELLO hello");

      await tool.execute(
        {
          path: "case.txt",
          old_string: "HELLO",
          new_string: "hi",
        },
        { workingDir: testDir }
      );

      const content = await readFile(join(testDir, "case.txt"), "utf-8");
      expect(content).toBe("Hello hi hello");
    });
  });

  describe("Error Handling", () => {
    test("throws error when old_string not found", async () => {
      await createTestFile(testDir, "notfound.txt", "Content here");

      await expect(
        tool.execute(
          {
            path: "notfound.txt",
            old_string: "NonExistent",
            new_string: "New",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("not found in file");
    });

    test("throws error for non-existent file", async () => {
      await expect(
        tool.execute(
          {
            path: "missing.txt",
            old_string: "old",
            new_string: "new",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("File not found");
    });

    test("error message includes file path", async () => {
      await expect(
        tool.execute(
          {
            path: "test.txt",
            old_string: "old",
            new_string: "new",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("test.txt");
    });
  });

  describe("Security - Path Traversal Protection", () => {
    test("blocks relative path traversal", async () => {
      await expect(
        tool.execute(
          {
            path: "../evil.txt",
            old_string: "old",
            new_string: "new",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("Access denied");
    });

    test("blocks absolute path outside working dir", async () => {
      await expect(
        tool.execute(
          {
            path: "/etc/passwd",
            old_string: "root",
            new_string: "hacked",
          },
          { workingDir: testDir }
        )
      ).rejects.toThrow("Access denied");
    });

    test("allows legitimate subdirectory edit", async () => {
      const { mkdir } = await import("fs/promises");
      await mkdir(`${testDir}/subdir`);
      await createTestFile(`${testDir}/subdir`, "allowed.txt", "Edit me");

      const result = await tool.execute(
        {
          path: "subdir/allowed.txt",
          old_string: "me",
          new_string: "us",
        },
        { workingDir: testDir }
      );

      expect(result).toContain("1 occurrence");
    });
  });

  describe("Edge Cases", () => {
    test("handles very long old_string", async () => {
      const longString = "x".repeat(10000);
      await createTestFile(testDir, "long.txt", `Start ${longString} End`);

      await tool.execute(
        {
          path: "long.txt",
          old_string: longString,
          new_string: "SHORT",
        },
        { workingDir: testDir }
      );

      const content = await readFile(join(testDir, "long.txt"), "utf-8");
      expect(content).toBe("Start SHORT End");
    });

    test("returns correct count with overlapping patterns", async () => {
      // replaceAll does NOT handle overlapping matches
      await createTestFile(testDir, "overlap.txt", "aaa");

      const result = await tool.execute(
        {
          path: "overlap.txt",
          old_string: "aa",
          new_string: "b",
        },
        { workingDir: testDir }
      );

      // JavaScript replaceAll finds 1 match: "aa" at start
      // Result: "ba" (only first match replaced)
      expect(result).toContain("1 occurrence");
    });
  });

  describe("Tool Metadata", () => {
    test("has correct name", () => {
      expect(tool.name).toBe("edit_file");
    });

    test("has description", () => {
      expect(tool.description).toBeTruthy();
    });

    test("has schema", () => {
      expect(tool.schema).toBeDefined();
    });
  });
});
