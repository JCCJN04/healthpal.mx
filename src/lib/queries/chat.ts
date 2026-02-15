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

    console.log('[ChatQuery] Participations found:', participations?.length || 0)
    if (!participations || participations.length === 0) return []

    const conversationIds = participations.map(p => p.conversation_id)

    // 2. Fetch conversations and other participants
    const { data, error } = await supabase
        .from('conversations')
        .select(`
            id,
            created_at,
            last_message_at,
            last_message_text,
            participants:conversation_participants (
                user_id,
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

    if (error) {
        console.error('[ChatQuery] Failed to fetch conversations details:', error)
        throw new Error(`DB Main: ${error.message} (${error.hint || ''})`)
    }

    return (data || []).map(conv => {
        const participants = conv.participants || []
        const otherPart = participants.find((p: any) => p.user_id !== userId)
        return {
            ...conv,
            other_participant: otherPart?.profile || null,
            unread_count: 0
        } as ConversationWithDetails
    })
}

/**
 * Get or create a conversation between two users
 */
export async function getOrCreateConversation(userId: string, otherUserId: string): Promise<string | null> {
    try {
        console.log('[ChatQuery] getOrCreateConversation check:', { userId, otherUserId })

        // 1. Check if a conversation already exists between these two
        const { data: existing, error: eError } = await supabase
            .rpc('get_conversation_between_users', {
                user_a: userId,
                user_b: otherUserId
            })

        if (!eError && existing && existing.length > 0) {
            console.log('[ChatQuery] found existing:', existing[0].id)
            return existing[0].id
        }

        if (eError) {
            console.warn('[ChatQuery] get_conversation_between_users RPC failed or returned error:', eError)
            // Fallthrough to attempt creation
        }

        // 2. Start a new conversation via RPC (more robust against RLS insert hurdles)
        console.log('[ChatQuery] Starting new conversation via RPC for otherUserId:', otherUserId)
        const { data: newId, error: startError } = await supabase
            .rpc('start_new_conversation', {
                other_user_id: otherUserId
            })

        if (startError) {
            console.error('[ChatQuery] start_new_conversation RPC failed:', startError)

            // 3. Last resort: manual insert (might fail if RLS is strict)
            console.log('[ChatQuery] Attempting manual fallback creation...')
            const { data: conversation, error: cError } = await supabase
                .from('conversations')
                .insert({})
                .select()
                .single()

            if (cError) throw cError

            const { error: pError } = await supabase
                .from('conversation_participants')
                .insert([
                    { conversation_id: conversation.id, user_id: userId },
                    { conversation_id: conversation.id, user_id: otherUserId }
                ])

            if (pError) throw pError
            return conversation.id
        }

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
        return (data || []).reverse() // Show oldest first for chat window
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
        // The schema currently has no last_read_at column; keep a no-op to avoid 400s.
        // If unread tracking is added later, wire the update here.
        return { success: true }
    } catch (err) {
        console.error('Error in markConversationRead:', err)
        return { success: false }
    }
}
