import { db } from '../db';
import { quizSessionsTable, quizPackagesTable } from '../db/schema';
import { type QuizResult } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getQuizResults(userId: number): Promise<QuizResult[]> {
  try {
    // Query completed quiz sessions with package information
    const results = await db.select({
      session_id: quizSessionsTable.id,
      user_id: quizSessionsTable.user_id,
      quiz_package_title: quizPackagesTable.title,
      total_questions: quizSessionsTable.total_questions,
      total_correct: quizSessionsTable.total_correct,
      total_score: quizSessionsTable.total_score,
      started_at: quizSessionsTable.started_at,
      completed_at: quizSessionsTable.completed_at,
      time_limit_minutes: quizPackagesTable.time_limit_minutes
    })
    .from(quizSessionsTable)
    .innerJoin(quizPackagesTable, eq(quizSessionsTable.quiz_package_id, quizPackagesTable.id))
    .where(
      and(
        eq(quizSessionsTable.user_id, userId),
        eq(quizSessionsTable.is_completed, true)
      )
    )
    .orderBy(desc(quizSessionsTable.completed_at))
    .execute();

    // Transform results and calculate completion time
    return results.map(result => {
      const completionTimeMinutes = result.completed_at && result.started_at
        ? Math.round((result.completed_at.getTime() - result.started_at.getTime()) / (1000 * 60))
        : 0;

      return {
        session_id: result.session_id,
        user_id: result.user_id,
        quiz_package_title: result.quiz_package_title,
        total_questions: result.total_questions,
        total_correct: result.total_correct || 0,
        total_score: result.total_score || 0,
        completion_time_minutes: completionTimeMinutes,
        completed_at: result.completed_at!
      };
    });
  } catch (error) {
    console.error('Failed to get quiz results:', error);
    throw error;
  }
}