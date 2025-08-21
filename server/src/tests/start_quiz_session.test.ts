import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable, quizSessionsTable } from '../db/schema';
import { type StartQuizSessionInput } from '../schema';
import { startQuizSession } from '../handlers/start_quiz_session';
import { eq } from 'drizzle-orm';

describe('startQuizSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testQuizPackageId: number;
  let inactiveQuizPackageId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create active quiz package
    const activePackageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'CPNS Practice Test',
        description: 'Practice test for CPNS exam',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: testUserId
      })
      .returning()
      .execute();
    testQuizPackageId = activePackageResult[0].id;

    // Create inactive quiz package
    const inactivePackageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Inactive Quiz Package',
        description: 'This package is inactive',
        time_limit_minutes: 90,
        total_questions: 50,
        is_active: false,
        created_by: testUserId
      })
      .returning()
      .execute();
    inactiveQuizPackageId = inactivePackageResult[0].id;

    // Create questions for the active quiz package
    await db.insert(questionsTable)
      .values([
        {
          quiz_package_id: testQuizPackageId,
          question_text: 'What is 2 + 2?',
          option_a: '3',
          option_b: '4',
          option_c: '5',
          option_d: '6',
          option_e: '7',
          correct_answer: 'B',
          explanation: '2 + 2 equals 4',
          order_number: 1
        },
        {
          quiz_package_id: testQuizPackageId,
          question_text: 'What is the capital of Indonesia?',
          option_a: 'Jakarta',
          option_b: 'Surabaya',
          option_c: 'Bandung',
          option_d: 'Medan',
          option_e: 'Yogyakarta',
          correct_answer: 'A',
          explanation: 'Jakarta is the capital city of Indonesia',
          order_number: 2
        }
      ])
      .execute();
  });

  const validInput: StartQuizSessionInput = {
    user_id: 0, // Will be set in tests
    quiz_package_id: 0 // Will be set in tests
  };

  it('should create a quiz session successfully', async () => {
    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: testQuizPackageId
    };

    const result = await startQuizSession(input);

    // Validate basic fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.user_id).toEqual(testUserId);
    expect(result.quiz_package_id).toEqual(testQuizPackageId);
    expect(result.started_at).toBeInstanceOf(Date);
    expect(result.completed_at).toBeNull();
    expect(result.time_remaining_seconds).toEqual(120 * 60); // 120 minutes in seconds
    expect(result.total_score).toBeNull();
    expect(result.total_correct).toBeNull();
    expect(result.total_questions).toEqual(2); // Number of questions we created
    expect(result.is_completed).toBe(false);
  });

  it('should save quiz session to database', async () => {
    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: testQuizPackageId
    };

    const result = await startQuizSession(input);

    // Verify session was saved to database
    const sessions = await db.select()
      .from(quizSessionsTable)
      .where(eq(quizSessionsTable.id, result.id))
      .execute();

    expect(sessions).toHaveLength(1);
    const session = sessions[0];
    expect(session.user_id).toEqual(testUserId);
    expect(session.quiz_package_id).toEqual(testQuizPackageId);
    expect(session.time_remaining_seconds).toEqual(120 * 60);
    expect(session.total_questions).toEqual(2);
    expect(session.is_completed).toBe(false);
    expect(session.started_at).toBeInstanceOf(Date);
  });

  it('should calculate time remaining based on quiz package time limit', async () => {
    // Create a quiz package with different time limit
    const customPackageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Custom Time Quiz',
        description: 'Quiz with custom time limit',
        time_limit_minutes: 90, // 90 minutes instead of 120
        total_questions: 50,
        is_active: true,
        created_by: testUserId
      })
      .returning()
      .execute();

    // Add at least one question to the custom package
    await db.insert(questionsTable)
      .values({
        quiz_package_id: customPackageResult[0].id,
        question_text: 'Test question',
        option_a: 'A',
        option_b: 'B',
        option_c: 'C',
        option_d: 'D',
        option_e: 'E',
        correct_answer: 'A',
        order_number: 1
      })
      .execute();

    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: customPackageResult[0].id
    };

    const result = await startQuizSession(input);

    expect(result.time_remaining_seconds).toEqual(90 * 60); // 90 minutes in seconds
  });

  it('should count questions correctly from quiz package', async () => {
    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: testQuizPackageId
    };

    const result = await startQuizSession(input);

    // We created 2 questions for the test quiz package
    expect(result.total_questions).toEqual(2);
  });

  it('should throw error when user does not exist', async () => {
    const input: StartQuizSessionInput = {
      user_id: 99999, // Non-existent user ID
      quiz_package_id: testQuizPackageId
    };

    await expect(startQuizSession(input)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should throw error when quiz package does not exist', async () => {
    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: 99999 // Non-existent quiz package ID
    };

    await expect(startQuizSession(input)).rejects.toThrow(/Active quiz package with ID 99999 not found/i);
  });

  it('should throw error when quiz package is inactive', async () => {
    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: inactiveQuizPackageId
    };

    await expect(startQuizSession(input)).rejects.toThrow(/Active quiz package with ID .* not found/i);
  });

  it('should throw error when quiz package has no questions', async () => {
    // Create a quiz package with no questions
    const emptyPackageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Empty Quiz Package',
        description: 'Quiz package with no questions',
        time_limit_minutes: 60,
        total_questions: 0,
        is_active: true,
        created_by: testUserId
      })
      .returning()
      .execute();

    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: emptyPackageResult[0].id
    };

    await expect(startQuizSession(input)).rejects.toThrow(/Quiz package with ID .* has no questions/i);
  });

  it('should handle multiple sessions for same user', async () => {
    const input: StartQuizSessionInput = {
      user_id: testUserId,
      quiz_package_id: testQuizPackageId
    };

    // Create first session
    const session1 = await startQuizSession(input);

    // Create second session for same user and quiz package
    const session2 = await startQuizSession(input);

    // Both sessions should be created successfully with different IDs
    expect(session1.id).not.toEqual(session2.id);
    expect(session1.user_id).toEqual(session2.user_id);
    expect(session1.quiz_package_id).toEqual(session2.quiz_package_id);

    // Verify both sessions exist in database
    const sessions = await db.select()
      .from(quizSessionsTable)
      .where(eq(quizSessionsTable.user_id, testUserId))
      .execute();

    expect(sessions).toHaveLength(2);
  });
});