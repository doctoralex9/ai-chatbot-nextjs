'use client';
import { useChat } from '@ai-sdk/react';
import { createClient } from '@supabase/supabase-js';
import { useRef ,useEffect, useState } from 'react';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define a type for your chat history from Supabase
interface Chat {
  id: number;
  prompt: string;
  response: string;
}

export default function Chatbot() {
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Function to fetch chat history from Supabase
  const fetchChatHistory = async () => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', 'guest')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching chat history:', error);
    } else {
      setChatHistory(data || []);
    }
  };

  // Function to save chat messages to database
  const saveChatToDatabase = async (prompt: string, response: string) => {
    const { error } = await supabase
      .from('chat_history')
      .insert([{ user_id: 'guest', prompt, response }]);
    
    if (error) {
      console.error('Error saving chat:', error);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const { messages, sendMessage, status } = useChat({
    onFinish: (options) => {
      // Get the last user message and the new assistant response
      const userMessages = options.messages.filter(m => m.role === 'user');
      const lastUserMessage = userMessages[userMessages.length - 1];
      
      if (lastUserMessage && options.message.role === 'assistant') {
        // Extract text from parts
        const userText = lastUserMessage.parts
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('');
        
        const assistantText = options.message.parts
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join('');
        
        saveChatToDatabase(userText, assistantText);
      }
    },
  });
  
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
  return (
    <div
      className="relative flex flex-col h-screen text-white overflow-hidden"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay for dark theme */}
      <div className="absolute inset-0 bg-gray-900 bg-opacity-80 z-0" />
      <div className="relative z-10 flex flex-col h-full">
        <header className="bg-gray-800 p-4 text-center border-b border-gray-700 bg-opacity-90">
          <h1 className="text-2xl font-bold text-blue-300">🎲 The Wager Wizard</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <img
                  src="/bot-avatar.jpg"
                  alt="Bot"
                  className="w-8 h-8 rounded-full mr-2"
                />
              )}
              <div
                className={`max-w-md p-3 rounded-lg shadow-md ${
                  message.role === 'user'
              ? 'bg-blue-700 text-white'
              : 'bg-gray-700 text-blue-100'
                }`}
              >
                <div className="font-semibold">
                  {message.role === 'user' ? 'You' : 'Bot'}
                </div>
                <p className="whitespace-pre-wrap">
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
                  className="w-8 h-8 rounded-full ml-2"
                />
              )}
            </div>
          ))}
          {status === 'streaming' && (
            <div className="flex justify-start">
              <div className="max-w-md p-3 rounded-lg shadow-md bg-gray-700 text-blue-100">
                <div className="font-semibold">Bot</div>
                <p className="whitespace-pre-wrap">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>
        <form onSubmit={handleSubmit} className="p-4 bg-gray-800 border-t border-gray-700 bg-opacity-90">
          <div className="flex items-center space-x-2">
            <input
              className="flex-1 p-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={input}
              placeholder="What's your sports betting question?"
              onChange={(e) => setInput(e.target.value)}
              disabled={status === 'streaming'}
            />
            <button
              type="submit"
              disabled={status === 'streaming' || !input.trim()}
              className="p-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:bg-gray-600"
            >
              {status === 'streaming' ? 'Sending...' : 'Send'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}