// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { updateUserStatus, getUserStatuses } from '@/shared/lib/queries/chat'

/**
 * Hook to track current user presence and status
 */
export function usePresence(userId: string | undefined) {
    useEffect(() => {
        if (!userId) return

        // 1. Initial status update
        updateUserStatus(userId)

        // 2. Setup GLOBAL presence channel
        const channel = supabase.channel('global_presence', {
            config: {
                presence: {
                    key: userId,
                },
            },
        })

        channel
            .on('presence', { event: 'sync' }, () => {
                // Global presence synced
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                    })
                }
            })

        // 3. Heartbeat (keeps last_seen updated in DB)
        const interval = setInterval(() => {
            updateUserStatus(userId)
        }, 60000) // Every 60s is enough for HTTP fallback

        return () => {
            clearInterval(interval)
            supabase.removeChannel(channel)
        }
    }, [userId])
}

/**
 * Hook to get the real-time status of a specific user
 */
export function useUserStatus(targetUserId: string | null) {
    const [isOnline, setIsOnline] = useState(false)
    const [lastSeen, setLastSeen] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!targetUserId) {
            setLoading(false)
            return
        }

        setLoading(true)
        let mounted = true

        // 1. Fetch initial status from DB
        const fetchInitialStatus = async () => {
            try {
                const statuses = await getUserStatuses([targetUserId])
                if (!mounted) return
                if (statuses.length > 0) {
                    setLastSeen(statuses[0].last_seen_at)
                }
                setLoading(false)
            } catch (err) {
                console.error('Error fetching initial status:', err)
                if (mounted) setLoading(false)
            }
        }
        fetchInitialStatus()

        // 2. Subscribe to GLOBAL Presence to see if target is there
        const channel = supabase.channel('global_presence')

        channel
            .on('presence', { event: 'sync' }, () => {
                if (!mounted) return
                const state = channel.presenceState()
                // Check if targetUserId is present anywhere in the state keys
                const online = Object.keys(state).includes(targetUserId)
                setIsOnline(online)
                if (online) {
                    setLastSeen(new Date().toISOString())
                }
            })
            .subscribe()

        // 3. Subscribe to DB changes for last_seen fallback
        const dbChannel = supabase
            .channel(`user_status_watch_${targetUserId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_status',
                    filter: `user_id=eq.${targetUserId}`
                },
                (payload) => {
                    if (mounted) {
                        setLastSeen(payload.new.last_seen_at)
                    }
                }
            )
            .subscribe()

        return () => {
            mounted = false
            supabase.removeChannel(channel)
            supabase.removeChannel(dbChannel)
        }
    }, [targetUserId])

    return { isOnline, lastSeen, loading }
}

/**
 * Hook to get status for a list of users (batch)
 */
export function useBatchUserStatus(userIds: string[]) {
    const [statuses, setStatuses] = useState<Record<string, { isOnline: boolean, lastSeen: string | null }>>({})
    const userIdsStr = JSON.stringify(userIds)

    useEffect(() => {
        if (userIds.length === 0) return
        let mounted = true

        // 1. Initial Load from DB
        const fetchStatuses = async () => {
            try {
                const data = await getUserStatuses(userIds)
                if (!mounted) return

                const newStatuses: Record<string, any> = {}
                data.forEach(s => {
                    newStatuses[s.user_id] = { isOnline: false, lastSeen: s.last_seen_at }
                })
                setStatuses(newStatuses)
            } catch (err) {
                console.error('Error fetching batch statuses:', err)
            }
        }
        fetchStatuses()

        // 2. Real-time Presence (Global)
        const channel = supabase.channel('global_presence')
        channel
            .on('presence', { event: 'sync' }, () => {
                if (!mounted) return
                const state = channel.presenceState()
                const onlineIds = Object.keys(state)

                setStatuses(prev => {
                    const next = { ...prev }
                    userIds.forEach(id => {
                        const isNowOnline = onlineIds.includes(id)
                        next[id] = {
                            ...next[id],
                            isOnline: isNowOnline,
                            // If online, use current time as last seen fallback
                            lastSeen: isNowOnline ? new Date().toISOString() : (next[id]?.lastSeen || null)
                        }
                    })
                    return next
                })
            })
            .subscribe()

        // 3. DB Updates
        const dbChannel = supabase
            .channel('batch_status_db')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_status'
                },
                (payload) => {
                    if (mounted && userIds.includes(payload.new.user_id)) {
                        setStatuses(prev => ({
                            ...prev,
                            [payload.new.user_id]: {
                                ...prev[payload.new.user_id],
                                lastSeen: payload.new.last_seen_at
                            }
                        }))
                    }
                }
            )
            .subscribe()

        return () => {
            mounted = false
            supabase.removeChannel(channel)
            supabase.removeChannel(dbChannel)
        }
    }, [userIdsStr])

    return statuses
}
