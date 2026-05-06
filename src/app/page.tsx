'use client';

import { useChat, UIMessage } from '@ai-sdk/react';
import { createClient } from '@supabase/supabase-js';
import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import Image from 'next/image';
import "./globals.css";
import Loading from './Loader';
import ChatMessage from '@/components/ChatMessage';
import BetInputForm from '@/components/BetInputForm';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; alt?: string };

const convertToMessagePart = (part: unknown): MessagePart => {
  if (part && typeof part === 'object' && 'type' in part) {
    const p = part as Record<string, unknown>;
    if (p.type === 'text' && typeof p.text === 'string') {
      return { type: 'text', text: p.text };
    } else if (p.type === 'image') {
      return {
        type: 'image',
        imageUrl: typeof p.imageUrl === 'string' ? p.imageUrl :
                 typeof p.image_url === 'string' ? p.image_url : '',
        alt: typeof p.alt === 'string' ? p.alt : undefined
      };
    }
  }
  // Fallback for unknown types
  return { type: 'text', text: String(part) };
};


/**
 * Supabase Client Configuration
 * Following horizontal programming: initialized once at module level
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ?? 'chat_uploads';

export default function Chatbot() {
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [input, setInput] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isBetAnalyzing, setIsBetAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
        const historyMessages: UIMessage[] = [];
        (data || []).forEach(item => {
          historyMessages.push({
            id: `history-user-${item.id}`,
            role: 'user' as const,
            parts: [{ type: 'text' as const, text: item.prompt }]
          });
          historyMessages.push({
            id: `history-assistant-${item.id}`,
            role: 'assistant' as const,
            parts: [{ type: 'text' as const, text: item.response }]
          });
        });

        setMessages(historyMessages);
        setIsLoadingHistory(false);
      }
    };

    fetchChatHistory();
  }, [setMessages]); // Added setMessages to dependency array

  useEffect(() => {
    if (!attachmentFile) {
      setAttachmentPreviewUrl('');
      return;
    }

    const preview = URL.createObjectURL(attachmentFile);
    setAttachmentPreviewUrl(preview);

    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [attachmentFile]);

  // Smooth scroll to bottom when new messages arrive
  useLayoutEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, status]);

  const uploadAttachment = async (file: File) => {
    const safeFileName = `screenshots/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(safeFileName, file, { upsert: true });

    if (error) {
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(safeFileName);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to generate public URL');
    }

    return publicUrlData.publicUrl;
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    setAttachmentFile(file);
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((input.trim().length === 0 && !attachmentFile) || status === 'streaming') {
      return;
    }

    let attachmentUrl = '';

    if (attachmentFile) {
      setIsUploadingAttachment(true);
      try {
        attachmentUrl = await uploadAttachment(attachmentFile);
      } catch (error) {
        console.error('Attachment upload failed:', error);
        const message = error instanceof Error ? error.message : 'Unknown upload failure';
        setUploadError(`Attachment upload failed: ${message}`);
      } finally {
        setIsUploadingAttachment(false);
      }
    }

    if (attachmentUrl) {
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: `user-attachment-${Date.now()}`,
          role: 'user',
          parts: [
            { type: 'text', text: input.trim() || 'Screenshot attached' },
            { type: 'image', imageUrl: attachmentUrl, alt: 'Attached screenshot' },
          ],
        } as UIMessage,
      ]);
    }

    sendMessage({
      text: input.trim() + (attachmentUrl ? `\n\nAttached screenshot: ${attachmentUrl}` : ''),
    });

    setInput('');
    setAttachmentFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((input.trim().length > 0 || attachmentFile) && status !== 'streaming') {
        handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // auto-resize textarea
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
  };

  const handleBetSubmit = (betData: { odds: string; stake: string; teams: string; bankroll: string }) => {
    setIsBetAnalyzing(true);
    const betMessage = `Analyze this bet for me:
- Teams: ${betData.teams}
- Odds: ${betData.odds}
- Stake: €${betData.stake}${betData.bankroll ? `\n- Bankroll: €${betData.bankroll}` : ''}`;

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: `user-bet-${Date.now()}`,
        role: 'user',
        parts: [{ type: 'text', text: betMessage }],
      } as UIMessage,
    ]);

    sendMessage({ text: betMessage });
    setIsBetAnalyzing(false);
  };

  /**
   * Loading State
   */
  if (isLoadingHistory) {
    return <Loading />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-gray-100 antialiased" style={{ background: 'radial-gradient(circle at top, rgba(56, 189, 248, 0.12), transparent 20%), radial-gradient(circle at 15% 10%, rgba(59, 130, 246, 0.1), transparent 18%), linear-gradient(180deg, #0B0E11 0%, #090B0F 100%)' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_22%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.08),_transparent_25%)] pointer-events-none" />
      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header - Premium Glassmorphism */}
        <header className="flex-none px-3 sm:px-4 py-3 bg-gradient-to-r from-[#0B0E11] via-[#15191E] to-[#0B0E11] backdrop-blur-3xl border-b border-blue-900/20 z-20 flex items-center justify-between sticky top-0 shadow-2xl shadow-blue-900/20 slide-down">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse blur-md"></div>
            <div className="w-2 h-2 rounded-full bg-green-400 absolute bottom-0 right-0 border-2 border-[#15191E] z-10 pulse-glow"></div>
            <Image
              alt="Wager Wizard Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-glow relative z-10 hover:scale-110 transition-transform duration-300"
              src="/botavatar.jpg"
              width={40}
              height={40}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-bold text-base sm:text-lg leading-tight truncate bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-300 bg-clip-text text-transparent">Wager Wizard Pro</h1>
            <p className="text-[10px] sm:text-xs text-blue-400 font-medium tracking-widest uppercase truncate animate-pulse">✨ AI Betting Analyst</p>
          </div>
        </div>
        <button className="p-1.5 sm:p-2 rounded-full hover:bg-blue-500/20 dark:hover:bg-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 flex-shrink-0 group">
          <svg className="w-5 h-5 text-blue-400 dark:text-blue-400 group-hover:text-blue-300 transition-colors" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
      </header>

      {/* Main Chat Area - Premium Dark */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-5 space-y-4 sm:space-y-6 scroll-smooth pb-40 bg-gradient-to-b from-[#0B0E11] via-[#11151A] to-[#0B0E11]">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400 p-4 sm:p-8 scale-in">
              <div className="text-6xl sm:text-7xl mb-4 sm:mb-5 float">🚀</div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Welcome to Wager Wizard</h2>
              <p className="text-base sm:text-lg font-medium text-blue-300 mb-3">Start your betting analysis journey</p>
              <p className="text-xs sm:text-sm mt-3 text-gray-400 px-4 leading-relaxed">Ask about odds, upload betting slips, or get AI-powered predictions for your next wager</p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={message.id} style={{ animationDelay: `${index * 0.05}s` }} className="message-appear">
            <ChatMessage
              role={message.role as 'user' | 'assistant'}
              parts={message.parts.map(convertToMessagePart)}
              avatarSrc={message.role === 'user' ? '/useravatar.jpg' : '/botavatar.jpg'}
            />
          </div>
        ))}

        {status === 'streaming' && (
          <div className="flex items-start gap-2 sm:gap-3 justify-start w-full message-appear">
            <Image
              alt="AI Avatar"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 shadow-lg shadow-blue-500/30"
              src="/botavatar.jpg"
              width={32}
              height={32}
            />
            <div className="bg-gradient-to-r from-[#15191E] to-[#1B222A] p-2.5 px-3 sm:p-3 sm:px-4 rounded-2xl rounded-tl-sm shadow-lg shadow-blue-500/20 border border-blue-900/50">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.15s'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.3s'}}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Quick Action Buttons - Premium Glass Effect */}
      <div className="fixed bottom-32 left-0 right-0 px-3 sm:px-4 z-10 pointer-events-none">
        <div className="max-w-6xl mx-auto flex overflow-x-auto space-x-1.5 sm:space-x-2 pb-2 pointer-events-auto scrollbar-hide snap-x snap-mandatory">
          <button className="flex-none bg-gradient-to-br from-blue-500/20 to-cyan-500/10 dark:from-blue-900/40 dark:to-cyan-900/20 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold hover:from-blue-500/30 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 whitespace-nowrap snap-start text-blue-300 hover:text-blue-200 hover:scale-105 active:scale-95">
            🏆 Best Odds
          </button>
          <button className="flex-none bg-gradient-to-br from-blue-500/20 to-cyan-500/10 dark:from-blue-900/40 dark:to-cyan-900/20 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold hover:from-blue-500/30 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 whitespace-nowrap snap-start text-blue-300 hover:text-blue-200 hover:scale-105 active:scale-95">
            📊 Predictions
          </button>
          <button className="flex-none bg-gradient-to-br from-blue-500/20 to-cyan-500/10 dark:from-blue-900/40 dark:to-cyan-900/20 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold hover:from-blue-500/30 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 whitespace-nowrap snap-start text-blue-300 hover:text-blue-200 hover:scale-105 active:scale-95">
            ⚽ Live Scores
          </button>
          <button className="flex-none bg-gradient-to-br from-blue-500/20 to-cyan-500/10 dark:from-blue-900/40 dark:to-cyan-900/20 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold hover:from-blue-500/30 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 whitespace-nowrap snap-start text-blue-300 hover:text-blue-200 hover:scale-105 active:scale-95">
            💰 Value Bets
          </button>
        </div>
      </div>

      {/* Footer with Input - Premium Dark Design */}
      <footer className="flex-none bg-gradient-to-t from-[#0B0E11] via-[#15191E] to-[#0B0E11] px-3 sm:px-4 py-3 sm:py-5 border-t border-blue-900/20 shadow-2xl shadow-blue-900/20">
        <BetInputForm onSubmit={handleBetSubmit} isLoading={isBetAnalyzing || status === 'streaming'} />
        <div className="flex items-start space-x-2 sm:space-x-2.5 mb-4 sm:mb-5 bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/30 rounded-xl py-2 sm:py-2.5 px-2.5 sm:px-3 shadow-lg shadow-orange-500/10 slide-in-left">
          <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-orange-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-[10px] sm:text-xs leading-snug text-orange-300">
            <span className="font-bold text-orange-400">⚠ DISCLAIMER:</span> Betting involves risk. Never wager more than you can afford to lose.
          </p>
        </div>
        {attachmentPreviewUrl && (
          <div className="mb-3 rounded-2xl overflow-hidden border border-blue-900/30 bg-gradient-to-b from-[#15191E] to-[#11151A] shadow-lg shadow-blue-500/10 message-appear">
            <Image
              src={attachmentPreviewUrl}
              alt="Selected screenshot preview"
              width={400}
              height={300}
              className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
              unoptimized
            />
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-blue-300 bg-[#11151A] border-t border-blue-900/30">
              <span className="font-medium">✓ Screenshot attached</span>
              <button
                type="button"
                onClick={handleRemoveAttachment}
                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        )}
        {uploadError && (
          <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">
            {uploadError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAttachmentChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-blue-600/30 to-cyan-600/20 border border-blue-500/50 text-blue-400 hover:from-blue-500/50 hover:to-cyan-500/30 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a4 4 0 014-4h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 13l2.5 3 3.5-4.5M8 10h.01" />
            </svg>
          </button>
          <textarea
            className="flex-1 min-h-[3.5rem] max-h-40 bg-gradient-to-r from-[#15191E] to-[#1B222A] text-blue-50 placeholder-gray-500 text-base sm:text-lg rounded-2xl py-4 sm:py-5 px-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border-2 border-blue-900/30 focus:border-blue-500 transition-all duration-300 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-500/10 resize-none overflow-y-auto leading-relaxed font-medium input-premium"
            placeholder="Ask about odds, upload ticket screenshot, or say hello..."
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={status === 'streaming' || isUploadingAttachment}
            autoFocus
          />
          <button
            type="submit"
            disabled={status === 'streaming' || (!input.trim() && !attachmentFile) || isUploadingAttachment}
            className="absolute right-4 p-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-lg shadow-blue-500/40 hover:from-blue-500 hover:to-cyan-500 hover:shadow-xl hover:shadow-blue-500/60 transition-all duration-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none btn-premium group"
          >
            {isUploadingAttachment ? (
              <span className="text-xs font-bold">Uploading</span>
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform group-active:scale-95" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
          </button>
        </form>
      </footer>
    </div>
  </div>
  );
}