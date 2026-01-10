'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { createClient } from '@supabase/supabase-js';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Image from 'next/image';
import "./globals.css";
import botAvatar from './images/botavatar.jpg';
import userAvatar from './images/useravatar.jpg';
import Loading from './Loader';
import ChatMessage from '@/components/ChatMessage';


/**
 * Supabase Client Configuration
 * Following horizontal programming: initialized once at module level
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Chatbot() {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { messages, setMessages, sendMessage, status } = useChat();

  // Load chat history only once on mount
  useEffect(() => {
    const fetchChatHistory = async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', 'guest')
        .order('id', { ascending: true });

      if (error) {
        console.log(("Error loading chat history:"), error);
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
    if (input.trim() && status !== 'streaming') {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && status !== 'streaming') {
        sendMessage({ text: input });
        setInput('');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // auto-resize textarea
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
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
    <div className="bg-[hsl(var(--background-light))] dark:bg-[hsl(var(--background-dark))] text-gray-900 dark:text-gray-100 h-screen flex flex-col overflow-hidden antialiased">
      {/* Header */}
      <header className="flex-none px-3 sm:px-4 py-2.5 sm:py-3 bg-white/80 dark:bg-[#15191E]/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 z-20 flex items-center justify-between sticky top-0">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-500 absolute bottom-0 right-0 border-2 border-white dark:border-[#15191E] z-10"></div>
            <Image
              alt="Wager Wizard Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-glow"
              src={botAvatar}
              width={40}
              height={40}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-base sm:text-lg leading-tight truncate">Wager Wizard Pro</h1>
            <p className="text-[10px] sm:text-xs text-[hsl(var(--primary))] font-medium tracking-wide uppercase truncate">AI Betting Analyst</p>
          </div>
        </div>
        <button className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-6 scroll-smooth pb-32">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 p-4 sm:p-8">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">💬</div>
              <p className="text-base sm:text-lg font-medium text-gray-300">Start a conversation</p>
              <p className="text-xs sm:text-sm mt-2 text-gray-400 px-4">Ask about betting odds, predictions, or match analysis</p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            role={message.role as 'user' | 'assistant'}
            content={message.parts
              .filter((part) => part.type === 'text')
              .map((part) => part.text)
              .join('')}
            avatarSrc={message.role === 'user' ? userAvatar.src : botAvatar.src}
          />
        ))}

        {status === 'streaming' && (
          <div className="flex items-start gap-2 sm:gap-3 justify-start w-full">
            <Image
              alt="AI Avatar"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 shadow-sm"
              src={botAvatar}
              width={32}
              height={32}
            />
            <div className="bg-white dark:bg-[#15191E] p-2.5 px-3 sm:p-3 sm:px-4 rounded-2xl rounded-tl-sm shadow-soft border border-gray-100 dark:border-gray-800">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                <div className="w-2 h-2 bg-[hsl(var(--primary))] rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Quick Action Buttons */}
      <div className="fixed bottom-[4.5rem] sm:bottom-[5rem] left-0 right-0 px-3 sm:px-4 z-10 pointer-events-none">
        <div className="flex overflow-x-auto space-x-1.5 sm:space-x-2 pb-2 pointer-events-auto scrollbar-hide snap-x snap-mandatory">
          <button className="flex-none bg-white/90 dark:bg-[#15191E]/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap snap-start">
            🏆 Best Odds
          </button>
          <button className="flex-none bg-white/90 dark:bg-[#15191E]/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap snap-start">
            📊 Predictions
          </button>
          <button className="flex-none bg-white/90 dark:bg-[#15191E]/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap snap-start">
            ⚽ Live Scores
          </button>
          <button className="flex-none bg-white/90 dark:bg-[#15191E]/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap snap-start">
            💰 Value Bets
          </button>
        </div>
      </div>

      {/* Footer with Input */}
      <footer className="flex-none bg-white dark:bg-[#0B0E11] px-3 sm:px-4 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-start space-x-2 sm:space-x-2.5 mb-4 sm:mb-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg py-2 sm:py-2.5 px-2.5 sm:px-3">
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-[10px] sm:text-xs leading-snug text-gray-700 dark:text-gray-300">
            <span className="font-bold text-amber-600 dark:text-amber-500">DISCLAIMER:</span> Betting involves risk. Never wager more than you can afford to lose.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <button
            type="button"
            className="absolute left-2 sm:left-3 p-1 sm:p-1.5 text-gray-400 hover:text-[hsl(var(--primary))] transition-colors z-10"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <textarea
            className="w-full bg-gray-100 dark:bg-[#15191E] text-gray-900 dark:text-white placeholder-gray-400 text-base sm:text-lg rounded-3xl py-4 sm:py-5 pl-11 sm:pl-12 pr-12 sm:pr-13 focus:outline-none focus:ring-4 focus:ring-[hsl(var(--primary))]/60 border-2 border-gray-300 dark:border-gray-700 focus:border-[hsl(var(--primary))] transition-all duration-200 shadow-lg hover:shadow-xl resize-none max-h-40 overflow-y-auto leading-relaxed font-medium"
            placeholder="Ask about odds, predictions..."
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={status === 'streaming'}
            autoFocus
          />
          <button
            type="submit"
            disabled={status === 'streaming' || !input.trim()}
            className="absolute right-2 sm:right-2.5 p-2 bg-[hsl(var(--primary))] text-white rounded-full shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}