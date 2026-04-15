export type UserRole = 'applicant' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: UserRole;
  title?: string;
  bio?: string;
  phone?: string;
  department?: string;
  country?: string;
  skills?: string[];
  badges?: string[];
  projects?: { name: string; description: string; link?: string }[];
  isBlocked?: boolean;
  createdAt: string;
}

export interface MasterStudent {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  country?: string;
  role?: string;
  testStatus?: string;
  team?: string;
  createdAt?: string;
}

export interface Session {
  id: string;
  name: string;
  date: string;
  time?: string;
  description?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentEmail: string;
  studentName: string;
  status: 'present' | 'absent';
  duration?: number;
  timestamp: string;
}
