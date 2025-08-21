import { db } from '../db';
import { quizPackagesTable, usersTable } from '../db/schema';
import { type QuizPackage } from '../schema';
import { eq } from 'drizzle-orm';

export const getQuizPackages = async (userId?: number): Promise<QuizPackage[]> => {
  try {
    // Determine if user is admin
    let isAdmin = false;
    if (userId) {
      const user = await db.select()
        .from(usersTable)
        .where(eq(usersTable.id, userId))
        .execute();
      
      isAdmin = user.length > 0 && user[0].role === 'admin';
    }

    // Build query based on admin status
    const results = isAdmin
      ? await db.select().from(quizPackagesTable).execute()
      : await db.select().from(quizPackagesTable)
          .where(eq(quizPackagesTable.is_active, true))
          .execute();

    return results.map(pkg => ({
      id: pkg.id,
      title: pkg.title,
      description: pkg.description,
      time_limit_minutes: pkg.time_limit_minutes,
      total_questions: pkg.total_questions,
      is_active: pkg.is_active,
      created_by: pkg.created_by,
      created_at: pkg.created_at,
      updated_at: pkg.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch quiz packages:', error);
    throw error;
  }
};