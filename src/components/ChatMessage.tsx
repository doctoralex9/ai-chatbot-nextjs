import Image from 'next/image';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  avatarSrc: string;
}

export default function ChatMessage({ role, content, avatarSrc }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse justify-start ml-auto' : 'justify-start'} w-full`}>
      <Image
        alt={isUser ? 'User Avatar' : 'AI Avatar'}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 ${isUser ? 'border-2 border-white dark:border-gray-800' : 'shadow-sm'}`}
        src={avatarSrc}
        width={32}
        height={32}
      />
      <div
        className={`p-2.5 px-3 sm:p-3 sm:px-4 rounded-2xl shadow-soft text-xs sm:text-sm ${
          isUser
            ? 'bg-[hsl(var(--primary))] text-white rounded-br-sm shadow-lg shadow-blue-500/20 max-w-[75%] sm:max-w-[70%]'
            : 'bg-white dark:bg-[#15191E] rounded-tl-sm border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 max-w-[85%] sm:max-w-[80%]'
        }`}
      >
        <div className="whitespace-pre-wrap leading-relaxed break-words">
          {content}
        </div>
      </div>
    </div>
  );
}
