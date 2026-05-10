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
  const [formData, setFormData] = useState<BetFormData>({ odds: '', stake: '', teams: '', bankroll: '' });
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors]     = useState<Partial<Record<keyof BetFormData, string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof BetFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof BetFormData, string>> = {};
    if (!formData.teams.trim()) next.teams = 'Υποχρεωτικό';
    if (!formData.odds.trim())  next.odds  = 'Υποχρεωτικό';
    if (!formData.stake.trim()) next.stake = 'Υποχρεωτικό';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
    setFormData({ odds: '', stake: '', teams: '', bankroll: '' });
    setShowForm(false);
  };

  return (
    <div className="w-full mb-3">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setShowForm(v => !v)}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                   transition-all duration-200 active:scale-95 disabled:opacity-50"
        style={{
          background:  showForm ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
          border:      '1px solid rgba(255,255,255,0.14)',
          color:       'rgba(255,255,255,0.8)',
        }}
        onMouseEnter={e => {
          if (!isLoading) {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.25)';
            (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
          }
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = showForm ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.14)';
          (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.8)';
        }}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {showForm ? 'Κλείσιμο' : 'Ανάλυση Στοιχήματος'}
      </button>

      {/* Form panel */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 p-4 rounded-xl space-y-3 message-appear"
          style={{
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em]"
             style={{ color: 'rgba(255,255,255,0.25)' }}>
            Στοιχεία Στοιχήματος
          </p>

          {/* Matchup */}
          <div>
            <label className="block text-xs font-semibold mb-1.5"
                   style={{ color: 'rgba(255,255,255,0.6)' }}>
              Αγώνας
            </label>
            <input
              type="text"
              name="teams"
              value={formData.teams}
              onChange={handleChange}
              placeholder="Real Madrid vs Barcelona"
              className={`w-full px-3 py-2.5 rounded-lg text-sm input-field ${errors.teams ? 'border-red-500/50' : ''}`}
            />
            {errors.teams && <p className="mt-1 text-[10px]" style={{ color: 'var(--red)' }}>{errors.teams}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Odds */}
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                     style={{ color: 'rgba(255,255,255,0.55)' }}>
                Αποδόσεις
              </label>
              <input
                type="text"
                name="odds"
                value={formData.odds}
                onChange={handleChange}
                placeholder="2.50 ή -110"
                className={`w-full px-3 py-2.5 rounded-lg text-sm input-field ${errors.odds ? 'border-red-500/50' : ''}`}
              />
              {errors.odds && <p className="mt-1 text-[10px]" style={{ color: 'var(--red)' }}>{errors.odds}</p>}
            </div>

            {/* Stake */}
            <div>
              <label className="block text-xs font-semibold mb-1.5"
                     style={{ color: 'rgba(255,255,255,0.55)' }}>
                Ποσό (€)
              </label>
              <input
                type="number"
                name="stake"
                value={formData.stake}
                onChange={handleChange}
                placeholder="50"
                min="0"
                step="0.01"
                className={`w-full px-3 py-2.5 rounded-lg text-sm input-field ${errors.stake ? 'border-red-500/50' : ''}`}
              />
              {errors.stake && <p className="mt-1 text-[10px]" style={{ color: 'var(--red)' }}>{errors.stake}</p>}
            </div>

            {/* Bankroll */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1.5"
                     style={{ color: 'rgba(255,255,255,0.55)' }}>
                Bankroll (€){' '}
                <span className="font-normal" style={{ color: 'rgba(255,255,255,0.22)' }}>— Προαιρετικό</span>
              </label>
              <input
                type="number"
                name="bankroll"
                value={formData.bankroll}
                onChange={handleChange}
                placeholder="500"
                min="0"
                step="0.01"
                className="w-full px-3 py-2.5 rounded-lg text-sm input-field"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200
                       active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed btn-primary"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Ανάλυση Ρίσκου…
              </span>
            ) : (
              'Ανάλυση Ρίσκου & EV →'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
