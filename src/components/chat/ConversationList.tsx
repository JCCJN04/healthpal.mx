// @ts-nocheck
import { useEffect, useRef } from 'react'
import { Search, User } from 'lucide-react'
import { ConversationWithDetails } from '../../lib/queries/chat'

interface ConversationListProps {
    conversations: ConversationWithDetails[]
    selectedId: string | null
    onSelect: (id: string) => void
    loading: boolean
    searchQuery: string
    onSearchChange: (query: string) => void
}

export default function ConversationList({
    conversations,
    selectedId,
    onSelect,
    loading,
    searchQuery,
    onSearchChange
}: ConversationListProps) {
    if (loading && conversations.length === 0) {
        return (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-3 animate-pulse">
                        <div className="w-12 h-12 bg-gray-100 rounded-full" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-100">
            {/* Search */}
            <div className="p-4 border-b border-gray-100">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#33C7BE] transition-colors" />
                    <input
                        type="text"
                        placeholder="Buscar chat..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-[#33C7BE]/20 transition-all text-sm font-medium"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <User className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No hay conversaciones</p>
                    </div>
                ) : (
                    conversations.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => onSelect(conv.id)}
                            className={`w-full p-4 flex gap-4 hover:bg-gray-50 transition-colors border-l-4 ${selectedId === conv.id ? 'bg-teal-50 border-[#33C7BE]' : 'border-transparent'}`}
                        >
                            <div className="relative flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-[#33C7BE] font-bold overflow-hidden border border-gray-100">
                                    {conv.other_participant?.avatar_url ? (
                                        <img src={conv.other_participant.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        conv.other_participant?.full_name?.charAt(0) || '?'
                                    )}
                                </div>
                                {conv.unread_count > 0 && (
                                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#33C7BE] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                                        {conv.unread_count}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex justify-between items-start mb-0.5">
                                    <h3 className={`text-sm font-bold truncate ${selectedId === conv.id ? 'text-[#33C7BE]' : 'text-gray-900'}`}>
                                        {conv.other_participant?.full_name || 'Usuario'}
                                    </h3>
                                    <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap ml-2">
                                        {new Date(conv.last_message_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate font-medium">
                                    {conv.last_message_text || 'Inicia una conversación'}
                                </p>
                            </div>
                        </button>
                    ))
                )}
            </div>
        </div>
    )
}
