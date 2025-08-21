import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable } from '../db/schema';
import { deleteQuestion } from '../handlers/delete_question';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'admin_user',
  password: 'password123',
  role: 'admin' as const
};

const testQuizPackage = {
  title: 'Test Quiz Package',
  description: 'A quiz package for testing',
  time_limit_minutes: 120,
  total_questions: 3, // Will be updated automatically
  is_active: true
};

const testQuestions = [
  {
    question_text: 'What is 2 + 2?',
    option_a: '3',
    option_b: '4',
    option_c: '5',
    option_d: '6',
    option_e: '7',
    correct_answer: 'B' as const,
    explanation: 'Basic addition',
    order_number: 1
  },
  {
    question_text: 'What is 3 + 3?',
    option_a: '5',
    option_b: '6',
    option_c: '7',
    option_d: '8',
    option_e: '9',
    correct_answer: 'B' as const,
    explanation: 'Basic addition',
    order_number: 2
  },
  {
    question_text: 'What is 4 + 4?',
    option_a: '6',
    option_b: '7',
    option_c: '8',
    option_d: '9',
    option_e: '10',
    correct_answer: 'C' as const,
    explanation: 'Basic addition',
    order_number: 3
  }
];

describe('deleteQuestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a question', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({
        ...testQuizPackage,
        created_by: userId
      })
      .returning()
      .execute();
    const quizPackageId = quizPackageResult[0].id;

    // Create test questions
    const questionResults = await db.insert(questionsTable)
      .values(testQuestions.map(q => ({
        ...q,
        quiz_package_id: quizPackageId
      })))
      .returning()
      .execute();

    const questionToDelete = questionResults[0];

    // Delete the question
    const result = await deleteQuestion(questionToDelete.id);

    // Verify the result
    expect(result.success).toBe(true);
    expect(result.message).toEqual('Question deleted successfully');

    // Verify the question was deleted from database
    const remainingQuestions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, questionToDelete.id))
      .execute();

    expect(remainingQuestions).toHaveLength(0);

    // Verify other questions still exist
    const allQuestions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, quizPackageId))
      .execute();

    expect(allQuestions).toHaveLength(2);
  });

  it('should update quiz package total_questions count after deletion', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({
        ...testQuizPackage,
        created_by: userId
      })
      .returning()
      .execute();
    const quizPackageId = quizPackageResult[0].id;

    // Create test questions
    const questionResults = await db.insert(questionsTable)
      .values(testQuestions.map(q => ({
        ...q,
        quiz_package_id: quizPackageId
      })))
      .returning()
      .execute();

    // Verify initial total_questions count
    let quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();
    
    expect(quizPackage[0].total_questions).toBe(3);

    // Delete one question
    await deleteQuestion(questionResults[0].id);

    // Verify total_questions count was updated
    quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();

    expect(quizPackage[0].total_questions).toBe(2);
  });

  it('should return error when question does not exist', async () => {
    const nonExistentId = 99999;

    const result = await deleteQuestion(nonExistentId);

    expect(result.success).toBe(false);
    expect(result.message).toEqual('Question not found');
  });

  it('should handle empty quiz package after deleting all questions', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({
        ...testQuizPackage,
        total_questions: 1,
        created_by: userId
      })
      .returning()
      .execute();
    const quizPackageId = quizPackageResult[0].id;

    // Create single test question
    const questionResult = await db.insert(questionsTable)
      .values({
        ...testQuestions[0],
        quiz_package_id: quizPackageId
      })
      .returning()
      .execute();

    const questionId = questionResult[0].id;

    // Delete the only question
    const result = await deleteQuestion(questionId);

    expect(result.success).toBe(true);
    expect(result.message).toEqual('Question deleted successfully');

    // Verify quiz package total_questions is now 0
    const quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();

    expect(quizPackage[0].total_questions).toBe(0);
  });

  it('should update quiz package updated_at timestamp', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({
        ...testQuizPackage,
        created_by: userId
      })
      .returning()
      .execute();
    const quizPackageId = quizPackageResult[0].id;
    const originalUpdatedAt = quizPackageResult[0].updated_at;

    // Create test question
    const questionResult = await db.insert(questionsTable)
      .values({
        ...testQuestions[0],
        quiz_package_id: quizPackageId
      })
      .returning()
      .execute();

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    // Delete the question
    await deleteQuestion(questionResult[0].id);

    // Verify updated_at timestamp was changed
    const updatedQuizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();

    expect(updatedQuizPackage[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});