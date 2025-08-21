import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, quizSessionsTable } from '../db/schema';
import { getActiveQuizSession } from '../handlers/get_active_quiz_session';

describe('getActiveQuizSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when user has no quiz sessions', async () => {
    // Create a user
    const userResults = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    const result = await getActiveQuizSession(userId);
    expect(result).toBeNull();
  });

  it('should return null when user has only completed quiz sessions', async () => {
    // Create a user
    const userResults = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create a quiz package
    const quizResults = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit_minutes: 60,
        total_questions: 10,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const quizPackageId = quizResults[0].id;

    // Create completed quiz session
    await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: quizPackageId,
        time_remaining_seconds: 0,
        total_score: 80,
        total_correct: 8,
        total_questions: 10,
        is_completed: true,
        completed_at: new Date()
      })
      .execute();

    const result = await getActiveQuizSession(userId);
    expect(result).toBeNull();
  });

  it('should return active quiz session when user has incomplete session', async () => {
    // Create a user
    const userResults = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create a quiz package
    const quizResults = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit_minutes: 60,
        total_questions: 10,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const quizPackageId = quizResults[0].id;

    // Create active quiz session
    const sessionResults = await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: quizPackageId,
        time_remaining_seconds: 1800,
        total_questions: 10,
        is_completed: false
      })
      .returning()
      .execute();

    const expectedSessionId = sessionResults[0].id;

    const result = await getActiveQuizSession(userId);
    
    expect(result).not.toBeNull();
    expect(result?.id).toEqual(expectedSessionId);
    expect(result?.user_id).toEqual(userId);
    expect(result?.quiz_package_id).toEqual(quizPackageId);
    expect(result?.time_remaining_seconds).toEqual(1800);
    expect(result?.total_questions).toEqual(10);
    expect(result?.is_completed).toEqual(false);
    expect(result?.total_score).toBeNull();
    expect(result?.total_correct).toBeNull();
    expect(result?.completed_at).toBeNull();
    expect(result?.started_at).toBeInstanceOf(Date);
  });

  it('should return most recent active session when user has multiple incomplete sessions', async () => {
    // Create a user
    const userResults = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create a quiz package
    const quizResults = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit_minutes: 60,
        total_questions: 10,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const quizPackageId = quizResults[0].id;

    // Create first active session (older)
    const now = new Date();
    const olderTime = new Date(now.getTime() - 3600000); // 1 hour ago

    await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: quizPackageId,
        started_at: olderTime,
        time_remaining_seconds: 1200,
        total_questions: 10,
        is_completed: false
      })
      .execute();

    // Create second active session (more recent) 
    const recentSessionResults = await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: quizPackageId,
        started_at: now,
        time_remaining_seconds: 1800,
        total_questions: 10,
        is_completed: false
      })
      .returning()
      .execute();

    const expectedSessionId = recentSessionResults[0].id;

    const result = await getActiveQuizSession(userId);
    
    expect(result).not.toBeNull();
    expect(result?.id).toEqual(expectedSessionId);
    expect(result?.time_remaining_seconds).toEqual(1800);
  });

  it('should not return other users active sessions', async () => {
    // Create two users
    const user1Results = await db.insert(usersTable)
      .values({
        username: 'user1',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const user2Results = await db.insert(usersTable)
      .values({
        username: 'user2',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const user1Id = user1Results[0].id;
    const user2Id = user2Results[0].id;

    // Create a quiz package
    const quizResults = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit_minutes: 60,
        total_questions: 10,
        is_active: true,
        created_by: user1Id
      })
      .returning()
      .execute();

    const quizPackageId = quizResults[0].id;

    // Create active session for user2
    await db.insert(quizSessionsTable)
      .values({
        user_id: user2Id,
        quiz_package_id: quizPackageId,
        time_remaining_seconds: 1800,
        total_questions: 10,
        is_completed: false
      })
      .execute();

    // Query for user1's active session
    const result = await getActiveQuizSession(user1Id);
    expect(result).toBeNull();
  });

  it('should handle mixed completed and incomplete sessions correctly', async () => {
    // Create a user
    const userResults = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create a quiz package
    const quizResults = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz',
        time_limit_minutes: 60,
        total_questions: 10,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const quizPackageId = quizResults[0].id;

    // Create completed session
    await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: quizPackageId,
        time_remaining_seconds: 0,
        total_score: 70,
        total_correct: 7,
        total_questions: 10,
        is_completed: true,
        completed_at: new Date()
      })
      .execute();

    // Create active session
    const activeSessionResults = await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: quizPackageId,
        time_remaining_seconds: 1500,
        total_questions: 10,
        is_completed: false
      })
      .returning()
      .execute();

    const expectedSessionId = activeSessionResults[0].id;

    const result = await getActiveQuizSession(userId);
    
    expect(result).not.toBeNull();
    expect(result?.id).toEqual(expectedSessionId);
    expect(result?.is_completed).toEqual(false);
    expect(result?.time_remaining_seconds).toEqual(1500);
  });
});