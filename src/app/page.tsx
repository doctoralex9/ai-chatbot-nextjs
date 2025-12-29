'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { createClient } from '@supabase/supabase-js';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Image from 'next/image';
import "./globals.css";
import smoothscroll from "smoothscroll-polyfill";
import botAvatar from './images/botavatar.jpg';
import userAvatar from './images/useravatar.jpg';
import Loading from './Loader';



// Polyfill for smooth scroll behavior in older browsers


/**
 * Supabase Client Configuration
 * Following horizontal programming: initialized once at module level
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Type Definitions
 * Following TypeScript best practices with explicit interfaces
 */
interface Chat {
  id: number;
  prompt: string;
  response: string;
}

export default function Chatbot() {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { messages, setMessages, sendMessage, status } = useChat();
  //Scroll
  useEffect(() => {
        smoothscroll.polyfill()
    }, [])
  // Load chat history only once on mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', 'guest')
        .order('id', { ascending: true });

      if (error) {
        console.error("Error loading chat history:", error);
        setIsLoadingHistory(false);
      } else {
        // Convert Supabase history to UIMessage format
        const historyMessages = (data || []).map(item => [
          { 
            id: `user-${item.id}`, 
            role: 'user' as const, 
            parts: [{ type: 'text' as const, text: item.prompt }] 
          },
          { 
            id: `assistant-${item.id}`, 
            role: 'assistant' as const, 
            parts: [{ type: 'text' as const, text: item.response }] 
          },
        ] as UIMessage[]).flat();

        setMessages(historyMessages);
        setIsLoadingHistory(false);
      }
    };

    fetchChatHistory();
  }, []); // Only run once on mount

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  // Smooth scroll to bottom when new messages arrive
  useLayoutEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, status]);

  
  /**
   * Loading State
   */
  if (isLoadingHistory) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 overflow-hidden">
      {/* Chat Container */}
      <div className="flex-1 flex flex-col w-full max-w-full min-h-0">
        {/* Chat Header */}
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700 px-4 sm:px-6 py-3 sm:py-4 shadow-lg">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <div className="text-white font-semibold">Wager Wizard Pro</div>
            <div className="ml-auto text-gray-400 text-sm">AI Betting Analyst</div>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2 sm:space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500 p-8">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-lg font-medium text-gray-300">Start a conversation</p>
                <p className="text-sm mt-2 text-gray-400">Ask about betting odds, predictions, or match analysis</p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex items-start gap-1.5 sm:gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-500/50">
                  <Image
                    src={botAvatar}
                    alt="Wager Wizard Bot"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-md lg:max-w-lg px-3 py-2 sm:px-4 sm:py-3 rounded-2xl shadow-md ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-sm'
              }`}>
                <div className="whitespace-pre-wrap text-xs sm:text-sm leading-relaxed break-words">
                  {message.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => part.text)
                    .join('')}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-600/50">
                  <Image
                    src={userAvatar}
                    alt="User"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
              )}
            </div>
          ))}

          {status === 'streaming' && (
            <div className="flex items-start gap-1.5 sm:gap-2 justify-start animate-in fade-in duration-300">
              <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-500/50">
                <Image
                  src={botAvatar}
                  alt="Wager Wizard Bot"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="bg-gray-800 text-gray-100 px-3 py-2 sm:px-4 sm:py-3 rounded-2xl rounded-tl-sm shadow-md border border-gray-700">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-700 p-2 sm:p-4 bg-gray-800">
          <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
            <input
              type="text"
              className="flex-1 px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border-2 border-gray-600 rounded-xl bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={input}
              placeholder="Ask about odds, predictions..."
              onChange={(e) => setInput(e.target.value)}
              disabled={status === 'streaming'}
            />
            <button
              type="submit"
              disabled={status === 'streaming' || !input.trim()}
              className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm sm:text-base shadow-lg"
            >
              Send
            </button>
          </form>
          <p className="text-xs text-red-500 mt-2 sm:mt-3 text-center font-semibold">
            ⚠️ DISCLAIMER: Betting involves risk. Never wager more than you can afford to lose.
          </p>
        </div>
      </div>
    </div>
  );
}