import { db } from '../db';
import { quizSessionsTable } from '../db/schema';
import { type UpdateQuizSessionInput, type QuizSession } from '../schema';
import { eq } from 'drizzle-orm';

export const updateQuizSession = async (input: UpdateQuizSessionInput): Promise<QuizSession | null> => {
  try {
    // Build update values object dynamically based on provided fields
    const updateValues: any = {};
    
    if (input.time_remaining_seconds !== undefined) {
      updateValues.time_remaining_seconds = input.time_remaining_seconds;
    }
    
    if (input.is_completed !== undefined) {
      updateValues.is_completed = input.is_completed;
      
      // If marking as completed, set completion timestamp
      if (input.is_completed === true) {
        updateValues.completed_at = new Date();
      }
    }



    // Perform the update
    const result = await db.update(quizSessionsTable)
      .set(updateValues)
      .where(eq(quizSessionsTable.id, input.id))
      .returning()
      .execute();

    // Return the updated session or null if not found
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Quiz session update failed:', error);
    throw error;
  }
};