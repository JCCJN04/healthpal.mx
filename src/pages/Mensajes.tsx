import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import DoctorContextPanel from '../components/DoctorContextPanel';
import {
  mockConversations,
  getConversationById,
  getMessagesByConversationId,
  addMessage,
  Message,
} from '../mock/messages';

const Mensajes: React.FC = () => {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    mockConversations[0]?.id || null
  );
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>(
    mockConversations.reduce((acc, conv) => {
      acc[conv.id] = getMessagesByConversationId(conv.id);
      return acc;
    }, {} as Record<string, Message[]>)
  );

  const activeConversation = activeConversationId
    ? getConversationById(activeConversationId) || null
    : null;

  const activeMessages = activeConversationId
    ? messages[activeConversationId] || []
    : [];

  const handleSelectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    
    // Load messages if not already loaded
    if (!messages[conversationId]) {
      setMessages(prev => ({
        ...prev,
        [conversationId]: getMessagesByConversationId(conversationId),
      }));
    }
  };

  const handleSendMessage = (content: string) => {
    if (!activeConversationId) return;

    const newMessage = addMessage(activeConversationId, {
      conversationId: activeConversationId,
      senderId: 'patient',
      senderType: 'patient',
      content,
      timestamp: new Date().toISOString(),
      read: true,
    });

    setMessages(prev => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage],
    }));

    console.log('Message sent:', newMessage);
  };

  const handleNewChat = () => {
    console.log('New chat clicked - would open modal to select doctor');
    // TODO: Implement modal to select doctor and start new conversation
  };

  const handleToggleInfo = () => {
    setIsInfoPanelOpen(prev => !prev);
  };

  const handleScheduleAppointment = () => {
    console.log('Schedule appointment with:', activeConversation?.doctorName);
    // TODO: Navigate to appointment scheduling page
  };

  const handleShareDocument = () => {
    console.log('Share document with:', activeConversation?.doctorName);
    // TODO: Open document sharing modal
  };

  return (
    <DashboardLayout>
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tus Mensajes
            </h1>
            <p className="text-gray-600">
              Administra tus mensajes con tus médicos de confianza
            </p>
          </div>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-2 px-6 py-3 bg-[#33C7BE] text-white font-medium rounded-lg hover:bg-teal-600 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo chat</span>
          </button>
        </div>

        {/* Chat Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-240px)] min-h-[600px]">
          {/* Left Column: Conversations List */}
          <div className="lg:col-span-3 h-full">
            <ConversationList
              conversations={mockConversations}
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
            />
          </div>

          {/* Center Column: Chat Window */}
          <div className={`${isInfoPanelOpen ? 'lg:col-span-6' : 'lg:col-span-9'} h-full transition-all duration-300`}>
            <ChatWindow
              conversation={activeConversation}
              messages={activeMessages}
              onSendMessage={handleSendMessage}
              onToggleInfo={handleToggleInfo}
            />
          </div>

          {/* Right Column: Context Panel (collapsible) */}
          {isInfoPanelOpen && (
            <div className="lg:col-span-3 h-full animate-slide-in">
              <DoctorContextPanel
                conversation={activeConversation}
                isOpen={isInfoPanelOpen}
                onClose={() => setIsInfoPanelOpen(false)}
                onScheduleAppointment={handleScheduleAppointment}
                onShareDocument={handleShareDocument}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </DashboardLayout>
  );
};

export default Mensajes;
