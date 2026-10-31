import { db } from '@/lib/db'

// ============================================================
// Notifications Service - In-app notification system
// ============================================================

export type NotificationType =
  | 'info' | 'success' | 'warning' | 'error'
  | 'billing' | 'team' | 'linkedin' | 'ai'

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export async function createNotification(input: CreateNotificationInput) {
  return db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 200),
      message: input.message.slice(0, 1000),
      link: input.link?.slice(0, 500) || null,
    },
  })
}

// Créer une notification pour plusieurs users (ex: team)
export async function createNotificationsForUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>
) {
  const data = userIds.map(userId => ({
    userId,
    type: input.type,
    title: input.title.slice(0, 200),
    message: input.message.slice(0, 1000),
    link: input.link?.slice(0, 500) || null,
  }))
  return db.notification.createMany({ data })
}

// Récupérer les notifications d'un user
export async function getUserNotifications(userId: string, limit = 20) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// Compter les notifications non lues
export async function countUnreadNotifications(userId: string) {
  return db.notification.count({
    where: { userId, read: false },
  })
}

// Marquer comme lu
export async function markAsRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  })
}

// Marquer toutes comme lues
export async function markAllAsRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}
