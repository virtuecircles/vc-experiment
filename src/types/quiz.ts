export interface DemographicData {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string; // Physical address city (auto-filled from ZIP)
  state: string; // Physical address state (auto-filled from ZIP)
  zipCode: string; // Physical address ZIP code
  email: string;
  dateOfBirth: string;
  sex: string;
  orientation?: string; // Optional field
  occupation: string;
  annualIncome: string;
  cityId?: string; // Selected Virtue Circles city ID
}

export interface LikertQuestion {
  id: number;
  text: string;
  virtue: string;
  strength: string;
}

export interface OpenEndedQuestion {
  id: string;
  question: string;
  type: "text" | "select" | "multiselect";
  options?: string[];
  required?: boolean;
  defaultValue?: string;
}

export interface RankedVirtue {
  virtue: string;
  score: number;
  rawScore: number;
  questionCount: number;
}

export interface QuizResults {
  demographics: DemographicData;
  likertResponses: Record<number, number>; // 1-5 scale
  openEndedResponses: Record<string, string | string[]>;
  primaryVirtue: string;
  secondaryVirtue: string;
  virtueScores: Record<string, number>;
  normalizedScores?: Record<string, number>;
  allVirtues?: RankedVirtue[];
  rawScores?: Record<string, number>;
  tiedVirtues?: string[] | null;
}
