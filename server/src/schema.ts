import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  password: z.string(),
  role: z.enum(['admin', 'user']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User input schemas
export const createUserInputSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(4),
  role: z.enum(['admin', 'user']).default('user')
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  username: z.string(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

// Quiz Package schema
export const quizPackageSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  time_limit_minutes: z.number().int(), // Default 120 minutes for CPNS
  total_questions: z.number().int(), // Default 110 questions for CPNS
  is_active: z.boolean(),
  created_by: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type QuizPackage = z.infer<typeof quizPackageSchema>;

// Quiz Package input schemas
export const createQuizPackageInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  time_limit_minutes: z.number().int().positive().default(120),
  is_active: z.boolean().default(true),
  created_by: z.number()
});

export type CreateQuizPackageInput = z.infer<typeof createQuizPackageInputSchema>;

export const updateQuizPackageInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  time_limit_minutes: z.number().int().positive().optional(),
  is_active: z.boolean().optional()
});

export type UpdateQuizPackageInput = z.infer<typeof updateQuizPackageInputSchema>;

// Question schema
export const questionSchema = z.object({
  id: z.number(),
  quiz_package_id: z.number(),
  question_text: z.string(),
  option_a: z.string(),
  option_b: z.string(),
  option_c: z.string(),
  option_d: z.string(),
  option_e: z.string(),
  correct_answer: z.enum(['A', 'B', 'C', 'D', 'E']),
  explanation: z.string().nullable(),
  order_number: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Question = z.infer<typeof questionSchema>;

// Question input schemas
export const createQuestionInputSchema = z.object({
  quiz_package_id: z.number(),
  question_text: z.string().min(1),
  option_a: z.string().min(1),
  option_b: z.string().min(1),
  option_c: z.string().min(1),
  option_d: z.string().min(1),
  option_e: z.string().min(1),
  correct_answer: z.enum(['A', 'B', 'C', 'D', 'E']),
  explanation: z.string().nullable().optional(),
  order_number: z.number().int().positive()
});

export type CreateQuestionInput = z.infer<typeof createQuestionInputSchema>;

export const updateQuestionInputSchema = z.object({
  id: z.number(),
  question_text: z.string().min(1).optional(),
  option_a: z.string().min(1).optional(),
  option_b: z.string().min(1).optional(),
  option_c: z.string().min(1).optional(),
  option_d: z.string().min(1).optional(),
  option_e: z.string().min(1).optional(),
  correct_answer: z.enum(['A', 'B', 'C', 'D', 'E']).optional(),
  explanation: z.string().nullable().optional(),
  order_number: z.number().int().positive().optional()
});

export type UpdateQuestionInput = z.infer<typeof updateQuestionInputSchema>;

// Quiz Session schema (for tracking user quiz attempts)
export const quizSessionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  quiz_package_id: z.number(),
  started_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  time_remaining_seconds: z.number().int(),
  total_score: z.number().nullable(),
  total_correct: z.number().int().nullable(),
  total_questions: z.number().int(),
  is_completed: z.boolean()
});

export type QuizSession = z.infer<typeof quizSessionSchema>;

// Quiz Session input schemas
export const startQuizSessionInputSchema = z.object({
  user_id: z.number(),
  quiz_package_id: z.number()
});

export type StartQuizSessionInput = z.infer<typeof startQuizSessionInputSchema>;

export const updateQuizSessionInputSchema = z.object({
  id: z.number(),
  time_remaining_seconds: z.number().int().optional(),
  is_completed: z.boolean().optional()
});

export type UpdateQuizSessionInput = z.infer<typeof updateQuizSessionInputSchema>;

export const completeQuizSessionInputSchema = z.object({
  session_id: z.number(),
  answers: z.array(z.object({
    question_id: z.number(),
    selected_answer: z.enum(['A', 'B', 'C', 'D', 'E'])
  }))
});

export type CompleteQuizSessionInput = z.infer<typeof completeQuizSessionInputSchema>;

// User Answer schema (for storing individual question answers)
export const userAnswerSchema = z.object({
  id: z.number(),
  session_id: z.number(),
  question_id: z.number(),
  selected_answer: z.enum(['A', 'B', 'C', 'D', 'E']),
  is_correct: z.boolean(),
  answered_at: z.coerce.date()
});

export type UserAnswer = z.infer<typeof userAnswerSchema>;

// Quiz Results schema (for displaying results)
export const quizResultSchema = z.object({
  session_id: z.number(),
  user_id: z.number(),
  quiz_package_title: z.string(),
  total_questions: z.number().int(),
  total_correct: z.number().int(),
  total_score: z.number(),
  completion_time_minutes: z.number(),
  completed_at: z.coerce.date()
});

export type QuizResult = z.infer<typeof quizResultSchema>;

// Common response schemas
export const successResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
});

export type SuccessResponse = z.infer<typeof successResponseSchema>;