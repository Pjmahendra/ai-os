import { prisma } from "../database/prisma.js";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body?: string,
  data?: unknown
) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data as object | undefined
    }
  });
}

export async function listNotifications(
  userId: string,
  options: {
    unreadOnly?: boolean;
    limit?: number;
  } = {}
) {
  return prisma.notification.findMany({
    where: {
      userId,

      ...(options.unreadOnly
        ? { readAt: null }
        : {})
    },
    orderBy: {
      createdAt: "desc"
    },
    take: options.limit ?? 50
  });
}

export async function getUnreadCount(
  userId: string
) {
  return prisma.notification.count({
    where: {
      userId,
      readAt: null
    }
  });
}

export async function markRead(
  userId: string,
  notificationId: string
) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId
    },
    data: {
      readAt: new Date()
    }
  });
}

export async function markAllRead(
  userId: string
) {
  return prisma.notification.updateMany({
    where: {
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });
}
