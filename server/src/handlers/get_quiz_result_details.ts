import { db } from '../db';
import { quizSessionsTable, userAnswersTable, questionsTable, quizPackagesTable } from '../db/schema';
import { type QuizResult, type UserAnswer, type Question } from '../schema';
import { eq } from 'drizzle-orm';

export interface QuizResultDetails extends QuizResult {
    answers: Array<{
        question: Question;
        userAnswer: UserAnswer;
    }>;
}

export async function getQuizResultDetails(sessionId: number): Promise<QuizResultDetails | null> {
    try {
        // First, get the quiz session data to build the basic QuizResult
        const sessionResults = await db.select()
            .from(quizSessionsTable)
            .innerJoin(quizPackagesTable, eq(quizSessionsTable.quiz_package_id, quizPackagesTable.id))
            .where(eq(quizSessionsTable.id, sessionId))
            .execute();

        if (sessionResults.length === 0) {
            return null;
        }

        const sessionData = sessionResults[0];
        const session = sessionData.quiz_sessions;
        const quizPackage = sessionData.quiz_packages;

        // Check if the session is completed
        if (!session.is_completed || !session.completed_at || session.total_score === null || session.total_correct === null) {
            return null;
        }

        // Calculate completion time in minutes
        const startTime = new Date(session.started_at);
        const endTime = new Date(session.completed_at);
        const completionTimeMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

        // Get all user answers with their corresponding questions
        const answersResults = await db.select()
            .from(userAnswersTable)
            .innerJoin(questionsTable, eq(userAnswersTable.question_id, questionsTable.id))
            .where(eq(userAnswersTable.session_id, sessionId))
            .execute();

        // Transform the answers data
        const answers = answersResults.map(result => ({
            question: result.questions,
            userAnswer: result.user_answers
        }));

        // Build the complete quiz result details
        const quizResultDetails: QuizResultDetails = {
            session_id: session.id,
            user_id: session.user_id,
            quiz_package_title: quizPackage.title,
            total_questions: session.total_questions,
            total_correct: session.total_correct,
            total_score: session.total_score,
            completion_time_minutes: completionTimeMinutes,
            completed_at: session.completed_at,
            answers: answers
        };

        return quizResultDetails;
    } catch (error) {
        console.error('Failed to get quiz result details:', error);
        throw error;
    }
}