// @ts-nocheck
import { useEffect, useRef } from 'react'
import { User, Phone, Video, MoreVertical, Loader2, ArrowLeft } from 'lucide-react'
import { ConversationWithDetails } from '../../lib/queries/chat'
import ChatInput from './ChatInput'

interface ChatWindowProps {
    conversation: ConversationWithDetails | null
    messages: any[]
    currentUser: any
    loading: boolean
    onSendMessage: (body: string) => void
    onBack: () => void
    onToggleProfile: () => void
}

export default function ChatWindow({
    conversation,
    messages,
    currentUser,
    loading,
    onSendMessage,
    onBack,
    onToggleProfile
}: ChatWindowProps) {
    const scrollRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    if (!conversation) {
        return (
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center bg-gray-50/30 p-8">
                <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mb-6 ring-8 ring-white shadow-sm">
                    <User className="w-10 h-10 text-[#33C7BE]" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2 tracking-tight">Tus Mensajes</h2>
                <p className="text-gray-500 font-medium max-w-xs">
                    Selecciona una conversación para empezar a chatear con tu médico o paciente.
                </p>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white shadow-xl md:shadow-none z-10">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="md:hidden p-2 hover:bg-gray-50 rounded-lg text-gray-500">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center text-[#33C7BE] font-bold overflow-hidden border border-gray-50">
                        {conversation.other_participant?.avatar_url ? (
                            <img src={conversation.other_participant.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            conversation.other_participant?.full_name?.charAt(0) || '?'
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-gray-900 leading-none mb-1">
                            {conversation.other_participant?.full_name || 'Usuario'}
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">En línea</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button className="p-2.5 text-gray-400 hover:text-[#33C7BE] hover:bg-teal-50 rounded-xl transition-all"><Video className="w-5 h-5" /></button>
                    <button className="p-2.5 text-gray-400 hover:text-[#33C7BE] hover:bg-teal-50 rounded-xl transition-all"><Phone className="w-5 h-5" /></button>
                    <button
                        onClick={onToggleProfile}
                        className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all"
                        title="Mostrar/ocultar perfil"
                    >
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Messages List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 custom-scrollbar"
            >
                {loading ? (
                    <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-[#33C7BE]" /></div>
                ) : (
                    messages.map((msg, i) => {
                        const isMine = msg.sender_id === currentUser?.id
                        const showTime = i === 0 ||
                            new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 15 * 60 * 1000

                        return (
                            <div key={msg.id} className="space-y-1">
                                {showTime && (
                                    <div className="flex justify-center my-4">
                                        <span className="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-widest shadow-sm">
                                            {new Date(msg.created_at).toLocaleDateString()} {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm font-medium shadow-sm transition-all hover:shadow-md ${isMine
                                        ? 'bg-[#33C7BE] text-white rounded-tr-none translate-y-0.5'
                                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none -translate-y-0.5'
                                        }`}>
                                        {msg.body}
                                        <div className={`text-[10px] mt-1.5 font-bold uppercase tracking-widest opacity-60 text-right`}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50 grayscale">
                        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-[#33C7BE]" />
                        </div>
                        <p className="font-bold text-gray-400 uppercase tracking-[0.2em] text-xs">Comienza el chat</p>
                    </div>
                )}
            </div>

            {/* Input */}
            <ChatInput onSend={onSendMessage} disabled={loading} />
        </div>
    )
}
