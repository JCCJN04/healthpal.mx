import React from 'react';

interface MessageBubbleProps {
  content: string;
  timestamp: string;
  isOwnMessage: boolean;
  senderName?: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  timestamp,
  isOwnMessage,
  senderName,
}) => {
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, '0');
      return `${displayHours}:${displayMinutes} ${ampm}`;
    } catch {
      return '';
    }
  };

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-md lg:max-w-lg`}>
        {!isOwnMessage && senderName && (
          <span className="text-xs text-gray-500 mb-1 px-3">{senderName}</span>
        )}
        <div
          className={`px-4 py-3 rounded-2xl shadow-sm ${
            isOwnMessage
              ? 'bg-[#33C7BE] text-white rounded-br-md'
              : 'bg-gray-100 text-gray-900 rounded-bl-md'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>
        <span className="text-xs text-gray-500 mt-1 px-3">
          {formatTime(timestamp)}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
