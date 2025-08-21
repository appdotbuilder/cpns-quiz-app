import { serial, text, pgTable, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Define enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const answerOptionEnum = pgEnum('answer_option', ['A', 'B', 'C', 'D', 'E']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(), // In production, this should be hashed
  role: userRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Quiz packages table
export const quizPackagesTable = pgTable('quiz_packages', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'), // Nullable by default
  time_limit_minutes: integer('time_limit_minutes').notNull().default(120), // Default 120 minutes for CPNS
  total_questions: integer('total_questions').notNull().default(110), // Default 110 questions for CPNS
  is_active: boolean('is_active').notNull().default(true),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Questions table
export const questionsTable = pgTable('questions', {
  id: serial('id').primaryKey(),
  quiz_package_id: integer('quiz_package_id').notNull().references(() => quizPackagesTable.id),
  question_text: text('question_text').notNull(),
  option_a: text('option_a').notNull(),
  option_b: text('option_b').notNull(),
  option_c: text('option_c').notNull(),
  option_d: text('option_d').notNull(),
  option_e: text('option_e').notNull(),
  correct_answer: answerOptionEnum('correct_answer').notNull(),
  explanation: text('explanation'), // Nullable by default
  order_number: integer('order_number').notNull(), // For ordering questions in the quiz
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Quiz sessions table (for tracking user quiz attempts)
export const quizSessionsTable = pgTable('quiz_sessions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  quiz_package_id: integer('quiz_package_id').notNull().references(() => quizPackagesTable.id),
  started_at: timestamp('started_at').defaultNow().notNull(),
  completed_at: timestamp('completed_at'), // Nullable - null until quiz is completed
  time_remaining_seconds: integer('time_remaining_seconds').notNull(), // Track remaining time
  total_score: integer('total_score'), // Nullable - calculated when quiz is completed
  total_correct: integer('total_correct'), // Nullable - calculated when quiz is completed
  total_questions: integer('total_questions').notNull(),
  is_completed: boolean('is_completed').notNull().default(false),
});

// User answers table (for storing individual question answers)
export const userAnswersTable = pgTable('user_answers', {
  id: serial('id').primaryKey(),
  session_id: integer('session_id').notNull().references(() => quizSessionsTable.id),
  question_id: integer('question_id').notNull().references(() => questionsTable.id),
  selected_answer: answerOptionEnum('selected_answer').notNull(),
  is_correct: boolean('is_correct').notNull(),
  answered_at: timestamp('answered_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  quizPackages: many(quizPackagesTable),
  quizSessions: many(quizSessionsTable),
}));

export const quizPackagesRelations = relations(quizPackagesTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [quizPackagesTable.created_by],
    references: [usersTable.id],
  }),
  questions: many(questionsTable),
  sessions: many(quizSessionsTable),
}));

export const questionsRelations = relations(questionsTable, ({ one, many }) => ({
  quizPackage: one(quizPackagesTable, {
    fields: [questionsTable.quiz_package_id],
    references: [quizPackagesTable.id],
  }),
  userAnswers: many(userAnswersTable),
}));

export const quizSessionsRelations = relations(quizSessionsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [quizSessionsTable.user_id],
    references: [usersTable.id],
  }),
  quizPackage: one(quizPackagesTable, {
    fields: [quizSessionsTable.quiz_package_id],
    references: [quizPackagesTable.id],
  }),
  userAnswers: many(userAnswersTable),
}));

export const userAnswersRelations = relations(userAnswersTable, ({ one }) => ({
  session: one(quizSessionsTable, {
    fields: [userAnswersTable.session_id],
    references: [quizSessionsTable.id],
  }),
  question: one(questionsTable, {
    fields: [userAnswersTable.question_id],
    references: [questionsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type QuizPackage = typeof quizPackagesTable.$inferSelect;
export type NewQuizPackage = typeof quizPackagesTable.$inferInsert;

export type Question = typeof questionsTable.$inferSelect;
export type NewQuestion = typeof questionsTable.$inferInsert;

export type QuizSession = typeof quizSessionsTable.$inferSelect;
export type NewQuizSession = typeof quizSessionsTable.$inferInsert;

export type UserAnswer = typeof userAnswersTable.$inferSelect;
export type NewUserAnswer = typeof userAnswersTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  quizPackages: quizPackagesTable,
  questions: questionsTable,
  quizSessions: quizSessionsTable,
  userAnswers: userAnswersTable,
};