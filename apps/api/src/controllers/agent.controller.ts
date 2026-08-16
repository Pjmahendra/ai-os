import { Response } from "express";
import { AIPlanner } from "@ai-os/ai-planner";
import type { ConversationTurn } from "@ai-os/ai-planner";

import {
  executePlan,
  toolRegistry
} from "../agents/executor.agent.js";
import { formatAgentResponse } from "../agents/response-formatter.js";

import { AuthRequest } from "../middleware/auth.middleware.js";
import { getUserAutomations } from "../services/automation.service.js";
import {
  addMessage,
  getOrCreateConversation,
  getRecentMessages
} from "../services/conversation.service.js";
import { searchMemories } from "../services/memory.service.js";

const aiPlanner = new AIPlanner();

export async function runAgent(
  req: AuthRequest,
  res: Response
) {
  try {
    const { message, conversationId } = req.body;
    const userId = req.userId;

    if (
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "message is required"
      });
    }

    if (
      conversationId !== undefined &&
      typeof conversationId !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "conversationId must be a string"
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized"
      });
    }

    let conversation;

    try {
      conversation = await getOrCreateConversation(
        userId,
        conversationId
      );
    } catch (error) {
      return res.status(404).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Conversation not found"
      });
    }

    // History is fetched before this turn's user message is stored,
    // so it only ever contains prior turns.
    const priorMessages = await getRecentMessages(
      conversation.id
    );

    const history: ConversationTurn[] = priorMessages.map(
      (item) => ({
        role: item.role === "user" ? "user" : "assistant",
        content: item.content
      })
    );

    await addMessage(
      conversation.id,
      "user",
      message
    );

    const automations = await getUserAutomations(userId);

    const automationContext = automations.map(
      (automation) =>
        `[automation] name="${automation.name}", enabled=${automation.enabled}, workflow="${automation.workflow}"`
    );

    // Long-term memories relevant to this message. Keyword search
    // against the raw message rarely matches (memories are short
    // facts, not full sentences), so fall back to the most recent
    // memories whenever the keyword search comes up empty — the
    // planner needs to see existing memories/ids to reference them
    // for memory.update or memory.delete, not just on an exact hit.
    const keywordMatches = await searchMemories(
      userId,
      message
    );

    const memories =
      keywordMatches.length > 0
        ? keywordMatches
        : await searchMemories(userId);

    const memoryContext = memories.map(
      (memory) =>
        `[memory] id="${memory.id}", content="${memory.content}"` +
        (memory.summary
          ? `, summary="${memory.summary}"`
          : "")
    );

    const plan =
      await aiPlanner.createPlan(
        message,
        toolRegistry.list(),
        [...automationContext, ...memoryContext],
        history
      );

    const execution =
      await executePlan(
        plan,
        userId
      );

    const responseMessage = formatAgentResponse(
      plan,
      execution
    );

    await addMessage(
      conversation.id,
      "assistant",
      responseMessage,
      plan,
      execution
    );

    return res.json({
      success: true,
      conversationId: conversation.id,
      message: responseMessage,
      plan,
      execution
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Agent execution failed"
    });
  }
}
