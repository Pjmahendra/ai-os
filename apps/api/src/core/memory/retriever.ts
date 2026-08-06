import { prisma } from "../../database/prisma.js";

export async function retrieveMemory(
  userId: string
) {
  const memories = await prisma.memory.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });

  return memories.map((m) => m.content);
}
