import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Create a temporary test directory
 */
export async function createTestDir(prefix: string = "goop-test-"): Promise<string> {
  const dir = join(tmpdir(), `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Create a test file with content
 */
export async function createTestFile(
  dir: string,
  filename: string,
  content: string
): Promise<string> {
  const filePath = join(dir, filename);
  await writeFile(filePath, content, "utf-8");
  return filePath;
}

/**
 * Clean up test directory
 */
export async function cleanupTestDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}
