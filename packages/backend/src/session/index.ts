import { db } from "../db/index";
import { sessions, messages, messageParts } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import { AnthropicProvider } from "../providers/anthropic";
import { getToolDefinitions, executeTool } from "../tools/index";
import { ProviderMessage } from "../providers/base";
import { SSEEvent } from "../streaming/index";

export class SessionManager {
  private provider = new AnthropicProvider();

  async *processMessage(
    sessionId: string,
    userContent: string,
    workingDir: string
  ): AsyncGenerator<SSEEvent> {
    // Store user message
    const [userMessage] = await db
      .insert(messages)
      .values({ sessionId, role: "user" })
      .returning();

    if (!userMessage) {
      throw new Error("Failed to create user message");
    }

    await db.insert(messageParts).values({
      messageId: userMessage.id,
      type: "text",
      content: { text: userContent },
      order: 0,
    });

    // Load conversation history
    const history = await this.loadHistory(sessionId);

    // Add current user message
    history.push({
      role: "user",
      content: [{ type: "text", text: userContent }],
    });

    // Create assistant message
    const [assistantMessage] = await db
      .insert(messages)
      .values({ sessionId, role: "assistant" })
      .returning();

    if (!assistantMessage) {
      throw new Error("Failed to create assistant message");
    }

    yield { type: "message.start", messageId: assistantMessage.id };

    let currentAssistantMessage = assistantMessage;
    let partOrder = 0;
    const toolDefinitions = getToolDefinitions();
    let accumulatedText = "";

    // Helper function to save accumulated text
    const saveAccumulatedText = async () => {
      if (accumulatedText) {
        await db.insert(messageParts).values({
          messageId: currentAssistantMessage.id,
          type: "text",
          content: { text: accumulatedText },
          order: partOrder++,
        });
        accumulatedText = "";
      }
    };

    // Stream AI response
    for await (const event of this.provider.stream(history, toolDefinitions)) {
      if (event.type === "text" && event.text) {
        accumulatedText += event.text;
        yield { type: "message.delta", text: event.text };
      } else if (event.type === "tool_use" && event.toolUse) {
        // Save any accumulated text before tool use
        await saveAccumulatedText();

        const { id, name, input } = event.toolUse;

        yield { type: "tool.start", toolName: name, toolId: id, input };

        // Store tool use in current assistant message
        await db.insert(messageParts).values({
          messageId: currentAssistantMessage.id,
          type: "tool_use",
          content: { id, name, input },
          order: partOrder++,
        });

        // Execute tool
        try {
          const result = await executeTool(name, input, { workingDir });

          yield { type: "tool.result", toolId: id, result };

          // Create a user message for the tool result
          const [toolResultMessage] = await db
            .insert(messages)
            .values({ sessionId, role: "user" })
            .returning();

          if (!toolResultMessage) {
            throw new Error("Failed to create tool result message");
          }

          // Store tool result in the user message
          await db.insert(messageParts).values({
            messageId: toolResultMessage.id,
            type: "tool_result",
            content: { tool_use_id: id, content: result },
            order: 0,
          });

          // Continue conversation with tool result
          history.push({
            role: "assistant",
            content: [{ type: "tool_use", id, name, input }],
          });
          history.push({
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: id, content: result },
            ],
          });

          // Create a NEW assistant message for the response after tool execution
          const [nextAssistantMessage] = await db
            .insert(messages)
            .values({ sessionId, role: "assistant" })
            .returning();

          if (!nextAssistantMessage) {
            throw new Error("Failed to create next assistant message");
          }

          currentAssistantMessage = nextAssistantMessage;
          partOrder = 0;

          // Get next response from AI
          for await (const nextEvent of this.provider.stream(
            history,
            toolDefinitions
          )) {
            if (nextEvent.type === "text" && nextEvent.text) {
              accumulatedText += nextEvent.text;
              yield { type: "message.delta", text: nextEvent.text };
            } else if (nextEvent.type === "tool_use" && nextEvent.toolUse) {
              // Handle nested tool use - save text, store tool use, reset for next iteration
              await saveAccumulatedText();

              const nestedToolUse = nextEvent.toolUse;
              yield { type: "tool.start", toolName: nestedToolUse.name, toolId: nestedToolUse.id, input: nestedToolUse.input };

              await db.insert(messageParts).values({
                messageId: currentAssistantMessage.id,
                type: "tool_use",
                content: { id: nestedToolUse.id, name: nestedToolUse.name, input: nestedToolUse.input },
                order: partOrder++,
              });

              // This will be handled in the next iteration
              // For now, we'll break and let the outer loop handle it
              break;
            }
          }
        } catch (error: any) {
          console.error("Tool execution error:", error);
          const errorMsg = `Tool execution failed: ${error.message}`;
          yield { type: "tool.result", toolId: id, result: errorMsg };

          // Create a user message for the error result
          const [toolResultMessage] = await db
            .insert(messages)
            .values({ sessionId, role: "user" })
            .returning();

          if (!toolResultMessage) {
            throw new Error("Failed to create tool result message");
          }

          await db.insert(messageParts).values({
            messageId: toolResultMessage.id,
            type: "tool_result",
            content: { tool_use_id: id, content: errorMsg, is_error: true },
            order: 0,
          });
        }
      }
    }

    // Save any remaining accumulated text
    await saveAccumulatedText();

    // Update session timestamp
    await db
      .update(sessions)
      .set({ updatedAt: new Date() })
      .where(eq(sessions.id, sessionId));

    yield { type: "message.done", messageId: assistantMessage.id };
  }

  private async loadHistory(sessionId: string): Promise<ProviderMessage[]> {
    const sessionMessages = await db.query.messages.findMany({
      where: eq(messages.sessionId, sessionId),
      with: {
        parts: {
          orderBy: [asc(messageParts.order)],
        },
      },
      orderBy: [asc(messages.createdAt)],
    });

    return sessionMessages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.parts.map((part: any) => {
        const content = part.content as any;

        // Reconstruct the proper format based on part type
        if (part.type === "text") {
          return {
            type: "text" as const,
            text: content.text,
          };
        } else if (part.type === "tool_use") {
          return {
            type: "tool_use" as const,
            id: content.id,
            name: content.name,
            input: content.input,
          };
        } else if (part.type === "tool_result") {
          return {
            type: "tool_result" as const,
            tool_use_id: content.tool_use_id,
            content: content.content,
          };
        }

        // Fallback (shouldn't happen)
        return content;
      }),
    }));
  }
}
