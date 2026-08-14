import { buildPrompt } from "../prompts/prompt.builder.js";
import { retrieveMemory } from "../memory/retriever.js";
import { AIRuntime } from "@ai-os/ai-runtime";
import { eventBus } from "../events/bus.js";
import { EVENTS } from "../events/events.js";
import { workflow } from "../workflow/default.workflow.js";
const runtime = new AIRuntime();

export async function runAgent(
  userId: string,
  message: string
) {
  eventBus.publish({
    type: EVENTS.USER_MESSAGE,
    timestamp: new Date(),
    payload: {
      userId,
      message
    }
  });

  await workflow.run({
    userId,
    message
  });

  const memory = await retrieveMemory(userId);

  const prompt = buildPrompt(
    memory,
    message
  );

  const response = await runtime.run({
    message,
    conversation: prompt
  });

  const reply = response.content;

  eventBus.publish({
    type: EVENTS.RESPONSE_GENERATED,
    timestamp: new Date(),
    payload: {
      userId,
      reply
    }
  });

  return reply;
}