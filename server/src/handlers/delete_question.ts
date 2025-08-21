import { db } from '../db';
import { questionsTable, quizPackagesTable } from '../db/schema';
import { type SuccessResponse } from '../schema';
import { eq } from 'drizzle-orm';

export async function deleteQuestion(id: number): Promise<SuccessResponse> {
  try {
    // First, check if the question exists and get its quiz_package_id
    const existingQuestion = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, id))
      .execute();

    if (existingQuestion.length === 0) {
      return {
        success: false,
        message: 'Question not found'
      };
    }

    const quizPackageId = existingQuestion[0].quiz_package_id;

    // Delete the question
    const result = await db.delete(questionsTable)
      .where(eq(questionsTable.id, id))
      .execute();

    if (result.rowCount === 0) {
      return {
        success: false,
        message: 'Failed to delete question'
      };
    }

    // Update the total_questions count in the related quiz package
    // Get the current count of questions for this package
    const questionCount = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, quizPackageId))
      .execute();

    const newTotalQuestions = questionCount.length;

    // Update the quiz package with the new total_questions count
    await db.update(quizPackagesTable)
      .set({ 
        total_questions: newTotalQuestions,
        updated_at: new Date()
      })
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();

    return {
      success: true,
      message: 'Question deleted successfully'
    };
  } catch (error) {
    console.error('Question deletion failed:', error);
    throw error;
  }
}