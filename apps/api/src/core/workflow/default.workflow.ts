import { WorkflowEngine } from "./engine.js";
import { retrieveMemory } from "../memory/retriever.js";
import { eventBus } from "../events/bus.js";
import { EVENTS } from "../events/events.js";

export const workflow = new WorkflowEngine();

workflow.register({
  name: "memory",

  async execute(context) {
    await retrieveMemory(context.userId);

    eventBus.publish({
      type: EVENTS.MEMORY_SAVED,
      timestamp: new Date(),
      payload: context
    });
  }
});