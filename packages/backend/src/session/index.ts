import { db } from "../db/index";
import { sessions, messages, messageParts } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import { getToolDefinitions, executeTool } from "../tools/index";
import { ProviderMessage, Provider } from "../providers/base";
import { SSEEvent } from "../streaming/index";

export class SessionManager {
  private provider: Provider;

  constructor(provider: Provider) {
    this.provider = provider;
  }

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

    let currentAssistantMessage = assistantMessage;
    let partOrder = 0;
    const toolDefinitions = getToolDefinitions();
    let accumulatedText = "";
    type MessageContent =
      | { type: "text"; text: string }
      | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
    let currentMessageContent: MessageContent[] = []; // Track all content blocks in current message

    // Helper function to save accumulated text
    const saveAccumulatedText = async () => {
      if (accumulatedText) {
        await db.insert(messageParts).values({
          messageId: currentAssistantMessage.id,
          type: "text",
          content: { text: accumulatedText },
          order: partOrder++,
        });
        // Add to current message content for history
        currentMessageContent.push({ type: "text", text: accumulatedText });
        accumulatedText = "";
      }
    };

    yield { type: "message.start", messageId: currentAssistantMessage.id };

    // Main loop - continues until AI stops calling tools
    let continueStreaming = true;
    while (continueStreaming) {
      continueStreaming = false; // Will be set to true if a tool is called

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

          // Add to current message content for history
          currentMessageContent.push({ type: "tool_use", id, name, input });

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

            // Continue conversation with tool result - include ALL content from assistant message
            history.push({
              role: "assistant",
              content: currentMessageContent,
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
            currentMessageContent = []; // Reset content for new message
            accumulatedText = "";

            // Notify frontend that a new assistant message is starting
            yield { type: "message.start", messageId: nextAssistantMessage.id };

            // Continue streaming with updated history
            continueStreaming = true;
            break; // Break inner loop to restart with while loop
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

            // Update history with error result
            history.push({
              role: "assistant",
              content: currentMessageContent,
            });
            history.push({
              role: "user",
              content: [
                { type: "tool_result", tool_use_id: id, content: errorMsg, is_error: true },
              ],
            });

            // Create a NEW assistant message for the response after error
            const [nextAssistantMessage] = await db
              .insert(messages)
              .values({ sessionId, role: "assistant" })
              .returning();

            if (!nextAssistantMessage) {
              throw new Error("Failed to create next assistant message");
            }

            currentAssistantMessage = nextAssistantMessage;
            partOrder = 0;
            currentMessageContent = [];
            accumulatedText = "";

            // Notify frontend that a new assistant message is starting
            yield { type: "message.start", messageId: nextAssistantMessage.id };

            // Continue streaming after error
            continueStreaming = true;
            break; // Break inner loop to restart with while loop
          }
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

    yield { type: "message.done", messageId: currentAssistantMessage.id };
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
