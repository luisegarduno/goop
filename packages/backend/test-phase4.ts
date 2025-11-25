// Test script for Phase 4 verification
import { AnthropicProvider } from "./src/providers/anthropic";
import { ReadFileTool } from "./src/tools/read";
import { getToolDefinitions } from "./src/tools/index";
import { writeFile, unlink } from "fs/promises";

async function testAnthropicClientInitialization() {
  console.log("\n1. Testing Anthropic client initialization...");
  try {
    const provider = new AnthropicProvider();
    console.log("   ✓ Anthropic client initialized successfully");
    console.log("   Provider name:", provider.name);
    return true;
  } catch (error: any) {
    console.error("   ✗ Failed:", error.message);
    return false;
  }
}

async function testReadFileToolWithValidFile() {
  console.log("\n2. Testing ReadFileTool with valid file...");
  const tool = new ReadFileTool();
  const testFilePath = "/tmp/test-read-file.txt";
  const testContent = "Hello from Phase 4 test!";

  try {
    // Create a test file
    await writeFile(testFilePath, testContent);

    // Try to read it
    const result = await tool.execute(
      { path: "test-read-file.txt" },
      { workingDir: "/tmp" }
    );

    if (result === testContent) {
      console.log("   ✓ Successfully read file contents");
      console.log("   Content:", result.substring(0, 50));
    } else {
      console.error("   ✗ Content mismatch");
      return false;
    }

    // Cleanup
    await unlink(testFilePath);
    return true;
  } catch (error: any) {
    console.error("   ✗ Failed:", error.message);
    return false;
  }
}

async function testReadFileToolNonExistentFile() {
  console.log("\n3. Testing ReadFileTool with non-existent file...");
  const tool = new ReadFileTool();

  try {
    await tool.execute(
      { path: "this-file-does-not-exist.txt" },
      { workingDir: "/tmp" }
    );
    console.error("   ✗ Should have thrown an error for non-existent file");
    return false;
  } catch (error: any) {
    if (error.message.includes("File not found")) {
      console.log("   ✓ Correctly throws error for non-existent file");
      console.log("   Error:", error.message);
      return true;
    } else {
      console.error("   ✗ Wrong error type:", error.message);
      return false;
    }
  }
}

async function testReadFileToolSecurityRestrictions() {
  console.log("\n4. Testing ReadFileTool security restrictions...");
  const tool = new ReadFileTool();

  try {
    await tool.execute(
      { path: "../../etc/passwd" },
      { workingDir: "/tmp/test" }
    );
    console.error("   ✗ Should have blocked access outside working directory");
    return false;
  } catch (error: any) {
    if (error.message.includes("Access denied") || error.message.includes("outside working directory")) {
      console.log("   ✓ Correctly blocks access outside working directory");
      console.log("   Error:", error.message);
      return true;
    } else {
      console.error("   ✗ Wrong error type:", error.message);
      return false;
    }
  }
}

async function testToolDefinitionsFormat() {
  console.log("\n5. Testing tool definitions format...");
  try {
    const definitions = getToolDefinitions();

    console.log("   Tool definitions:");
    definitions.forEach((def) => {
      console.log("   - name:", def.name);
      console.log("     description:", def.description);
      console.log("     has input_schema:", !!def.input_schema);
    });

    // Verify structure
    const hasValidStructure = definitions.every(
      (def) =>
        typeof def.name === "string" &&
        typeof def.description === "string" &&
        def.input_schema !== undefined
    );

    if (hasValidStructure) {
      console.log("   ✓ Tool definitions have correct format");
      return true;
    } else {
      console.error("   ✗ Tool definitions have invalid structure");
      return false;
    }
  } catch (error: any) {
    console.error("   ✗ Failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Phase 4 Verification Tests");
  console.log("=".repeat(60));

  const results = [
    await testAnthropicClientInitialization(),
    await testReadFileToolWithValidFile(),
    await testReadFileToolNonExistentFile(),
    await testReadFileToolSecurityRestrictions(),
    await testToolDefinitionsFormat(),
  ];

  console.log("\n" + "=".repeat(60));
  console.log("Results:");
  console.log("=".repeat(60));
  const passed = results.filter(Boolean).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);

  if (passed === total) {
    console.log("✓ All tests passed!");
    process.exit(0);
  } else {
    console.log("✗ Some tests failed");
    process.exit(1);
  }
}

main();
