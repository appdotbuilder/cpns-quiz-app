import { db } from '../db';
import { questionsTable, quizPackagesTable } from '../db/schema';
import { type UpdateQuestionInput, type Question } from '../schema';
import { eq } from 'drizzle-orm';

export const updateQuestion = async (input: UpdateQuestionInput): Promise<Question | null> => {
  try {
    // First check if the question exists
    const existingQuestion = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, input.id))
      .execute();

    if (existingQuestion.length === 0) {
      return null;
    }

    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.question_text !== undefined) {
      updateData.question_text = input.question_text;
    }
    if (input.option_a !== undefined) {
      updateData.option_a = input.option_a;
    }
    if (input.option_b !== undefined) {
      updateData.option_b = input.option_b;
    }
    if (input.option_c !== undefined) {
      updateData.option_c = input.option_c;
    }
    if (input.option_d !== undefined) {
      updateData.option_d = input.option_d;
    }
    if (input.option_e !== undefined) {
      updateData.option_e = input.option_e;
    }
    if (input.correct_answer !== undefined) {
      updateData.correct_answer = input.correct_answer;
    }
    if (input.explanation !== undefined) {
      updateData.explanation = input.explanation;
    }
    if (input.order_number !== undefined) {
      updateData.order_number = input.order_number;
    }

    // Update the question
    const result = await db.update(questionsTable)
      .set(updateData)
      .where(eq(questionsTable.id, input.id))
      .returning()
      .execute();

    return result[0] || null;
  } catch (error) {
    console.error('Question update failed:', error);
    throw error;
  }
};