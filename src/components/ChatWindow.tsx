import React, { useRef, useEffect } from 'react';
import { User, Info, Video, MoreVertical, MessageSquare } from 'lucide-react';
import { Conversation, Message } from '../mock/messages';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';

interface ChatWindowProps {
  conversation: Conversation | null;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onToggleInfo: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  messages,
  onSendMessage,
  onToggleInfo,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Empty state - no conversation selected
  if (!conversation) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex items-center justify-center">
        <div className="text-center px-6">
          <div className="w-24 h-24 bg-gradient-to-br from-teal-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-12 h-12 text-[#33C7BE]" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Selecciona una conversación
          </h3>
          <p className="text-gray-600 max-w-sm">
            Elige un doctor de la lista para ver tus mensajes o iniciar una nueva conversación.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ backgroundColor: conversation.doctorAvatar }}
            >
              <User className="w-6 h-6 text-white" />
            </div>
            {conversation.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>

          {/* Doctor Info */}
          <div>
            <h3 className="font-semibold text-gray-900">
              {conversation.doctorName}
            </h3>
            <p className="text-sm text-gray-600">
              {conversation.doctorSpecialty}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleInfo}
            className="p-2 text-gray-500 hover:text-[#33C7BE] hover:bg-teal-50 rounded-lg transition-colors"
            title="Información"
          >
            <Info className="w-5 h-5" />
          </button>
          <button
            onClick={() => console.log('Video call')}
            className="p-2 text-gray-500 hover:text-[#33C7BE] hover:bg-teal-50 rounded-lg transition-colors"
            title="Videollamada"
          >
            <Video className="w-5 h-5" />
          </button>
          <button
            onClick={() => console.log('More options')}
            className="p-2 text-gray-500 hover:text-[#33C7BE] hover:bg-teal-50 rounded-lg transition-colors"
            title="Más opciones"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-gray-50/50 to-white">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-gray-400" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">
              Inicia una conversación
            </h4>
            <p className="text-sm text-gray-600 text-center max-w-xs">
              Envía tu primer mensaje a {conversation.doctorName} para comenzar.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                content={message.content}
                timestamp={message.timestamp}
                isOwnMessage={message.senderType === 'patient'}
                senderName={
                  message.senderType === 'doctor'
                    ? conversation.doctorName
                    : undefined
                }
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      <ChatInput
        onSendMessage={onSendMessage}
        onAttachFile={() => console.log('Attach file')}
      />
    </div>
  );
};

export default ChatWindow;
