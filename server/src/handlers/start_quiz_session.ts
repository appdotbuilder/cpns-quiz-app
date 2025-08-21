import { db } from '../db';
import { usersTable, quizPackagesTable, quizSessionsTable, questionsTable } from '../db/schema';
import { type StartQuizSessionInput, type QuizSession } from '../schema';
import { eq, and, count } from 'drizzle-orm';

export const startQuizSession = async (input: StartQuizSessionInput): Promise<QuizSession> => {
  try {
    // 1. Validate that the user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // 2. Validate that the quiz package exists and is active
    const quizPackages = await db.select()
      .from(quizPackagesTable)
      .where(and(
        eq(quizPackagesTable.id, input.quiz_package_id),
        eq(quizPackagesTable.is_active, true)
      ))
      .execute();

    if (quizPackages.length === 0) {
      throw new Error(`Active quiz package with ID ${input.quiz_package_id} not found`);
    }

    const quizPackage = quizPackages[0];

    // 3. Validate that the quiz package has questions
    const questionCounts = await db.select({ count: count() })
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, input.quiz_package_id))
      .execute();

    const totalQuestions = questionCounts[0].count;
    if (totalQuestions === 0) {
      throw new Error(`Quiz package with ID ${input.quiz_package_id} has no questions`);
    }

    // 4. Calculate initial time remaining in seconds
    const timeRemainingSeconds = quizPackage.time_limit_minutes * 60;

    // 5. Create the quiz session
    const result = await db.insert(quizSessionsTable)
      .values({
        user_id: input.user_id,
        quiz_package_id: input.quiz_package_id,
        time_remaining_seconds: timeRemainingSeconds,
        total_questions: totalQuestions,
        is_completed: false
      })
      .returning()
      .execute();

    const session = result[0];
    
    return {
      ...session,
      // Ensure proper type conversion for nullable fields
      completed_at: session.completed_at || null,
      total_score: session.total_score || null,
      total_correct: session.total_correct || null
    };
  } catch (error) {
    console.error('Quiz session creation failed:', error);
    throw error;
  }
};