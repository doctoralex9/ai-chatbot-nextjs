/**
 * Bet Analysis Utility
 * Provides functions to calculate EV, risk scores, and recommended actions
 */

interface BetAnalysis {
  odds: number;
  stake: number;
  impliedProbability: number;
  ev: number;
  evPercentage: number;
  riskScore: 'Low' | 'Medium' | 'High' | 'Critical';
  recommendation: string;
  maxStakeForBankroll?: number;
}

/**
 * Convert various odds formats to decimal odds
 */
export function parseOdds(oddsString: string): number {
  const odds = parseFloat(oddsString);
  if (isNaN(odds)) return 0;

  // American odds (e.g., -110, +200)
  if (odds < 0) {
    return 100 / Math.abs(odds) + 1;
  } else if (odds > 0 && odds < 1) {
    return 1 + odds / 100;
  } else if (odds > 100) {
    // Likely American positive odds
    return 1 + odds / 100;
  }

  // Decimal odds (e.g., 2.50)
  return odds;
}

/**
 * Calculate implied probability from decimal odds
 */
export function calculateImpliedProbability(decimalOdds: number): number {
  if (decimalOdds <= 0) return 0;
  return (1 / decimalOdds) * 100;
}

/**
 * Calculate expected value (EV) for a bet
 * Assumes 50% actual win probability (conservative baseline)
 */
export function calculateEV(
  decimalOdds: number,
  stake: number,
  actualWinProbability: number = 50
): number {
  const actualProb = actualWinProbability / 100;

  // EV = (Win Prob * Payout) - (Loss Prob * Stake)
  const winnings = actualProb * (stake * decimalOdds);
  const losses = (1 - actualProb) * stake;
  return winnings - losses;
}

/**
 * Determine risk score based on odds and stake
 */
export function getRiskScore(
  odds: number,
  stake: number,
  bankroll: number = 0
): 'Low' | 'Medium' | 'High' | 'Critical' {
  const impliedProb = (1 / odds) * 100;
  const stakePercentage = bankroll > 0 ? (stake / bankroll) * 100 : 0;

  // Longshots (low implied probability)
  if (impliedProb < 20) {
    return 'Critical';
  }
  if (impliedProb < 35) {
    return 'High';
  }

  // Stake size relative to bankroll
  if (bankroll > 0) {
    if (stakePercentage > 25) {
      return 'Critical';
    }
    if (stakePercentage > 15) {
      return 'High';
    }
    if (stakePercentage > 5) {
      return 'Medium';
    }
  }

  return impliedProb < 60 ? 'Medium' : 'Low';
}

/**
 * Generate a recommendation based on bet analysis
 */
export function getRecommendation(
  riskScore: string,
  ev: number,
  impliedProb: number
): string {
  if (riskScore === 'Critical') {
    return "DON'T BET. This is extremely risky - the odds are heavily against you.";
  }
  if (ev < 0) {
    return 'Reduce stake significantly or skip this bet. Negative EV.';
  }
  if (riskScore === 'High') {
    return 'HIGH RISK. Reduce your stake to 1-2% of bankroll max.';
  }
  if (impliedProb < 40) {
    return 'This is a longshot. Proceed with caution and minimal stake.';
  }
  if (riskScore === 'Medium') {
    return 'Moderate risk. Limit to 3-5% of bankroll if you proceed.';
  }
  return 'Low-moderate risk. Reasonable bet if odds favor you.';
}

/**
 * Suggest maximum stake based on Kelly Criterion (conservative 25% Kelly)
 */
export function suggestMaxStake(bankroll: number, odds: number): number {
  if (bankroll <= 0 || odds <= 0) return 0;

  // Conservative: assume 50% win rate
  const winProb = 0.5;
  const loseProb = 0.5;
  const b = odds - 1; // decimal odds minus 1 = net payout

  // Kelly = (bp - q) / b, where p = win prob, q = lose prob, b = net payout ratio
  const kellyFraction = (b * winProb - loseProb) / b;

  // Use 25% of Kelly for safety
  const conservativeKelly = Math.max(kellyFraction * 0.25, 0);

  return Math.round(bankroll * conservativeKelly * 100) / 100;
}

/**
 * Full bet analysis
 */
export function analyzeBet(
  oddsString: string,
  stakeString: string,
  bankrollString?: string
): BetAnalysis {
  const odds = parseOdds(oddsString);
  const stake = parseFloat(stakeString) || 0;
  const bankroll = parseFloat(bankrollString || '0') || 0;

  if (odds <= 0 || stake <= 0) {
    return {
      odds: 0,
      stake: 0,
      impliedProbability: 0,
      ev: 0,
      evPercentage: 0,
      riskScore: 'Critical',
      recommendation: 'Invalid input. Check odds and stake.',
    };
  }

  const impliedProbability = calculateImpliedProbability(odds);
  const ev = calculateEV(odds, stake);
  const evPercentage = (ev / stake) * 100;
  const riskScore = getRiskScore(odds, stake, bankroll);
  const recommendation = getRecommendation(riskScore, ev, impliedProbability);
  const maxStakeForBankroll =
    bankroll > 0 ? suggestMaxStake(bankroll, odds) : undefined;

  return {
    odds,
    stake,
    impliedProbability,
    ev,
    evPercentage,
    riskScore,
    recommendation,
    maxStakeForBankroll,
  };
}
