import { prisma } from "../database/prisma.js";

const MAX_HISTORY_MESSAGES = 20;

export async function createConversation(
  userId: string,
  title?: string
) {
  return prisma.conversation.create({
    data: {
      userId,
      title
    }
  });
}

export async function getConversation(
  userId: string,
  conversationId: string
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId
    }
  });
}

export async function listConversations(
  userId: string
) {
  return prisma.conversation.findMany({
    where: {
      userId
    },
    orderBy: {
      updatedAt: "desc"
    }
  });
}

/**
 * Finds an existing conversation owned by the user, or creates a new
 * one. Used by the agent endpoint so a conversationId is optional on
 * the first message of a new conversation.
 */
export async function getOrCreateConversation(
  userId: string,
  conversationId?: string
) {
  if (conversationId) {
    const existing = await getConversation(
      userId,
      conversationId
    );

    if (!existing) {
      throw new Error("Conversation not found");
    }

    return existing;
  }

  return createConversation(userId);
}

export async function getConversationMessages(
  userId: string,
  conversationId: string
) {
  const conversation = await getConversation(
    userId,
    conversationId
  );

  if (!conversation) {
    return null;
  }

  return prisma.message.findMany({
    where: {
      conversationId
    },
    orderBy: {
      createdAt: "asc"
    }
  });
}

/**
 * Recent messages for a conversation, oldest first, capped so the
 * planner prompt does not grow unbounded as a conversation gets long.
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = MAX_HISTORY_MESSAGES
) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });

  return messages.reverse();
}

export async function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  plan?: unknown,
  execution?: unknown
) {
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        plan: plan as object | undefined,
        execution: execution as object | undefined
      }
    }),
    prisma.conversation.update({
      where: {
        id: conversationId
      },
      data: {
        updatedAt: new Date()
      }
    })
  ]);

  return message;
}
