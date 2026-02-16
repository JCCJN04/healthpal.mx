// @ts-nocheck
import { supabase } from '../supabase'
import type { Database } from '../../types/database'

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
    console.log('[ChatQuery] listMyConversations started for:', userId)

    // 1. Get all conversation IDs where user is a participant
    const { data: participations, error: pError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId)

    if (pError) {
        console.error('[ChatQuery] Failed to fetch participations:', pError)
        throw new Error(`DB Part: ${pError.message} (${pError.hint || ''})`)
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
        console.error('[ChatQuery] Failed to fetch conversations details:', error)
        throw new Error(`DB Main: ${error.message} (${error.hint || ''})`)
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

        if (countError) console.warn('[ChatQuery] Error counting unread for', conv.id, countError)

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
        console.error('[ChatQuery] Error in getUnreadTotal:', err)
        return 0
    }
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<string | null> {
    try {
        console.log('[ChatQuery] getOrCreateConversation check:', { userId, otherUserId })

        // 1. Check if a conversation already exists
        const { data: existing, error: eError } = await supabase
            .rpc('get_conversation_between_users', {
                user_a: userId,
                user_b: otherUserId
            })

        if (!eError && existing && existing.length > 0) {
            return existing[0].id
        }

        // 2. Start a new conversation via RPC
        const { data: newId, error: startError } = await supabase
            .rpc('start_new_conversation', {
                other_user_id: otherUserId
            })

        if (startError) throw startError
        return newId
    } catch (err) {
        console.error('[ChatQuery] Error in getOrCreateConversation:', err)
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
        console.error('Error in listMessages:', err)
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
        console.error('Error in sendMessage:', err)
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
        console.error('Error in markConversationRead:', err)
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
        console.error('Error in updateUserStatus:', err)
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
        console.error('Error in getUserStatuses:', err)
        return []
    }
}
