import Image from 'next/image';

type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string; alt?: string };

interface ChatMessageProps {
  role: 'user' | 'assistant';
  parts: MessagePart[];
  avatarSrc: string;
}

export default function ChatMessage({ role, parts, avatarSrc }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex items-start gap-2 sm:gap-3 ${isUser ? 'flex-row-reverse justify-start ml-auto' : 'justify-start'} w-full message-appear`}>
      {/* Avatar with Glow Effect */}
      <Image
        alt={isUser ? 'User Avatar' : 'AI Avatar'}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 transition-all duration-300 hover:scale-110 ${
          isUser 
            ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/40' 
            : 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/30'
        }`}
        src={avatarSrc}
        width={32}
        height={32}
      />
      
      {/* Message Bubble with Premium Styling */}
      <div
        className={`p-2.5 px-3 sm:p-3 sm:px-4 rounded-2xl transition-all duration-300 text-xs sm:text-sm ${
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-br-sm shadow-lg shadow-blue-500/30 max-w-[75%] sm:max-w-[70%] hover:shadow-xl hover:shadow-blue-500/50 border border-blue-400/50'
            : 'bg-gradient-to-br from-[#15191E] to-[#11151A] rounded-tl-sm border border-cyan-900/50 text-gray-200 max-w-[85%] sm:max-w-[80%] shadow-lg shadow-cyan-900/20 hover:shadow-xl hover:shadow-cyan-900/30'
        }`}
      >
        <div className="space-y-2 leading-relaxed">
          {parts.map((part, index) =>
            part.type === 'text' ? (
              <div key={index} className="whitespace-pre-wrap break-words font-medium">
                {part.text}
              </div>
            ) : (
              <div key={index} className="rounded-xl overflow-hidden border border-gray-600 dark:border-cyan-900/50 bg-gradient-to-br from-gray-800 to-gray-900 shadow-lg">
                <Image
                  src={part.imageUrl}
                  alt={part.alt ?? 'Attachment'}
                  width={720}
                  height={480}
                  className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
