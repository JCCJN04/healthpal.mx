// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'

type Conversation = Database['public']['Tables']['conversations']['Row']
type Participant = Database['public']['Tables']['conversation_participants']['Row']
type Message = Database['public']['Tables']['messages']['Row']

export interface ConversationWithDetails extends Conversation {
    other_participant: {
        id: string
        full_name: string | null
        avatar_url: string | null
        email?: string | null
        role: string | null
    } | null
    unread_count: number
}

/**
 * List all conversations for the current user
 */
export async function listMyConversations(userId: string): Promise<ConversationWithDetails[]> {
    logger.debug('listMyConversations started')

    // 1. Get all conversation IDs where user is a participant
    const { data: participations, error: pError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)

    if (pError) {
        logger.error('listMyConversations.participations', pError)
        throw new Error('Error al cargar las conversaciones')
    }

    if (!participations || participations.length === 0) return []
    const conversationIds = participations.map(p => p.conversation_id)

    // 2. Fetch conversations, participants, and unread counts
    const { data, error } = await supabase
        .from('conversations')
        .select(`
            id,
            created_at,
            last_message_at,
            last_message_text,
            participants:conversation_participants (
                user_id,
                last_read_at,
                profile:profiles (
                    id,
                    full_name,
                    avatar_url,
                    role,
                    email
                )
            )
        `)
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false })

    if (error) {
        logger.error('listMyConversations.details', error)
        throw new Error('Error al cargar las conversaciones')
    }

    // 3. For each conversation, fetch unread count (Count messages where created_at > my last_read_at)
    // We do this in a loop or with a clever join, but for simplicity/robustness in MVP:
    const conversationsWithUnread = await Promise.all((data || []).map(async (conv) => {
        const participants = conv.participants || []
        const myPart = participants.find((p: any) => p.user_id === userId)
        const otherPart = participants.find((p: any) => p.user_id !== userId)

        const { count, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', userId)
            .gt('created_at', myPart?.last_read_at || '1970-01-01')

        if (countError) logger.warn('Error counting unread messages')

        return {
            ...conv,
            other_participant: otherPart?.profile || null,
            unread_count: count || 0
        } as ConversationWithDetails
    }))

    return conversationsWithUnread
}

/**
 * Get total unread messages across all conversations
 */
export async function getUnreadTotal(userId: string): Promise<number> {
    try {
        const { data, error } = await supabase.rpc('get_unread_total', { p_user_id: userId })
        if (error) throw error
        return Number(data || 0)
    } catch (err) {
        logger.error('getUnreadTotal', err)
        return 0
    }
}

/**
 * Get or create a conversation between two users.
 * First tries RPC functions, then falls back to direct table operations
 * in case the RPC functions don't exist on this Supabase project.
 */
export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<string | null> {
    try {
        logger.debug('getOrCreateConversation', { userId, otherUserId })

        // --- Strategy 1: Try RPC functions ---
        try {
            const { data: existing, error: eError } = await supabase
                .rpc('get_conversation_between_users', {
                    user_a: userId,
                    user_b: otherUserId
                })

            if (!eError && existing && existing.length > 0) {
                logger.debug('getOrCreateConversation: found via RPC', existing[0].id)
                return existing[0].id
            }

            if (!eError || (eError && !eError.message?.includes('function') && !eError.message?.includes('does not exist'))) {
                // RPC worked but no results — try to start a new conversation
                const { data: newId, error: startError } = await supabase
                    .rpc('start_new_conversation', {
                        other_user_id: otherUserId
                    })

                if (!startError && newId) {
                    logger.debug('getOrCreateConversation: created via RPC', newId)
                    return newId
                }

                if (startError) {
                    logger.warn('getOrCreateConversation: start_new_conversation RPC failed', startError.message)
                }
            } else {
                logger.warn('getOrCreateConversation: RPC not available', eError?.message)
            }
        } catch (rpcErr) {
            logger.warn('getOrCreateConversation: RPC approach failed, trying direct tables', rpcErr)
        }

        // --- Strategy 2: Direct table operations fallback ---
        logger.debug('getOrCreateConversation: using direct table fallback')

        // 2a. Search for existing conversation between the two users
        const { data: myParticipations } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId)

        if (myParticipations && myParticipations.length > 0) {
            const myConvIds = myParticipations.map(p => p.conversation_id)

            const { data: otherParticipations } = await supabase
                .from('conversation_participants')
                .select('conversation_id')
                .eq('user_id', otherUserId)
                .in('conversation_id', myConvIds)

            if (otherParticipations && otherParticipations.length > 0) {
                logger.debug('getOrCreateConversation: found existing via direct query', otherParticipations[0].conversation_id)
                return otherParticipations[0].conversation_id
            }
        }

        // 2b. Create new conversation
        const { data: newConv, error: convInsertErr } = await supabase
            .from('conversations')
            .insert({
                created_at: new Date().toISOString(),
                last_message_at: new Date().toISOString(),
                last_message_text: null,
            })
            .select('id')
            .single()

        if (convInsertErr || !newConv) {
            logger.error('getOrCreateConversation: failed to create conversation', convInsertErr)
            throw convInsertErr || new Error('Failed to create conversation')
        }

        // 2c. Add both participants
        const { error: partErr } = await supabase
            .from('conversation_participants')
            .insert([
                { conversation_id: newConv.id, user_id: userId, last_read_at: new Date().toISOString() },
                { conversation_id: newConv.id, user_id: otherUserId, last_read_at: new Date().toISOString() },
            ])

        if (partErr) {
            logger.error('getOrCreateConversation: failed to add participants', partErr)
            throw partErr
        }

        logger.debug('getOrCreateConversation: created via direct tables', newConv.id)
        return newConv.id
    } catch (err) {
        logger.error('getOrCreateConversation', err)
        return null
    }
}

/**
 * List messages for a specific conversation
 */
export async function listMessages(conversationId: string, options: { limit?: number, before?: string } = {}) {
    try {
        let query = supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(options.limit || 50)

        if (options.before) {
            query = query.lt('created_at', options.before)
        }

        const { data, error } = await query
        if (error) throw error
        return (data || []).reverse()
    } catch (err) {
        logger.error('listMessages', err)
        return []
    }
}

/**
 * Send a message
 */
export async function sendMessage(conversationId: string, senderId: string, body: string) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                body: body
            })
            .select()
            .single()

        if (error) throw error
        return { success: true, data }
    } catch (err) {
        logger.error('sendMessage', err)
        return { success: false, error: err }
    }
}

/**
 * Mark a conversation as read
 */
export async function markConversationRead(conversationId: string, userId: string) {
    try {
        const { error } = await supabase.rpc('mark_conversation_read', {
            p_conversation_id: conversationId,
            p_user_id: userId
        })
        if (error) throw error
        return { success: true }
    } catch (err) {
        logger.error('markConversationRead', err)
        return { success: false }
    }
}
export async function updateUserStatus(userId: string) {
    try {
        // 1. Update user_status table
        const { error: statusError } = await supabase
            .from('user_status')
            .upsert({
                user_id: userId,
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (statusError) throw statusError

        // 2. Update profiles table
        await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', userId)

        return { success: true }
    } catch (err) {
        logger.error('updateUserStatus', err)
        return { success: false }
    }
}

/**
 * Fetch the status of multiple users
 */
export async function getUserStatuses(userIds: string[]) {
    try {
        const { data, error } = await supabase
            .from('user_status')
            .select('user_id, last_seen_at')
            .in('user_id', userIds)

        if (error) throw error
        return data || []
    } catch (err) {
        logger.error('getUserStatuses', err)
        return []
    }
}
