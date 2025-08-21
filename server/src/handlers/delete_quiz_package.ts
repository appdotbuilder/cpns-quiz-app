import { db } from '../db';
import { quizPackagesTable } from '../db/schema';
import { type SuccessResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteQuizPackage(id: number): Promise<SuccessResponse> {
  try {
    // Check if quiz package exists
    const existingPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, id))
      .execute();

    if (existingPackage.length === 0) {
      return {
        success: false,
        message: 'Quiz package not found'
      };
    }

    // Check if already soft-deleted
    if (!existingPackage[0].is_active) {
      return {
        success: false,
        message: 'Quiz package is already deleted'
      };
    }

    // Soft delete by setting is_active to false
    await db.update(quizPackagesTable)
      .set({ 
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(quizPackagesTable.id, id))
      .execute();

    return {
      success: true,
      message: 'Quiz package deleted successfully'
    };
  } catch (error) {
    console.error('Quiz package deletion failed:', error);
    throw error;
  }
}