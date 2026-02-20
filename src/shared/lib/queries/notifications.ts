// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

export async function createNotification(payload: NotificationInsert): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert(payload)

    if (error) {
      logger.error('createNotification', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger.error('createNotification', err)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Get unread notifications for user
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      logger.error('getUnreadNotifications', error)
      return []
    }

    return data || []
  } catch (err) {
    logger.error('getUnreadNotifications', err)
    return []
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      logger.error('Error marking notification as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger.error('Error in markNotificationAsRead:', err)
    return { success: false, error: 'Error inesperado' }
  }
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    if (error) {
      logger.error('Error marking all notifications as read:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger.error('Error in markAllNotificationsAsRead:', err)
    return { success: false, error: 'Error inesperado' }
  }
}
