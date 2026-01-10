interface MatchCardProps {
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  matchTime?: string;
  isLive?: boolean;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  probability?: string;
}

export default function MatchCard({
  league,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchTime,
  isLive = false,
  odds,
  probability
}: MatchCardProps) {
  return (
    <div className="bg-white dark:bg-[#1A1F26] rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700/50 mt-2">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-[#232930] px-4 py-2 flex justify-between items-center border-b border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center space-x-2">
          <span className="material-icons text-[hsl(var(--primary))] text-base">sports_soccer</span>
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {league}
          </span>
        </div>
        {isLive && (
          <span className="text-xs font-mono text-[hsl(var(--accent-red))] animate-pulse flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--accent-red))] inline-block"></span> LIVE
          </span>
        )}
      </div>

      {/* Match Info */}
      <div className="p-5">
        <div className="flex justify-between items-center mb-6">
          {/* Home Team */}
          <div className="flex flex-col items-center w-1/3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 shadow-inner">
              <span className="font-bold text-lg text-gray-700 dark:text-gray-300">
                {homeTeam.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="font-bold text-sm text-center leading-tight">{homeTeam}</span>
            <span className="text-xs text-gray-500 mt-1">Home</span>
          </div>

          {/* Score/Time */}
          <div className="flex flex-col items-center w-1/3">
            {homeScore !== undefined && awayScore !== undefined ? (
              <>
                <span className="text-2xl font-black tracking-widest font-mono text-gray-900 dark:text-white">
                  {homeScore} - {awayScore}
                </span>
                {matchTime && (
                  <span className="text-xs text-[hsl(var(--accent-green))] font-medium mt-1 bg-green-500/10 px-2 py-0.5 rounded-full">
                    {matchTime}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-500">{matchTime || 'TBD'}</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center w-1/3">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 shadow-inner">
              <span className="font-bold text-lg text-gray-700 dark:text-gray-300">
                {awayTeam.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="font-bold text-sm text-center leading-tight">{awayTeam}</span>
            <span className="text-xs text-gray-500 mt-1">Away</span>
          </div>
        </div>

        {/* Odds */}
        <div className="grid grid-cols-3 gap-2">
          <button className="flex flex-col items-center justify-center py-2 bg-gray-50 dark:bg-[#232930] hover:bg-gray-100 dark:hover:bg-[#2C343D] rounded-lg border border-transparent hover:border-[hsl(var(--primary))]/50 transition-all">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">1</span>
            <span className="font-mono font-bold text-[hsl(var(--primary))]">{odds.home.toFixed(2)}</span>
          </button>
          <button className="flex flex-col items-center justify-center py-2 bg-gray-50 dark:bg-[#232930] hover:bg-gray-100 dark:hover:bg-[#2C343D] rounded-lg border border-transparent hover:border-[hsl(var(--primary))]/50 transition-all ring-1 ring-[hsl(var(--primary))]/20">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">X</span>
            <span className="font-mono font-bold text-[hsl(var(--primary))]">{odds.draw.toFixed(2)}</span>
          </button>
          <button className="flex flex-col items-center justify-center py-2 bg-gray-50 dark:bg-[#232930] hover:bg-gray-100 dark:hover:bg-[#2C343D] rounded-lg border border-transparent hover:border-[hsl(var(--primary))]/50 transition-all">
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">2</span>
            <span className="font-mono font-bold text-[hsl(var(--primary))]">{odds.away.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-[#232930] px-4 py-3 border-t border-gray-200 dark:border-gray-700/50 flex justify-between items-center">
        {probability && (
          <span className="text-xs text-gray-400">
            Probability: <span className="text-green-500">{probability}</span>
          </span>
        )}
        <button className="text-xs font-semibold text-[hsl(var(--primary))] flex items-center hover:underline ml-auto">
          Full Analysis <span className="material-icons text-sm ml-1">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
