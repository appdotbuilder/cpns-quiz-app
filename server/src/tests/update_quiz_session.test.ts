import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, quizSessionsTable } from '../db/schema';
import { type UpdateQuizSessionInput } from '../schema';
import { updateQuizSession } from '../handlers/update_quiz_session';
import { eq } from 'drizzle-orm';

describe('updateQuizSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testQuizPackageId: number;
  let testSessionId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        role: 'user'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz Package',
        description: 'A test quiz package',
        time_limit_minutes: 120,
        total_questions: 50,
        is_active: true,
        created_by: testUserId
      })
      .returning()
      .execute();
    testQuizPackageId = quizPackageResult[0].id;

    // Create test quiz session
    const sessionResult = await db.insert(quizSessionsTable)
      .values({
        user_id: testUserId,
        quiz_package_id: testQuizPackageId,
        time_remaining_seconds: 7200, // 2 hours
        total_questions: 50,
        is_completed: false
      })
      .returning()
      .execute();
    testSessionId = sessionResult[0].id;
  });

  it('should update time remaining seconds', async () => {
    const input: UpdateQuizSessionInput = {
      id: testSessionId,
      time_remaining_seconds: 3600 // 1 hour remaining
    };

    const result = await updateQuizSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.time_remaining_seconds).toEqual(3600);
    expect(result!.is_completed).toBe(false);
    expect(result!.completed_at).toBeNull();
  });

  it('should mark session as completed and set completion timestamp', async () => {
    const input: UpdateQuizSessionInput = {
      id: testSessionId,
      is_completed: true
    };

    const result = await updateQuizSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.is_completed).toBe(true);
    expect(result!.completed_at).toBeInstanceOf(Date);
    expect(result!.completed_at!.getTime()).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds
  });

  it('should update both time remaining and completion status', async () => {
    const input: UpdateQuizSessionInput = {
      id: testSessionId,
      time_remaining_seconds: 0,
      is_completed: true
    };

    const result = await updateQuizSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.time_remaining_seconds).toEqual(0);
    expect(result!.is_completed).toBe(true);
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    const input: UpdateQuizSessionInput = {
      id: testSessionId,
      time_remaining_seconds: 1800, // 30 minutes
      is_completed: false
    };

    await updateQuizSession(input);

    // Query database directly to verify changes were persisted
    const sessions = await db.select()
      .from(quizSessionsTable)
      .where(eq(quizSessionsTable.id, testSessionId))
      .execute();

    expect(sessions).toHaveLength(1);
    expect(sessions[0].time_remaining_seconds).toEqual(1800);
    expect(sessions[0].is_completed).toBe(false);
    expect(sessions[0].started_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent session', async () => {
    const input: UpdateQuizSessionInput = {
      id: 99999, // Non-existent session ID
      time_remaining_seconds: 3600
    };

    const result = await updateQuizSession(input);

    expect(result).toBeNull();
  });

  it('should handle partial updates correctly', async () => {
    // First update - only time remaining
    const input1: UpdateQuizSessionInput = {
      id: testSessionId,
      time_remaining_seconds: 5400 // 1.5 hours
    };

    const result1 = await updateQuizSession(input1);
    expect(result1!.time_remaining_seconds).toEqual(5400);
    expect(result1!.is_completed).toBe(false); // Should remain unchanged

    // Second update - only completion status
    const input2: UpdateQuizSessionInput = {
      id: testSessionId,
      is_completed: true
    };

    const result2 = await updateQuizSession(input2);
    expect(result2!.time_remaining_seconds).toEqual(5400); // Should remain unchanged
    expect(result2!.is_completed).toBe(true);
    expect(result2!.completed_at).toBeInstanceOf(Date);
  });

  it('should not set completed_at when is_completed is false', async () => {
    // First mark as completed
    await updateQuizSession({
      id: testSessionId,
      is_completed: true
    });

    // Then mark as not completed (edge case, but should be handled)
    const input: UpdateQuizSessionInput = {
      id: testSessionId,
      is_completed: false
    };

    const result = await updateQuizSession(input);

    expect(result!.is_completed).toBe(false);
    // completed_at should remain from previous update (not cleared)
    expect(result!.completed_at).toBeInstanceOf(Date);
  });

  it('should handle minimal update with only one field', async () => {
    const input: UpdateQuizSessionInput = {
      id: testSessionId,
      time_remaining_seconds: 900 // 15 minutes
    };

    const result = await updateQuizSession(input);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testSessionId);
    expect(result!.time_remaining_seconds).toEqual(900);
    expect(result!.is_completed).toBe(false); // Should remain unchanged
    expect(result!.completed_at).toBeNull(); // Should remain unchanged
  });
});