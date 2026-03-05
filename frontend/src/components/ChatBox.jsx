/**
 * ChatBox component for BingeBuddy.
 * Real-time messaging with emoji support and typing indicators.
 */

import React, { useState, useRef, useEffect } from 'react';
import { HiPaperAirplane } from 'react-icons/hi';
import { EMOJI_REACTIONS } from '../utils/constants';

export default function ChatBox({ messages, onSendMessage, onSendEmoji, onTyping, typingUsers, currentUsername }) {
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesContainerRef = useRef(null);
  const typingTimeout = useRef(null);

  // Auto-scroll to bottom when new messages arrive - use scrollTop to stay within container
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
    onTyping(false);
  };

  const handleInputChange = (e) => {
    setText(e.target.value);
    onTyping(true);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 2000);
  };

  const handleEmojiClick = (emoji) => {
    onSendEmoji(emoji);
    setShowEmojis(false);
  };

  return (
    <div className="card flex flex-col h-full p-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
        <h3 className="font-semibold text-gray-900 dark:text-white">Chat</h3>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No messages yet. Say hi! 👋</p>
        )}

        {messages.map((msg, idx) => {
          const isOwnMessage = msg.username === currentUsername;

          return (
            <div key={idx} className={`flex ${msg.type === 'system' ? 'justify-center' : isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              {msg.type === 'system' ? (
                <span className="text-xs text-gray-400 italic">{msg.content}</span>
              ) : msg.type === 'emoji' ? (
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mb-1">{msg.username}</span>
                  <span className="text-3xl">{msg.content}</span>
                </div>
              ) : (
                <div className={`flex flex-col max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                  {!isOwnMessage && (
                    <span className="text-xs font-medium text-primary-500 mb-1">{msg.username}</span>
                  )}
                  <p className={`text-sm rounded-2xl px-4 py-2 break-words ${isOwnMessage
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-dark-border text-gray-800 dark:text-gray-200 rounded-bl-md'
                    }`}>
                    {msg.content}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1">
          <span className="text-xs text-gray-400 italic">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </span>
        </div>
      )}

      {/* Emoji bar */}
      {showEmojis && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-dark-border flex flex-wrap gap-2">
          {EMOJI_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleEmojiClick(emoji)}
              className="text-2xl hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="px-4 py-3 border-t border-gray-200 dark:border-dark-border flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="text-xl hover:scale-110 transition"
        >
          😊
        </button>
        <input
          type="text"
          value={text}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="input-field py-2 text-sm"
          maxLength={1000}
        />
        <button type="submit" className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition">
          <HiPaperAirplane className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
