import { SYSTEM_PROMPT } from "./system.prompt.js";

export function buildPrompt(
  memory: string[],
  userMessage: string
) {
  return [
    {
      role: "system" as const,
      content: SYSTEM_PROMPT
    },
    {
      role: "system" as const,
      content: `Memory:\n${memory.join("\n")}`
    },
    {
      role: "user" as const,
      content: userMessage
    }
  ];
}
