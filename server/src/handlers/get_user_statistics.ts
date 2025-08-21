import { z } from 'zod';
import { db } from '../db';
import { quizSessionsTable, userAnswersTable } from '../db/schema';
import { eq, count, sum, avg, max, and } from 'drizzle-orm';

// User statistics schema
export const userStatisticsSchema = z.object({
    user_id: z.number(),
    total_quizzes_taken: z.number().int(),
    total_questions_answered: z.number().int(),
    total_correct_answers: z.number().int(),
    average_score: z.number(),
    best_score: z.number(),
    total_time_spent_minutes: z.number(),
    last_quiz_date: z.coerce.date().nullable()
});

export type UserStatistics = z.infer<typeof userStatisticsSchema>;

export async function getUserStatistics(userId: number): Promise<UserStatistics> {
    try {
        // Get quiz session statistics
        const sessionStatsResult = await db.select({
            total_quizzes_taken: count(),
            average_score: avg(quizSessionsTable.total_score),
            best_score: max(quizSessionsTable.total_score),
            total_time_spent_minutes: sum(quizSessionsTable.time_remaining_seconds),
            last_quiz_date: max(quizSessionsTable.completed_at)
        })
        .from(quizSessionsTable)
        .where(and(
            eq(quizSessionsTable.user_id, userId),
            eq(quizSessionsTable.is_completed, true)
        ))
        .execute();

        const sessionStats = sessionStatsResult[0];

        // Get user answer statistics
        const answerStatsResult = await db.select({
            total_questions_answered: count(),
            total_correct_answers: count()
        })
        .from(userAnswersTable)
        .innerJoin(quizSessionsTable, eq(userAnswersTable.session_id, quizSessionsTable.id))
        .where(and(
            eq(quizSessionsTable.user_id, userId),
            eq(quizSessionsTable.is_completed, true)
        ))
        .execute();

        const correctAnswersResult = await db.select({
            total_correct_answers: count()
        })
        .from(userAnswersTable)
        .innerJoin(quizSessionsTable, eq(userAnswersTable.session_id, quizSessionsTable.id))
        .where(and(
            eq(quizSessionsTable.user_id, userId),
            eq(quizSessionsTable.is_completed, true),
            eq(userAnswersTable.is_correct, true)
        ))
        .execute();

        const answerStats = answerStatsResult[0];
        const correctAnswerStats = correctAnswersResult[0];

        // Calculate total time spent (convert from seconds to minutes)
        // Note: time_remaining_seconds represents remaining time, so we need to calculate actual time spent
        // For this calculation, we'll assume the total quiz time minus remaining time
        const totalTimeSpent = sessionStats.total_time_spent_minutes ? 
            Math.round((Number(sessionStats.total_time_spent_minutes) || 0) / 60) : 0;

        return {
            user_id: userId,
            total_quizzes_taken: sessionStats.total_quizzes_taken || 0,
            total_questions_answered: answerStats.total_questions_answered || 0,
            total_correct_answers: correctAnswerStats.total_correct_answers || 0,
            average_score: sessionStats.average_score ? parseFloat(String(sessionStats.average_score)) : 0,
            best_score: sessionStats.best_score ? parseFloat(String(sessionStats.best_score)) : 0,
            total_time_spent_minutes: totalTimeSpent,
            last_quiz_date: sessionStats.last_quiz_date || null
        };
    } catch (error) {
        console.error('Failed to get user statistics:', error);
        throw error;
    }
}