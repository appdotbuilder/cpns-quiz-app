import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable, quizSessionsTable, userAnswersTable } from '../db/schema';
import { type CompleteQuizSessionInput } from '../schema';
import { completeQuizSession } from '../handlers/complete_quiz_session';
import { eq } from 'drizzle-orm';

describe('completeQuizSession', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Create a test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Test CPNS Quiz',
        description: 'Test quiz for CPNS preparation',
        time_limit_minutes: 120,
        total_questions: 3,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();
    const quizPackage = quizPackageResult[0];

    // Create test questions
    const questionsData = [
      {
        quiz_package_id: quizPackage.id,
        question_text: 'What is 2 + 2?',
        option_a: '3',
        option_b: '4',
        option_c: '5',
        option_d: '6',
        option_e: '7',
        correct_answer: 'B' as const,
        explanation: 'Basic arithmetic',
        order_number: 1
      },
      {
        quiz_package_id: quizPackage.id,
        question_text: 'What is the capital of Indonesia?',
        option_a: 'Jakarta',
        option_b: 'Surabaya',
        option_c: 'Bandung',
        option_d: 'Medan',
        option_e: 'Yogyakarta',
        correct_answer: 'A' as const,
        explanation: 'Jakarta is the capital city',
        order_number: 2
      },
      {
        quiz_package_id: quizPackage.id,
        question_text: 'What is 5 * 3?',
        option_a: '12',
        option_b: '13',
        option_c: '14',
        option_d: '15',
        option_e: '16',
        correct_answer: 'D' as const,
        explanation: 'Multiplication result',
        order_number: 3
      }
    ];

    const questionsResult = await db.insert(questionsTable)
      .values(questionsData)
      .returning()
      .execute();

    // Create a quiz session
    const sessionResult = await db.insert(quizSessionsTable)
      .values({
        user_id: user.id,
        quiz_package_id: quizPackage.id,
        time_remaining_seconds: 3600, // 1 hour remaining
        total_questions: 3,
        is_completed: false
      })
      .returning()
      .execute();

    return {
      user,
      quizPackage,
      questions: questionsResult,
      session: sessionResult[0]
    };
  };

  it('should complete quiz session with all correct answers', async () => {
    const { questions, session } = await createTestData();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: [
        { question_id: questions[0].id, selected_answer: 'B' }, // Correct
        { question_id: questions[1].id, selected_answer: 'A' }, // Correct
        { question_id: questions[2].id, selected_answer: 'D' }  // Correct
      ]
    };

    const result = await completeQuizSession(input);

    // Validate result structure
    expect(result.session_id).toEqual(session.id);
    expect(result.user_id).toEqual(session.user_id);
    expect(result.quiz_package_title).toEqual('Test CPNS Quiz');
    expect(result.total_questions).toEqual(3);
    expect(result.total_correct).toEqual(3);
    expect(result.total_score).toEqual(100);
    expect(typeof result.completion_time_minutes).toEqual('number');
    expect(result.completed_at).toBeInstanceOf(Date);
  });

  it('should complete quiz session with mixed correct/incorrect answers', async () => {
    const { questions, session } = await createTestData();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: [
        { question_id: questions[0].id, selected_answer: 'B' }, // Correct
        { question_id: questions[1].id, selected_answer: 'B' }, // Incorrect (correct is A)
        { question_id: questions[2].id, selected_answer: 'A' }  // Incorrect (correct is D)
      ]
    };

    const result = await completeQuizSession(input);

    // Should have 1 correct out of 3, which is 33% (rounded)
    expect(result.total_correct).toEqual(1);
    expect(result.total_score).toEqual(33);
    expect(result.total_questions).toEqual(3);
  });

  it('should save user answers to database correctly', async () => {
    const { questions, session } = await createTestData();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: [
        { question_id: questions[0].id, selected_answer: 'B' }, // Correct
        { question_id: questions[1].id, selected_answer: 'B' }, // Incorrect
        { question_id: questions[2].id, selected_answer: 'D' }  // Correct
      ]
    };

    await completeQuizSession(input);

    // Verify user answers were saved
    const savedAnswers = await db.select()
      .from(userAnswersTable)
      .where(eq(userAnswersTable.session_id, session.id))
      .execute();

    expect(savedAnswers).toHaveLength(3);

    // Check specific answer correctness
    const answer1 = savedAnswers.find(a => a.question_id === questions[0].id);
    const answer2 = savedAnswers.find(a => a.question_id === questions[1].id);
    const answer3 = savedAnswers.find(a => a.question_id === questions[2].id);

    expect(answer1?.selected_answer).toEqual('B');
    expect(answer1?.is_correct).toBe(true);

    expect(answer2?.selected_answer).toEqual('B');
    expect(answer2?.is_correct).toBe(false);

    expect(answer3?.selected_answer).toEqual('D');
    expect(answer3?.is_correct).toBe(true);
  });

  it('should update quiz session with completion data', async () => {
    const { questions, session } = await createTestData();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: [
        { question_id: questions[0].id, selected_answer: 'A' }, // Incorrect
        { question_id: questions[1].id, selected_answer: 'A' }, // Correct
        { question_id: questions[2].id, selected_answer: 'D' }  // Correct
      ]
    };

    await completeQuizSession(input);

    // Verify session was updated
    const updatedSession = await db.select()
      .from(quizSessionsTable)
      .where(eq(quizSessionsTable.id, session.id))
      .execute();

    expect(updatedSession).toHaveLength(1);
    expect(updatedSession[0].is_completed).toBe(true);
    expect(updatedSession[0].total_correct).toEqual(2);
    expect(updatedSession[0].total_score).toEqual(67); // 2/3 = 66.67% rounded to 67
    expect(updatedSession[0].completed_at).toBeInstanceOf(Date);
    expect(updatedSession[0].time_remaining_seconds).toEqual(0);
  });

  it('should calculate completion time correctly', async () => {
    const { questions, session } = await createTestData();

    // Mock a session that started 30 minutes ago
    const thirtyMinutesAgo = new Date(Date.now() - (30 * 60 * 1000));
    await db.update(quizSessionsTable)
      .set({ started_at: thirtyMinutesAgo })
      .where(eq(quizSessionsTable.id, session.id))
      .execute();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: [
        { question_id: questions[0].id, selected_answer: 'B' },
        { question_id: questions[1].id, selected_answer: 'A' },
        { question_id: questions[2].id, selected_answer: 'D' }
      ]
    };

    const result = await completeQuizSession(input);

    // Should be approximately 30 minutes (allowing some tolerance for test execution time)
    expect(result.completion_time_minutes).toBeGreaterThanOrEqual(29);
    expect(result.completion_time_minutes).toBeLessThanOrEqual(31);
  });

  it('should throw error for non-existent session', async () => {
    const input: CompleteQuizSessionInput = {
      session_id: 99999, // Non-existent session
      answers: [
        { question_id: 1, selected_answer: 'A' }
      ]
    };

    await expect(completeQuizSession(input)).rejects.toThrow(/session not found/i);
  });

  it('should throw error for already completed session', async () => {
    const { questions, session } = await createTestData();

    // Mark session as already completed
    await db.update(quizSessionsTable)
      .set({ is_completed: true })
      .where(eq(quizSessionsTable.id, session.id))
      .execute();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: [
        { question_id: questions[0].id, selected_answer: 'B' }
      ]
    };

    await expect(completeQuizSession(input)).rejects.toThrow(/already completed/i);
  });

  it('should throw error for question not in quiz package', async () => {
    const { session } = await createTestData();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: [
        { question_id: 99999, selected_answer: 'A' } // Non-existent question
      ]
    };

    await expect(completeQuizSession(input)).rejects.toThrow(/Question 99999 not found/i);
  });

  it('should handle empty answers array', async () => {
    const { session } = await createTestData();

    const input: CompleteQuizSessionInput = {
      session_id: session.id,
      answers: []
    };

    const result = await completeQuizSession(input);

    expect(result.total_correct).toEqual(0);
    expect(result.total_score).toEqual(0);
    expect(result.total_questions).toEqual(3); // Original quiz has 3 questions

    // Verify session is marked as completed
    const updatedSession = await db.select()
      .from(quizSessionsTable)
      .where(eq(quizSessionsTable.id, session.id))
      .execute();

    expect(updatedSession[0].is_completed).toBe(true);
  });
});