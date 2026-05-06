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
    <div className="w-full max-w-md mx-auto mb-4">
      <button
        onClick={() => setShowForm(!showForm)}
        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition mb-2"
      >
        {showForm ? 'Hide Bet Input' : 'Analyze a Bet'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">Teams (e.g., "Real Madrid vs Barcelona")</label>
            <input
              type="text"
              name="teams"
              value={formData.teams}
              onChange={handleChange}
              placeholder="Team A vs Team B"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Odds (e.g., 2.50 or -110)</label>
            <input
              type="text"
              name="odds"
              value={formData.odds}
              onChange={handleChange}
              placeholder="2.50"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Stake (€)</label>
            <input
              type="number"
              name="stake"
              value={formData.stake}
              onChange={handleChange}
              placeholder="50"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
              step="0.01"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Bankroll (€) - Optional</label>
            <input
              type="number"
              name="bankroll"
              value={formData.bankroll}
              onChange={handleChange}
              placeholder="500"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
              step="0.01"
              min="0"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing...' : 'Analyze Risk'}
          </button>
        </form>
      )}

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
        Input your bet details and let the AI assess the risk.
      </p>
    </div>
  );
}
