export type SSEEvent =
  | { type: "message.start"; messageId: string }
  | { type: "message.delta"; text: string }
  | { type: "tool.start"; toolName: string; toolId: string; input: any }
  | { type: "tool.result"; toolId: string; result: string }
  | { type: "message.done"; messageId: string };

export function formatSSE(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
