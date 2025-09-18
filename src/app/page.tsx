'use client';

import { useChat} from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

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
      setChatHistory(data);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // useChat hook to handle chat logic and streaming
  
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage({text: input});
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-white-100">
      <header className="bg-white p-4 text-center border-b">
        <h1 className="text-2xl font-bold">💬 AI Debugging Assistant</h1>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-md p-3 rounded-lg shadow-md ${
                m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-900'
              }`}
            >
              <div className="font-semibold">{m.role === 'user' ? 'You' : 'Bot'}</div>
              <p className="whitespace-pre-wrap">
                {m.parts.map((part) => (part.type === 'text' ? part.text : null))}
              </p>
            </div>
          </div>
        ))}
      </main>

      <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
        <div className="flex items-center space-x-2">
          <input
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={input}
            placeholder="What's your coding question?"
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}