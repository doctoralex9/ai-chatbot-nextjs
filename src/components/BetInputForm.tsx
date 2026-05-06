'use client';

import React, { useState } from 'react';

interface BetFormData {
  odds: string;
  stake: string;
  teams: string;
  bankroll: string;
}

interface BetInputFormProps {
  onSubmit: (betData: BetFormData) => void;
  isLoading?: boolean;
}

export default function BetInputForm({ onSubmit, isLoading = false }: BetInputFormProps) {
  const [formData, setFormData] = useState<BetFormData>({
    odds: '',
    stake: '',
    teams: '',
    bankroll: '',
  });

  const [showForm, setShowForm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.odds && formData.stake && formData.teams) {
      onSubmit(formData);
      setFormData({ odds: '', stake: '', teams: '', bankroll: '' });
    }
  };

  return (
    <div className="w-full max-w-full sm:max-w-2xl mx-auto mb-4 px-0 sm:px-2">
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-3xl font-bold shadow-xl shadow-orange-500/30 hover:from-orange-500 hover:to-orange-400 hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 active:scale-95 transform btn-premium slide-down"
      >
        {showForm ? '✕ Hide Bet Input' : '⚡ Analyze a Bet'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-[#15191E] to-[#11151A] p-4 sm:p-5 rounded-[28px] space-y-4 mt-4 border border-blue-900/30 shadow-xl shadow-blue-900/25 message-appear">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 group">
              <label className="block text-sm font-bold mb-2 text-blue-300 group-focus-within:text-blue-200 transition-colors">
                🏆 Teams/Matchup
              </label>
              <input
                type="text"
                name="teams"
                value={formData.teams}
                onChange={handleChange}
                placeholder="e.g., Real Madrid vs Barcelona"
                className="w-full px-3 py-3 border-2 rounded-2xl bg-[#131B26] border-blue-900/30 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all duration-300 font-medium shadow-lg shadow-blue-900/10 hover:border-blue-800/50"
                required
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold mb-2 text-cyan-300 group-focus-within:text-cyan-200 transition-colors">
                📊 Odds (Decimal or US Format)
              </label>
              <input
                type="text"
                name="odds"
                value={formData.odds}
                onChange={handleChange}
                placeholder="e.g., 2.50 or -110"
                className="w-full px-3 py-3 border-2 rounded-2xl bg-[#131B26] border-cyan-900/30 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/25 transition-all duration-300 font-medium shadow-lg shadow-cyan-900/10 hover:border-cyan-800/50"
                required
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold mb-2 text-green-300 group-focus-within:text-green-200 transition-colors">
                💰 Stake (€)
              </label>
              <input
                type="number"
                name="stake"
                value={formData.stake}
                onChange={handleChange}
                placeholder="50"
                className="w-full px-3 py-3 border-2 rounded-2xl bg-[#131B26] border-green-900/30 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/25 transition-all duration-300 font-medium shadow-lg shadow-green-900/10 hover:border-green-800/50"
                required
                step="0.01"
                min="0"
              />
            </div>

            <div className="group">
              <label className="block text-sm font-bold mb-2 text-purple-300 group-focus-within:text-purple-200 transition-colors">
                🎲 Bankroll (€) - Optional
              </label>
              <input
                type="number"
                name="bankroll"
                value={formData.bankroll}
                onChange={handleChange}
                placeholder="500"
                className="w-full px-3 py-3 border-2 rounded-2xl bg-[#131B26] border-purple-900/30 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/25 transition-all duration-300 font-medium shadow-lg shadow-purple-900/10 hover:border-purple-800/50"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-3xl font-bold shadow-xl shadow-green-500/30 hover:from-green-500 hover:to-emerald-500 hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300 active:scale-95 hover:scale-105 transform btn-premium disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none mt-1"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                Analyzing Risk...
              </span>
            ) : (
              '✓ Analyze Risk & Value'
            )}
          </button>
        </form>
      )}

      <p className="text-xs text-blue-400 dark:text-blue-400 text-center mt-2 font-medium">
        🤖 AI-powered risk assessment & EV calculation
      </p>
    </div>
  );
}
