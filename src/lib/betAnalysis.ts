interface BetAnalysis {
  odds: number;
  stake: number;
  impliedProbability: number;
  deviggdProbability: number;
  ev: number;
  evPercentage: number;
  riskScore: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation: string;
  maxStakeForBankroll?: number;
  kellyFraction?: number;
}

export function parseOdds(oddsString: string): number {
  const odds = parseFloat(oddsString);
  if (isNaN(odds)) return 0;

  if (odds < 0) {
    // American negative odds e.g. -110
    return 100 / Math.abs(odds) + 1;
  } else if (odds > 100) {
    // American positive odds e.g. +200
    return 1 + odds / 100;
  }

  // Decimal odds e.g. 2.50
  return odds;
}

export function calculateImpliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 1) return 0;
  return (1 / decimalOdds) * 100;
}

/**
 * Estimate true ("fair") probability by removing a typical bookmaker vig.
 * We assume a standard single-sided vig of 5% (overround ≈ 1.05 on the
 * favourite in a two-way market). This is a conservative baseline — actual
 * vig varies 3–8% depending on market and bookmaker.
 *
 * Fair prob = implied prob / overround_estimate
 * For a single selection we approximate overround as 1.05.
 */
export function deviggProbability(impliedProbPct: number): number {
  const VIG_ESTIMATE = 1.05;
  return Math.min((impliedProbPct / 100) / VIG_ESTIMATE * 100, 99);
}

/**
 * EV using the devigged (market-consensus) probability as the win estimate.
 * EV = (fairWinProb * netPayout) - (fairLoseProb * stake)
 * where netPayout = stake * (decimalOdds - 1)
 */
export function calculateEV(
  decimalOdds: number,
  stake: number,
  fairWinProbPct: number
): number {
  const p = fairWinProbPct / 100;
  const netPayout = stake * (decimalOdds - 1);
  return p * netPayout - (1 - p) * stake;
}

export function getRiskScore(
  odds: number,
  stake: number,
  bankroll: number = 0,
  ev: number = 0
): 'Low' | 'Medium' | 'High' | 'Critical' {
  const impliedProb = calculateImpliedProbability(odds);
  const stakePercentage = bankroll > 0 ? (stake / bankroll) * 100 : 0;

  // Extreme longshots
  if (impliedProb < 15) return 'Critical';
  if (impliedProb < 30) return 'High';

  // Stake size relative to bankroll
  if (bankroll > 0) {
    if (stakePercentage > 20) return 'Critical';
    if (stakePercentage > 10) return 'High';
    if (stakePercentage > 5)  return 'Medium';
  }

  // Negative EV pushes score up one level
  if (ev < 0) {
    if (impliedProb < 50) return 'High';
    return 'Medium';
  }

  return impliedProb < 55 ? 'Medium' : 'Low';
}

export function getRecommendation(
  riskScore: string,
  ev: number,
  kellyFraction: number
): string {
  if (riskScore === 'Critical') {
    return "DO NOT BET. The math is heavily against you — implied win chance is too low or stake too large.";
  }
  if (ev < -5) {
    return `Negative EV of ${ev.toFixed(2)}€. You are paying the bookmaker. Skip or find better odds.`;
  }
  if (riskScore === 'High') {
    return `HIGH RISK. If you proceed, Kelly sizing says max ${(kellyFraction * 100).toFixed(1)}% of your bankroll.`;
  }
  if (ev < 0) {
    return `Slightly negative EV. The market edge is against you here. Reduce stake or shop for better odds first.`;
  }
  if (riskScore === 'Medium') {
    return `Moderate risk. Positive EV detected — keep stake to ${(kellyFraction * 100).toFixed(1)}% of bankroll max (Kelly).`;
  }
  return `Reasonable bet. EV is positive. Stake within Kelly sizing: ${(kellyFraction * 100).toFixed(1)}% of bankroll.`;
}

/**
 * Full Kelly Criterion using the devigged fair probability.
 * Kelly f = (b*p - q) / b  where b = decimalOdds - 1, p = fairWinProb, q = 1 - p
 * We return quarter-Kelly for safety (standard conservative practice).
 */
export function kellyStake(bankroll: number, decimalOdds: number, fairWinProbPct: number): {
  fraction: number;
  amount: number;
} {
  if (bankroll <= 0 || decimalOdds <= 1) return { fraction: 0, amount: 0 };
  const p = fairWinProbPct / 100;
  const q = 1 - p;
  const b = decimalOdds - 1;
  const fullKelly = (b * p - q) / b;
  const quarterKelly = Math.max(fullKelly * 0.25, 0);
  return {
    fraction: quarterKelly,
    amount: Math.round(bankroll * quarterKelly * 100) / 100,
  };
}

export function analyzeBet(
  oddsString: string,
  stakeString: string,
  bankrollString?: string
): BetAnalysis {
  const odds = parseOdds(oddsString);
  const stake = parseFloat(stakeString) || 0;
  const bankroll = parseFloat(bankrollString || '0') || 0;

  if (odds <= 1 || stake <= 0) {
    return {
      odds: 0,
      stake: 0,
      impliedProbability: 0,
      deviggdProbability: 0,
      ev: 0,
      evPercentage: 0,
      riskScore: 'Critical',
      recommendation: 'Invalid input. Check odds (must be > 1.0) and stake.',
    };
  }

  const impliedProbability = calculateImpliedProbability(odds);
  const deviggdProbability = deviggProbability(impliedProbability);
  const ev = calculateEV(odds, stake, deviggdProbability);
  const evPercentage = (ev / stake) * 100;
  const kelly = kellyStake(bankroll, odds, deviggdProbability);
  const riskScore = getRiskScore(odds, stake, bankroll, ev);
  const recommendation = getRecommendation(riskScore, ev, kelly.fraction);

  return {
    odds,
    stake,
    impliedProbability,
    deviggdProbability,
    ev,
    evPercentage,
    riskScore,
    recommendation,
    maxStakeForBankroll: bankroll > 0 ? kelly.amount : undefined,
    kellyFraction: kelly.fraction,
  };
}
