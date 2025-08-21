import { db } from '../db';
import { quizPackagesTable } from '../db/schema';
import { type UpdateQuizPackageInput, type QuizPackage } from '../schema';
import { eq } from 'drizzle-orm';

export const updateQuizPackage = async (input: UpdateQuizPackageInput): Promise<QuizPackage | null> => {
  try {
    // First check if the quiz package exists
    const existingPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, input.id))
      .limit(1)
      .execute();

    if (existingPackage.length === 0) {
      return null;
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof quizPackagesTable.$inferInsert> & { updated_at: Date } = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.time_limit_minutes !== undefined) {
      updateData.time_limit_minutes = input.time_limit_minutes;
    }

    if (input.is_active !== undefined) {
      updateData.is_active = input.is_active;
    }

    // Update the quiz package
    const result = await db.update(quizPackagesTable)
      .set(updateData)
      .where(eq(quizPackagesTable.id, input.id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Quiz package update failed:', error);
    throw error;
  }
};