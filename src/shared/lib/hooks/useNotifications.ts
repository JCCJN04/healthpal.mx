import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getUnreadNotifications } from '@/shared/lib/queries/notifications'
import type { Database } from '@/shared/types/database'

type Notification = Database['public']['Tables']['notifications']['Row']

export const notificationKeys = {
  unread: (userId: string) => ['notifications', userId, 'unread'] as const,
}

/**
 * Fetches unread notifications (capped at 10).
 * Poll every 60 s to catch new notifications without hammering the DB.
 */
export function useUnreadNotifications(userId: string | undefined) {
  return useQuery<Notification[]>({
    queryKey: notificationKeys.unread(userId ?? ''),
    queryFn: () => getUnreadNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 60_000, // 60 s polling
    staleTime: 30_000,       // treat as fresh for 30 s
  })
}

/**
 * Manually invalidate notification cache (call after markAsRead).
 */
export function useInvalidateNotifications() {
  const qc = useQueryClient()
  return (userId: string) => qc.invalidateQueries({ queryKey: ['notifications', userId] })
}
