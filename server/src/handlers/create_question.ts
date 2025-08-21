import { db } from '../db';
import { questionsTable, quizPackagesTable } from '../db/schema';
import { type CreateQuestionInput, type Question } from '../schema';
import { eq } from 'drizzle-orm';

export const createQuestion = async (input: CreateQuestionInput): Promise<Question> => {
  try {
    // First, validate that the quiz package exists
    const quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, input.quiz_package_id))
      .limit(1)
      .execute();

    if (quizPackage.length === 0) {
      throw new Error(`Quiz package with ID ${input.quiz_package_id} not found`);
    }

    // Insert the new question
    const result = await db.insert(questionsTable)
      .values({
        quiz_package_id: input.quiz_package_id,
        question_text: input.question_text,
        option_a: input.option_a,
        option_b: input.option_b,
        option_c: input.option_c,
        option_d: input.option_d,
        option_e: input.option_e,
        correct_answer: input.correct_answer,
        explanation: input.explanation || null,
        order_number: input.order_number
      })
      .returning()
      .execute();

    // Get the count of questions for this quiz package
    const questionCount = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, input.quiz_package_id))
      .execute();

    // Update the quiz package's total_questions count
    await db.update(quizPackagesTable)
      .set({ 
        total_questions: questionCount.length,
        updated_at: new Date()
      })
      .where(eq(quizPackagesTable.id, input.quiz_package_id))
      .execute();

    return result[0];
  } catch (error) {
    console.error('Question creation failed:', error);
    throw error;
  }
};