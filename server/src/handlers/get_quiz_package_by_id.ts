import { db } from '../db';
import { quizPackagesTable } from '../db/schema';
import { type QuizPackage } from '../schema';
import { eq } from 'drizzle-orm';

export const getQuizPackageById = async (id: number): Promise<QuizPackage | null> => {
  try {
    const results = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const quizPackage = results[0];
    return {
      ...quizPackage,
      time_limit_minutes: quizPackage.time_limit_minutes,
      total_questions: quizPackage.total_questions
    };
  } catch (error) {
    console.error('Failed to get quiz package by ID:', error);
    throw error;
  }
};