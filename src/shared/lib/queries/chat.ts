// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { supabase } from '@/shared/lib/supabase'
import { logger } from '@/shared/lib/logger'
import type { Database } from '@/shared/types/database'
import { isDemoMode } from '@/context/DemoContext'
import { demoMessagesInbox, demoPatients } from '@/data/demoData'
import { DEMO_DOCTOR_ID, DEMO_PATIENT_IDS } from '@/data/demoConfig'
import { createNotification } from '@/shared/lib/queries/notifications'

type Conversation = Database['public']['Tables']['conversations']['Row']

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

type DemoConversationSeed = {
    conversation_id: string
    patient_id: string
    from: string
    preview: string
    created_at: string
    unread: boolean
    messages: Array<{
        id: string
        sender_id: string
        body: string
        created_at: string
    }>
}

function shiftMinutes(baseIso: string, minutesDelta: number): string {
    const date = new Date(baseIso)
    date.setMinutes(date.getMinutes() + minutesDelta)
    return date.toISOString()
}

function buildDemoConversationSeeds(): DemoConversationSeed[] {
    const anaInbox = demoMessagesInbox.find((msg) => msg.from === 'Ana Martinez') || demoMessagesInbox[0]
    const carlosInbox = demoMessagesInbox.find((msg) => msg.from === 'Carlos Romero') || demoMessagesInbox[1] || demoMessagesInbox[0]

    return [
        {
            conversation_id: `demo-conv-${DEMO_PATIENT_IDS.ana}`,
            patient_id: DEMO_PATIENT_IDS.ana,
            from: 'Ana Martinez',
            preview: anaInbox?.preview || 'Doctor, tengo una pregunta sobre la dosis... ',
            created_at: anaInbox?.created_at || new Date().toISOString(),
            unread: Boolean(anaInbox?.unread),
            messages: [
                {
                    id: `demo-msg-${DEMO_PATIENT_IDS.ana}-1`,
                    sender_id: DEMO_PATIENT_IDS.ana,
                    body: 'Doctor, me puede confirmar la dosis de esta semana?',
                    created_at: shiftMinutes(anaInbox?.created_at || new Date().toISOString(), -18),
                },
                {
                    id: `demo-msg-${DEMO_PATIENT_IDS.ana}-2`,
                    sender_id: DEMO_DOCTOR_ID,
                    body: 'Claro Ana, manten 1 tableta por la manana y 1 por la noche.',
                    created_at: shiftMinutes(anaInbox?.created_at || new Date().toISOString(), -12),
                },
                {
                    id: `demo-msg-${DEMO_PATIENT_IDS.ana}-3`,
                    sender_id: DEMO_PATIENT_IDS.ana,
                    body: anaInbox?.preview || 'Doctor, tengo una pregunta sobre la dosis... ',
                    created_at: anaInbox?.created_at || new Date().toISOString(),
                },
            ],
        },
        {
            conversation_id: `demo-conv-${DEMO_PATIENT_IDS.carlos}`,
            patient_id: DEMO_PATIENT_IDS.carlos,
            from: 'Carlos Romero',
            preview: carlosInbox?.preview || 'Ya subi mis estudios de glucosa.',
            created_at: carlosInbox?.created_at || new Date().toISOString(),
            unread: Boolean(carlosInbox?.unread),
            messages: [
                {
                    id: `demo-msg-${DEMO_PATIENT_IDS.carlos}-1`,
                    sender_id: DEMO_PATIENT_IDS.carlos,
                    body: 'Doctor, ya estan listos mis resultados de laboratorio.',
                    created_at: shiftMinutes(carlosInbox?.created_at || new Date().toISOString(), -20),
                },
                {
                    id: `demo-msg-${DEMO_PATIENT_IDS.carlos}-2`,
                    sender_id: DEMO_DOCTOR_ID,
                    body: 'Perfecto Carlos, los reviso hoy por la tarde y te escribo.',
                    created_at: shiftMinutes(carlosInbox?.created_at || new Date().toISOString(), -13),
                },
                {
                    id: `demo-msg-${DEMO_PATIENT_IDS.carlos}-3`,
                    sender_id: DEMO_PATIENT_IDS.carlos,
                    body: carlosInbox?.preview || 'Ya subi mis estudios de glucosa.',
                    created_at: carlosInbox?.created_at || new Date().toISOString(),
                },
            ],
        },
    ]
}

function resolveDemoConversationById(conversationId: string): DemoConversationSeed | null {
    const seeds = buildDemoConversationSeeds()

    // Current canonical format: demo-conv-{patientId}
    const direct = seeds.find((seed) => seed.conversation_id === conversationId)
    if (direct) return direct

    // Backward-compatible format used in older demo links: demo-conv-{doctorId}-{patientId}
    const legacy = seeds.find((seed) => conversationId.endsWith(`-${seed.patient_id}`))
    return legacy || null
}

/**
 * List all conversations for the current user
 */
export async function listMyConversations(userId: string): Promise<ConversationWithDetails[]> {
    if (isDemoMode()) {
        const seeds = buildDemoConversationSeeds()
        return seeds.map((seed) => {
            const patient = demoPatients.find((p) => p.id === seed.patient_id)
            return {
                id: seed.conversation_id,
                created_at: seed.created_at,
                last_message_at: seed.created_at,
                last_message_text: seed.preview,
                other_participant: {
                    id: seed.patient_id,
                    full_name: patient?.full_name || seed.from,
                    avatar_url: patient?.avatar_url || null,
                    email: patient?.email || null,
                    role: 'patient',
                },
                unread_count: seed.unread ? 1 : 0,
            } as ConversationWithDetails
        })
    }

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const myPart = participants.find((p: any) => p.user_id === userId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    if (isDemoMode()) {
        return demoMessagesInbox.filter((message) => message.unread).length
    }

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
    if (isDemoMode()) {
        return `demo-conv-${otherUserId}`
    }

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
    if (isDemoMode()) {
        const seed = resolveDemoConversationById(conversationId)
        if (!seed) return []

        const messages = seed.messages
            .map((msg) => ({ ...msg, conversation_id: seed.conversation_id }))
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

        return messages.slice(-(options.limit || 50))
    }

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
    if (isDemoMode()) {
        return {
            success: true,
            data: {
                id: `demo-sent-${Date.now()}`,
                conversation_id: conversationId,
                sender_id: senderId,
                body,
                created_at: new Date().toISOString(),
            },
        }
    }

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

        // Notify other participant(s) — DB trigger handles this too, but calling
        // from client ensures delivery during development or trigger unavailability.
        supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', senderId)
            .then(({ data: others }) => {
                if (!others) return
                others.forEach(({ user_id }) => {
                    createNotification({
                        user_id,
                        type: 'new_message',
                        title: 'Nuevo mensaje',
                        body: 'Tienes un nuevo mensaje.',
                        entity_table: 'conversations',
                        entity_id: conversationId,
                    }).catch(e => logger.warn('sendMessage:notify', e))
                })
            })
            .catch(e => logger.warn('sendMessage:fetchParticipants', e))

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
    if (isDemoMode()) {
        logger.info('demo:markConversationRead', { conversationId, userId })
        return { success: true }
    }

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
    if (isDemoMode()) {
        logger.info('demo:updateUserStatus', { userId })
        return { success: true }
    }

    try {
        // Single source of truth: user_status table only.
        // profiles.last_seen_at was a duplicate that could diverge; removed.
        const { error: statusError } = await supabase
            .from('user_status')
            .upsert({
                user_id: userId,
                last_seen_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' })

        if (statusError) throw statusError

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
    if (isDemoMode()) {
        const now = new Date().toISOString()
        return userIds.map((id) => ({ user_id: id, last_seen_at: now }))
    }

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
