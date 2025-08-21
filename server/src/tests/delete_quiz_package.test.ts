import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable, quizSessionsTable } from '../db/schema';
import { deleteQuizPackage } from '../handlers/delete_quiz_package';
import { eq } from 'drizzle-orm';

describe('deleteQuizPackage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number };
  let testPackage: { id: number };

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test quiz package
    const packageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz Package',
        description: 'A test package for deletion',
        time_limit_minutes: 120,
        total_questions: 10,
        is_active: true,
        created_by: testUser.id
      })
      .returning()
      .execute();
    testPackage = packageResult[0];
  });

  it('should successfully soft delete an active quiz package', async () => {
    const result = await deleteQuizPackage(testPackage.id);

    expect(result.success).toBe(true);
    expect(result.message).toBe('Quiz package deleted successfully');

    // Verify the package is soft-deleted in database
    const packages = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, testPackage.id))
      .execute();

    expect(packages).toHaveLength(1);
    expect(packages[0].is_active).toBe(false);
    expect(packages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return error when quiz package does not exist', async () => {
    const result = await deleteQuizPackage(99999);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Quiz package not found');
  });

  it('should return error when trying to delete already deleted package', async () => {
    // First deletion
    await deleteQuizPackage(testPackage.id);

    // Second deletion attempt
    const result = await deleteQuizPackage(testPackage.id);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Quiz package is already deleted');
  });

  it('should update the updated_at timestamp when deleting', async () => {
    const originalPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, testPackage.id))
      .execute();

    const originalUpdatedAt = originalPackage[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    await deleteQuizPackage(testPackage.id);

    const updatedPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, testPackage.id))
      .execute();

    expect(updatedPackage[0].updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should not affect related questions and sessions (soft delete only)', async () => {
    // Create related questions
    await db.insert(questionsTable)
      .values({
        quiz_package_id: testPackage.id,
        question_text: 'Test question',
        option_a: 'Option A',
        option_b: 'Option B',
        option_c: 'Option C',
        option_d: 'Option D',
        option_e: 'Option E',
        correct_answer: 'A',
        explanation: 'Test explanation',
        order_number: 1
      })
      .execute();

    // Create related quiz session
    await db.insert(quizSessionsTable)
      .values({
        user_id: testUser.id,
        quiz_package_id: testPackage.id,
        time_remaining_seconds: 7200,
        total_questions: 10,
        is_completed: false
      })
      .execute();

    // Delete quiz package
    const result = await deleteQuizPackage(testPackage.id);

    expect(result.success).toBe(true);

    // Verify related data still exists
    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, testPackage.id))
      .execute();

    const sessions = await db.select()
      .from(quizSessionsTable)
      .where(eq(quizSessionsTable.quiz_package_id, testPackage.id))
      .execute();

    expect(questions).toHaveLength(1);
    expect(sessions).toHaveLength(1);
  });

  it('should handle negative ID gracefully', async () => {
    const result = await deleteQuizPackage(-1);
    
    expect(result.success).toBe(false);
    expect(result.message).toBe('Quiz package not found');
  });
});