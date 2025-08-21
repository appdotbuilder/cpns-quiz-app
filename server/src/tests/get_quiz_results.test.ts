import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, quizSessionsTable } from '../db/schema';
import { getQuizResults } from '../handlers/get_quiz_results';

describe('getQuizResults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no completed quiz sessions', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const results = await getQuizResults(users[0].id);

    expect(results).toEqual([]);
  });

  it('should return completed quiz results for a user', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a quiz package
    const packages = await db.insert(quizPackagesTable)
      .values({
        title: 'CPNS Practice Test',
        description: 'Practice test for civil service exam',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const packageId = packages[0].id;

    // Create completed quiz sessions
    const startTime = new Date('2024-01-01T10:00:00Z');
    const endTime = new Date('2024-01-01T11:30:00Z'); // 90 minutes later

    const sessions = await db.insert(quizSessionsTable)
      .values([
        {
          user_id: userId,
          quiz_package_id: packageId,
          started_at: startTime,
          completed_at: endTime,
          time_remaining_seconds: 1800, // 30 minutes remaining
          total_score: 85,
          total_correct: 85,
          total_questions: 110,
          is_completed: true
        },
        {
          user_id: userId,
          quiz_package_id: packageId,
          started_at: new Date('2024-01-02T10:00:00Z'),
          completed_at: new Date('2024-01-02T12:00:00Z'), // 120 minutes later
          time_remaining_seconds: 0,
          total_score: 92,
          total_correct: 92,
          total_questions: 110,
          is_completed: true
        }
      ])
      .returning()
      .execute();

    const results = await getQuizResults(userId);

    expect(results).toHaveLength(2);

    // Should be ordered by completion date (most recent first)
    expect(results[0].session_id).toBe(sessions[1].id);
    expect(results[1].session_id).toBe(sessions[0].id);

    // Check first result (most recent)
    expect(results[0].user_id).toBe(userId);
    expect(results[0].quiz_package_title).toBe('CPNS Practice Test');
    expect(results[0].total_questions).toBe(110);
    expect(results[0].total_correct).toBe(92);
    expect(results[0].total_score).toBe(92);
    expect(results[0].completion_time_minutes).toBe(120);
    expect(results[0].completed_at).toEqual(new Date('2024-01-02T12:00:00Z'));

    // Check second result
    expect(results[1].user_id).toBe(userId);
    expect(results[1].quiz_package_title).toBe('CPNS Practice Test');
    expect(results[1].total_questions).toBe(110);
    expect(results[1].total_correct).toBe(85);
    expect(results[1].total_score).toBe(85);
    expect(results[1].completion_time_minutes).toBe(90);
    expect(results[1].completed_at).toEqual(endTime);
  });

  it('should not return incomplete quiz sessions', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a quiz package
    const packages = await db.insert(quizPackagesTable)
      .values({
        title: 'CPNS Practice Test',
        description: 'Practice test for civil service exam',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const packageId = packages[0].id;

    // Create both completed and incomplete sessions
    await db.insert(quizSessionsTable)
      .values([
        {
          user_id: userId,
          quiz_package_id: packageId,
          started_at: new Date(),
          completed_at: new Date(),
          time_remaining_seconds: 0,
          total_score: 85,
          total_correct: 85,
          total_questions: 110,
          is_completed: true
        },
        {
          user_id: userId,
          quiz_package_id: packageId,
          started_at: new Date(),
          completed_at: null,
          time_remaining_seconds: 3600,
          total_score: null,
          total_correct: null,
          total_questions: 110,
          is_completed: false
        }
      ])
      .execute();

    const results = await getQuizResults(userId);

    // Should only return the completed session
    expect(results).toHaveLength(1);
    expect(results[0].total_score).toBe(85);
  });

  it('should not return results for other users', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          password: 'password123',
          role: 'user'
        },
        {
          username: 'user2',
          password: 'password123',
          role: 'admin'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create a quiz package
    const packages = await db.insert(quizPackagesTable)
      .values({
        title: 'CPNS Practice Test',
        description: 'Practice test for civil service exam',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: user2Id
      })
      .returning()
      .execute();

    const packageId = packages[0].id;

    // Create sessions for both users
    await db.insert(quizSessionsTable)
      .values([
        {
          user_id: user1Id,
          quiz_package_id: packageId,
          started_at: new Date(),
          completed_at: new Date(),
          time_remaining_seconds: 0,
          total_score: 85,
          total_correct: 85,
          total_questions: 110,
          is_completed: true
        },
        {
          user_id: user2Id,
          quiz_package_id: packageId,
          started_at: new Date(),
          completed_at: new Date(),
          time_remaining_seconds: 0,
          total_score: 92,
          total_correct: 92,
          total_questions: 110,
          is_completed: true
        }
      ])
      .execute();

    // Get results for user1
    const user1Results = await getQuizResults(user1Id);
    expect(user1Results).toHaveLength(1);
    expect(user1Results[0].user_id).toBe(user1Id);
    expect(user1Results[0].total_score).toBe(85);

    // Get results for user2
    const user2Results = await getQuizResults(user2Id);
    expect(user2Results).toHaveLength(1);
    expect(user2Results[0].user_id).toBe(user2Id);
    expect(user2Results[0].total_score).toBe(92);
  });

  it('should handle null values correctly', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a quiz package
    const packages = await db.insert(quizPackagesTable)
      .values({
        title: 'CPNS Practice Test',
        description: 'Practice test for civil service exam',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const packageId = packages[0].id;

    // Create a completed session with null scores
    await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: packageId,
        started_at: new Date(),
        completed_at: new Date(),
        time_remaining_seconds: 0,
        total_score: null,
        total_correct: null,
        total_questions: 110,
        is_completed: true
      })
      .execute();

    const results = await getQuizResults(userId);

    expect(results).toHaveLength(1);
    expect(results[0].total_score).toBe(0);
    expect(results[0].total_correct).toBe(0);
  });

  it('should calculate completion time correctly', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a quiz package
    const packages = await db.insert(quizPackagesTable)
      .values({
        title: 'CPNS Practice Test',
        description: 'Practice test for civil service exam',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const packageId = packages[0].id;

    // Create a session with specific start and end times
    const startTime = new Date('2024-01-01T10:00:00Z');
    const endTime = new Date('2024-01-01T10:45:30Z'); // 45.5 minutes later

    await db.insert(quizSessionsTable)
      .values({
        user_id: userId,
        quiz_package_id: packageId,
        started_at: startTime,
        completed_at: endTime,
        time_remaining_seconds: 2070, // 34.5 minutes remaining
        total_score: 75,
        total_correct: 75,
        total_questions: 110,
        is_completed: true
      })
      .execute();

    const results = await getQuizResults(userId);

    expect(results).toHaveLength(1);
    expect(results[0].completion_time_minutes).toBe(46); // Rounded to 46 minutes
  });
});