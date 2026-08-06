import { buildPrompt } from "../prompts/prompt.builder.js";
import { retrieveMemory } from "../memory/retriever.js";
import { llm } from "../llm/index.js";
import { eventBus } from "../events/bus.js";
import { EVENTS } from "../events/events.js";
import { workflow } from "../workflow/default.workflow.js";

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

  const reply = await llm.chat(prompt);

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