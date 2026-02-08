// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, AlertCircle, Loader2 } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import ConversationList from '../components/chat/ConversationList'
import ChatWindow from '../components/chat/ChatWindow'
import DoctorContextPanel from '../components/chat/DoctorContextPanel'
import { useAuth } from '../context/AuthContext'
import {
  listMyConversations,
  listMessages,
  sendMessage,
  getOrCreateConversation,
  ConversationWithDetails,
  markConversationRead
} from '../lib/queries/chat'
import { supabase } from '../lib/supabase'

export default function Mensajes() {
  const { user, loading: authLoading } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isStartingConv = useRef(false)

  // State
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const activeConversation = conversations.find(c => c.id === activeId) || null

  // State for initial "with" logic
  const [creatingChat, setCreatingChat] = useState(false)

  // 1. Initial Load of Conversations
  useEffect(() => {
    if (user) {
      console.log('[Mensajes] User identified, loading inbox...')
      loadConversations()
    }
  }, [user])

  const loadConversations = async (selectId?: string) => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      console.log('[Mensajes] Calling listMyConversations for:', user.id)
      const data = await listMyConversations(user.id)
      console.log('[Mensajes] Received data:', data)
      setConversations(data)

      if (selectId) {
        console.log('[Mensajes] Auto-selecting target conversation:', selectId)
        setActiveId(selectId)
      }
    } catch (err: any) {
      console.error('[Mensajes] Failed to load conversations:', err)
      setError(`CRITICAL: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 2. Handle ?with=doctorId parameter (and aliases)
  useEffect(() => {
    if (authLoading || !user || isStartingConv.current) return

    const withUserId = searchParams.get('with') || searchParams.get('doctorId') || searchParams.get('doctor')
    if (!withUserId) return

    console.log('[Mensajes] Starting chat request with user:', withUserId)

    // If already viewing this user, just clear param
    if (activeConversation?.other_participant?.id === withUserId) {
      console.log('[Mensajes] Already in this conversation, clearing param.')
      setSearchParams({})
      return
    }

    handleStartConversation(withUserId)
  }, [user, authLoading, searchParams])

  const handleStartConversation = async (otherUserId: string) => {
    if (!user || isStartingConv.current) return
    isStartingConv.current = true
    setCreatingChat(true)

    try {
      const convId = await getOrCreateConversation(user.id, otherUserId)
      console.log('[Mensajes] Conversation ID created/fetched:', convId)

      if (convId) {
        await loadConversations(convId)
        // Only clear params if successful, to allow retry if it was a fluke
        setSearchParams({})
      } else {
        throw new Error('Failed to get conversation ID')
      }
    } catch (err) {
      console.error('[Mensajes] Critical error starting conversation:', err)
      setError('No pudimos iniciar el chat con este médico.')
    } finally {
      setCreatingChat(false)
      isStartingConv.current = false
    }
  }

  // 3. Load Messages when activeId changes
  useEffect(() => {
    if (activeId) {
      loadMessages()
      markConversationRead(activeId, user!.id)
    } else {
      setMessages([])
    }
  }, [activeId])

  const loadMessages = async () => {
    if (!activeId) return
    setLoadingMessages(true)
    const msgs = await listMessages(activeId)
    setMessages(msgs)
    setLoadingMessages(false)
  }

  // 4. Realtime Subscription
  useEffect(() => {
    if (!activeId) return

    const channel = supabase
      .channel(`chat:${activeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeId}`
        },
        (payload) => {
          const newMsg = payload.new
          setMessages(prev => {
            // Avoid duplicates
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // If it's a message from someone else, mark as read
          if (newMsg.sender_id !== user?.id) {
            markConversationRead(activeId, user!.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeId, user])

  const handleSendMessage = async (body: string) => {
    if (!activeId || !user) return

    // Optimistic update (optional but better UX)
    const tempMsg = {
      id: 'temp-' + Date.now(),
      body,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      conversation_id: activeId
    }
    setMessages(prev => [...prev, tempMsg])

    const res = await sendMessage(activeId, user.id, body)
    if (!res.success) {
      // Remove temp on error or show alert
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    } else {
      // REPLACE temp message with the actual one from DB to prevent duplication with Realtime event
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? res.data : m))

      // Refresh conversation in list to show latest text
      setConversations(prev => prev.map(c =>
        c.id === activeId
          ? { ...c, last_message_text: body, last_message_at: res.data.created_at }
          : c
      ))
    }
  }

  const filteredConversations = (conversations || []).filter(c => {
    if (!searchQuery) return true
    const name = c.other_participant?.full_name?.toLowerCase() || ''
    return name.includes(searchQuery.toLowerCase())
  })

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-64px)] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#33C7BE] animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Mensajes">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50/50 relative">
        {/* Loading Overlay for conversation creation */}
        {creatingChat && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 border-4 border-[#33C7BE] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="font-bold text-gray-900 text-lg tracking-tight">Conectando con el médico...</p>
            <p className="text-gray-500 mt-1 max-w-xs font-medium">Estamos preparando un canal seguro para tus mensajes.</p>
          </div>
        )}

        {/* Global Error State */}
        {error && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[60] bg-red-50 text-red-700 px-6 py-3 rounded-2xl shadow-xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
            <AlertCircle className="w-5 h-5" />
            <span className="font-bold text-sm tracking-tight">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 font-black ml-2">&times;</button>
          </div>
        )}

        {/* Inbox Area */}
        <div className={`${activeId ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 flex-shrink-0 bg-white border-r border-gray-100`}>
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Mensajes</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Inbox de salud</p>
          </div>

          <ConversationList
            conversations={filteredConversations}
            selectedId={activeId}
            onSelect={setActiveId}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </div>

        {/* Chat Area */}
        <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              messages={messages}
              currentUser={user}
              loading={loadingMessages}
              onSendMessage={handleSendMessage}
              onBack={() => setActiveId(null)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/20">
              <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Selecciona un chat</h3>
              <p className="max-w-xs text-gray-500 text-sm font-medium">
                Elige a un médico de la lista para ver el historial de mensajes o iniciar una nueva conversación.
              </p>
            </div>
          )}
        </div>

        {/* Info Area */}
        <DoctorContextPanel conversation={activeConversation} />
      </div>
    </DashboardLayout>
  )
}
