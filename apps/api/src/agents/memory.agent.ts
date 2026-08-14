import { prisma } from "@ai-os/database";

export async function saveMemory(
  userId: string,
  content: string
) {
  return prisma.memory.create({
    data: {
      userId,
      content
    }
  });
}

export async function getMemories(
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