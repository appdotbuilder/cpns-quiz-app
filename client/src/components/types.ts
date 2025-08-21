// Local type definitions for the frontend
// These should match the server schema types

export interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface QuizPackage {
  id: number;
  title: string;
  description: string | null;
  time_limit_minutes: number;
  total_questions: number;
  is_active: boolean;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateQuizPackageInput {
  title: string;
  description?: string | null;
  time_limit_minutes: number;
  is_active: boolean;
  created_by: number;
}

export interface UpdateQuizPackageInput {
  id: number;
  title?: string;
  description?: string | null;
  time_limit_minutes?: number;
  is_active?: boolean;
}

export interface Question {
  id: number;
  quiz_package_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string | null;
  order_number: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateQuestionInput {
  quiz_package_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation?: string | null;
  order_number: number;
}

export interface UpdateQuestionInput {
  id: number;
  question_text?: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer?: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation?: string | null;
  order_number?: number;
}

export interface QuizSession {
  id: number;
  user_id: number;
  quiz_package_id: number;
  started_at: Date;
  completed_at: Date | null;
  time_remaining_seconds: number;
  total_score: number | null;
  total_correct: number | null;
  total_questions: number;
  is_completed: boolean;
}

export interface QuizResult {
  session_id: number;
  user_id: number;
  quiz_package_title: string;
  total_questions: number;
  total_correct: number;
  total_score: number;
  completion_time_minutes: number;
  completed_at: Date;
}

// API Response types (matching actual server responses)
export interface UserStatistics {
  user_id: number;
  total_quizzes_taken: number;
  total_questions_answered: number;
  total_correct_answers: number;
  average_score: number;
  best_score: number;
  total_time_spent_minutes: number;
  last_quiz_date: Date | null;
}

export interface QuizResultDetail {
  question: Question;
  user_answer: 'A' | 'B' | 'C' | 'D' | 'E';
  is_correct: boolean;
}

// API response type for quiz result details
export interface QuizResultDetails extends QuizResult {
  answers: Array<{
    question: Question;
    userAnswer: {
      id: number;
      session_id: number;
      question_id: number;
      selected_answer: 'A' | 'B' | 'C' | 'D' | 'E';
      is_correct: boolean;
      answered_at: Date;
    };
  }>;
}