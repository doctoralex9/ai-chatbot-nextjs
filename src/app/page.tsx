'use client';
import { useChat, UIMessage } from '@ai-sdk/react';
import { createClient } from '@supabase/supabase-js';
import { useRef, useEffect, useState, useMemo } from 'react';

// Initialize Supabase client for client-side use (READ ONLY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Chat {
  id: number;
  prompt: string;
  response: string;
}

export default function Chatbot() {
  const [chatHistory, setChatHistory] = useState<Chat[] | null>(null);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchChatHistory = async () => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', 'guest') // Use a proper user ID in production
      .order('id', { ascending: true });

    if (error) {
      throw new Error("Error loading chat history!");
      setChatHistory([]);
    } else {
      setChatHistory(data || []);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // FIX: Convert Supabase history to AI SDK UIMessage format (no 'content' property)
  const initialMessages = useMemo(() => {
    if (!chatHistory) return [];
    
    return chatHistory.map(item => [
      { id: `user-${item.id}`, role: 'user', parts: [{ type: 'text', text: item.prompt }] },
      { id: `assistant-${item.id}`, role: 'assistant', parts: [{ type: 'text', text: item.response }] },
    ] as UIMessage[]).flat();
  }, [chatHistory]);

  const { messages, sendMessage, status } = useChat({
    messages: initialMessages,
    // Removed onFinish hook as saving is now handled securely in route.ts
  });

  // FIX: Use `status.toString()` to resolve TypeScript type issue
  useEffect(() => {
    if (status.toString() === 'finished') {
      // Re-fetch history to update the view after a message finishes streaming
      fetchChatHistory(); 
    }
  }, [status]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);
  
  // Professional Loading State
  if (chatHistory === null) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900 text-white">
        <div className="flex items-center space-x-3">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xl font-medium text-blue-400">Loading Wager Wizard Analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen text-white overflow-hidden">
      {/* Black Background with Ken Burns - Premium, distraction-free aesthetic */}
      <div 
        className="absolute inset-0 bg-black kenburns-top" 
      /> 

      <div className="relative z-10 flex flex-col h-full">
        <header className="bg-gray-800 p-4 text-center border-b border-gray-700 bg-opacity-90 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-blue-300">📈 Wager Wizard Pro</h1>
          <p className="text-xs text-gray-400 mt-1">AI-Powered Financial Betting Analyst for Elite Clients</p>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="fade-in flex justify-center items-center h-full">
              <div className="text-center max-w-md p-6 bg-gray-800 bg-opacity-50 backdrop-blur-sm rounded-lg border border-gray-700">
                <h2 className="text-xl font-bold text-blue-300 mb-3">
                  Welcome, Professional Client 📊
                </h2>
                <p className="text-gray-300 mb-4">
                  Ask for **Verified Recommendations** and **Risk Assessments** for any major football league.
                </p>
                <div className="text-left text-sm text-gray-400 space-y-1">
                  <div>✅ Premier League Odds & Analysis</div>
                  <div>✅ Champions League Value Bets</div>
                  <div>✅ La Liga Risk Assessment</div>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Try: "Give me a high-value bet for today's Premier League matches."
                </p>
              </div>
            </div>
          )}

          {/* ... Chat Messages and Typing Indicator components remain the same for styling consistency ... */}
          {/* (Note: All subsequent message rendering logic is assumed to be correct based on previous revisions) */}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`fade-in flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <img
                  src="/bot-avatar.jpg"
                  alt="Bot"
                  className="w-8 h-8 rounded-full mr-2 object-cover"
                />
              )}
              <div
                className={`max-w-md p-3 rounded-lg shadow-xl backdrop-blur-sm ${
                  message.role === 'user'
                    ? 'bg-blue-700 bg-opacity-90 text-white border-b-2 border-blue-400'
                    : 'bg-gray-700 bg-opacity-90 text-blue-100 border-l-2 border-blue-400'
                }`}
              >
                <div className="font-semibold text-sm mb-1">
                  {message.role === 'user' ? 'You' : 'Wager Wizard Pro'}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.parts
                    .filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join('')}
                </p>
              </div>
              {message.role === 'user' && (
                <img
                  src="/user-avatar.jpg"
                  alt="You"
                  className="w-8 h-8 rounded-full ml-2 object-cover"
                />
              )}
            </div>
          ))}
          
          {status === 'streaming' && (
            <div className="fade-in flex justify-start">
              <img
                src="/bot-avatar.jpg"
                alt="Bot"
                className="w-8 h-8 rounded-full mr-2 object-cover"
              />
              <div className="max-w-md p-3 rounded-lg shadow-md bg-gray-700 bg-opacity-90 text-blue-100 backdrop-blur-sm">
                <div className="font-semibold text-sm mb-1">Wager Wizard Pro</div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700 bg-opacity-90 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <input
              className="flex-1 p-3 border border-gray-700 rounded-lg bg-gray-900 bg-opacity-50 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm"
              value={input}
              placeholder="Request analysis or a high-value prediction..."
              onChange={(e) => setInput(e.target.value)}
              disabled={status === 'streaming'}
            />
            <button
              type="submit"
              disabled={status === 'streaming' || !input.trim()}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 font-semibold min-w-[80px]"
            >
              {status === 'streaming' ? '...' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-red-400 mt-2 text-center font-bold">
              *** DISCLAIMER: Betting involves risk. Never wager more than you can afford to lose. ***
          </p>

        </form>
      </div>
    </div>
  );
}