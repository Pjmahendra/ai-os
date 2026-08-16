import { prisma } from "../database/prisma.js";

const DEFAULT_SEARCH_LIMIT = 10;

/**
 * Long-term memory storage. Distinct from conversation history
 * (see conversation.service.ts), which is short-term/working memory
 * scoped to a single thread and capped in size. Memories persist
 * across conversations until explicitly updated or deleted.
 */
export async function createMemory(
  userId: string,
  content: string,
  summary?: string
) {
  return prisma.memory.create({
    data: {
      userId,
      content,
      summary
    }
  });
}

export async function getMemory(
  userId: string,
  memoryId: string
) {
  return prisma.memory.findFirst({
    where: {
      id: memoryId,
      userId
    }
  });
}

export async function listMemories(
  userId: string
) {
  return prisma.memory.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    }
  });
}

/**
 * Case-insensitive keyword search over content/summary. With no query,
 * returns the most recent memories (acts as a bounded "list").
 */
export async function searchMemories(
  userId: string,
  query?: string,
  limit: number = DEFAULT_SEARCH_LIMIT
) {
  const trimmed = query?.trim();

  return prisma.memory.findMany({
    where: {
      userId,
      ...(trimmed
        ? {
            OR: [
              {
                content: {
                  contains: trimmed,
                  mode: "insensitive"
                }
              },
              {
                summary: {
                  contains: trimmed,
                  mode: "insensitive"
                }
              }
            ]
          }
        : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    take: limit
  });
}

export async function updateMemory(
  userId: string,
  memoryId: string,
  data: {
    content?: string;
    summary?: string;
  }
) {
  const existing = await getMemory(
    userId,
    memoryId
  );

  if (!existing) {
    throw new Error("Memory not found");
  }

  return prisma.memory.update({
    where: {
      id: existing.id
    },
    data: {
      ...(data.content !== undefined
        ? { content: data.content }
        : {}),

      ...(data.summary !== undefined
        ? { summary: data.summary }
        : {})
    }
  });
}

export async function deleteMemory(
  userId: string,
  memoryId: string
) {
  const result = await prisma.memory.deleteMany({
    where: {
      id: memoryId,
      userId
    }
  });

  if (result.count === 0) {
    throw new Error("Memory not found");
  }

  return result;
}
