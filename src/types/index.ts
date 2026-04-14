export type UserRole = 'applicant' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  phone?: string;
  department?: string;
  bio?: string;
  country?: string;
  role: UserRole;
  completedTest: boolean;
  assignedTeamId?: string | null;
  createdAt: string;
}

export interface DimensionWeights {
  leadership: number;
  organization: number;
  communication: number;
  creativity: number;
  analysis: number;
  execution: number;
}

export interface QuestionOption {
  text: string;
  textAr?: string;
  weights: DimensionWeights;
}

export interface Question {
  id: string;
  text: string;
  textAr?: string;
  options: QuestionOption[];
  active: boolean;
  order: number;
}

export interface TestResponse {
  id?: string;
  userId: string;
  questionId: string;
  selectedOptionIndex: number;
  timestamp: string;
}

export interface UserScore {
  userId: string;
  leadership: number;
  organization: number;
  communication: number;
  creativity: number;
  analysis: number;
  execution: number;
  primaryTrait: keyof DimensionWeights;
  secondaryTrait: keyof DimensionWeights;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  minSize: number;
  maxSize: number;
  memberCount: number;
}

export interface Assignment {
  id: string;
  userId: string;
  teamId: string;
  assignedBy: string;
  timestamp: string;
}
