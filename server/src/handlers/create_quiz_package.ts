import { db } from '../db';
import { quizPackagesTable, usersTable } from '../db/schema';
import { type CreateQuizPackageInput, type QuizPackage } from '../schema';
import { eq } from 'drizzle-orm';

export const createQuizPackage = async (input: CreateQuizPackageInput): Promise<QuizPackage> => {
  try {
    // Validate that the created_by user exists and has admin role
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].role !== 'admin') {
      throw new Error('Only admin users can create quiz packages');
    }

    // Insert quiz package record with defaults applied by Zod
    const result = await db.insert(quizPackagesTable)
      .values({
        title: input.title,
        description: input.description || null,
        time_limit_minutes: input.time_limit_minutes, // Zod default: 120
        total_questions: 110, // Default CPNS question count
        is_active: input.is_active, // Zod default: true
        created_by: input.created_by
      })
      .returning()
      .execute();

    const quizPackage = result[0];
    return {
      ...quizPackage,
      // Convert nullable description to proper type
      description: quizPackage.description || null
    };
  } catch (error) {
    console.error('Quiz package creation failed:', error);
    throw error;
  }
};