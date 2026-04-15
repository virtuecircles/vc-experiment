import { likertQuestions } from "@/data/quizQuestions";

export interface RankedVirtue {
  virtue: string;
  score: number;       // 0-100 normalized percentage
  rawScore: number;    // raw sum of answers
  questionCount: number;
}

export interface VirtueScoreResults {
  primary: RankedVirtue;
  secondary: RankedVirtue;
  third: RankedVirtue;
  fourth: RankedVirtue;
  fifth: RankedVirtue;
  sixth: RankedVirtue;
  allVirtues: RankedVirtue[];
  normalizedScores: Record<string, number>;
  rawScores: Record<string, number>;
  tiedVirtues: string[] | null; // top virtues that are tied, or null
  isBalanced: boolean; // true when all 6 normalized scores fall within a 5-point range
}

const VIRTUE_GROUPS = ["Transcendence", "Justice", "Humanity", "Temperance", "Wisdom", "Courage"];

export function calculateVirtueScores(answers: Record<number, number>): VirtueScoreResults {
  const rawScores: Record<string, number> = {};
  const questionCounts: Record<string, number> = {};

  // Initialize all groups to 0
  VIRTUE_GROUPS.forEach(v => {
    rawScores[v] = 0;
    questionCounts[v] = 0;
  });

  // Sum raw scores per virtue group
  likertQuestions.forEach(q => {
    const answer = answers[q.id];
    if (answer !== undefined && answer !== null) {
      rawScores[q.virtue] += answer;
      questionCounts[q.virtue]++;
    }
  });

  // Normalize each virtue to 0-100 based on its own question count
  const normalizedScores: Record<string, number> = {};
  VIRTUE_GROUPS.forEach(v => {
    const maxPossible = questionCounts[v] * 5;
    normalizedScores[v] = maxPossible > 0
      ? Math.round((rawScores[v] / maxPossible) * 100)
      : 0;
  });

  // Rank all 6 virtues from highest to lowest normalized score
  const ranked: RankedVirtue[] = VIRTUE_GROUPS
    .map(v => ({
      virtue: v,
      score: normalizedScores[v],
      rawScore: rawScores[v],
      questionCount: questionCounts[v],
    }))
    .sort((a, b) => {
      if (b.score === a.score) return a.virtue.localeCompare(b.virtue);
      return b.score - a.score;
    });

  // Detect ties at the top
  const topScore = ranked[0].score;
  const tiedAtTop = ranked.filter(r => r.score === topScore);
  const tiedVirtues = tiedAtTop.length > 1 ? tiedAtTop.map(r => r.virtue) : null;

  // Detect balanced profile: all 6 normalized scores within a 5-point range
  const scores = ranked.map(r => r.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const isBalanced = (maxScore - minScore) <= 5;

  return {
    primary: ranked[0],
    secondary: ranked[1],
    third: ranked[2],
    fourth: ranked[3],
    fifth: ranked[4],
    sixth: ranked[5],
    allVirtues: ranked,
    normalizedScores,
    rawScores,
    tiedVirtues,
    isBalanced,
  };
}
