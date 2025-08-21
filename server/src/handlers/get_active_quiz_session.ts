import { db } from '../db';
import { quizSessionsTable } from '../db/schema';
import { type QuizSession } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const getActiveQuizSession = async (userId: number): Promise<QuizSession | null> => {
  try {
    // Find the most recent incomplete quiz session for the user
    const results = await db.select()
      .from(quizSessionsTable)
      .where(and(
        eq(quizSessionsTable.user_id, userId),
        eq(quizSessionsTable.is_completed, false)
      ))
      .orderBy(desc(quizSessionsTable.started_at))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const session = results[0];
    return {
      id: session.id,
      user_id: session.user_id,
      quiz_package_id: session.quiz_package_id,
      started_at: session.started_at,
      completed_at: session.completed_at,
      time_remaining_seconds: session.time_remaining_seconds,
      total_score: session.total_score,
      total_correct: session.total_correct,
      total_questions: session.total_questions,
      is_completed: session.is_completed
    };
  } catch (error) {
    console.error('Failed to get active quiz session:', error);
    throw error;
  }
};