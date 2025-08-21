import { db } from '../db';
import { questionsTable } from '../db/schema';
import { type Question } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getQuestionsByPackage(packageId: number): Promise<Question[]> {
  try {
    // Query questions for the specified package, ordered by order_number
    const results = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, packageId))
      .orderBy(asc(questionsTable.order_number))
      .execute();

    // Return questions with all fields included
    // Note: The handler returns all fields including correct_answer and explanation
    // Filtering for user access should be handled at the API/route level
    return results;
  } catch (error) {
    console.error('Failed to get questions by package:', error);
    throw error;
  }
}