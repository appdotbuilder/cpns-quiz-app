import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable, quizSessionsTable, userAnswersTable } from '../db/schema';
import { getQuizResultDetails } from '../handlers/get_quiz_result_details';

describe('getQuizResultDetails', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return detailed quiz results for a completed session', async () => {
        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password123',
                role: 'user'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create test quiz package
        const quizPackageResult = await db.insert(quizPackagesTable)
            .values({
                title: 'Test Quiz Package',
                description: 'A test quiz package',
                time_limit_minutes: 60,
                total_questions: 2,
                is_active: true,
                created_by: userId
            })
            .returning()
            .execute();
        const quizPackageId = quizPackageResult[0].id;

        // Create test questions
        const questionsResult = await db.insert(questionsTable)
            .values([
                {
                    quiz_package_id: quizPackageId,
                    question_text: 'What is 2+2?',
                    option_a: '3',
                    option_b: '4',
                    option_c: '5',
                    option_d: '6',
                    option_e: '7',
                    correct_answer: 'B',
                    explanation: 'Basic arithmetic: 2+2=4',
                    order_number: 1
                },
                {
                    quiz_package_id: quizPackageId,
                    question_text: 'What is the capital of France?',
                    option_a: 'London',
                    option_b: 'Berlin',
                    option_c: 'Paris',
                    option_d: 'Madrid',
                    option_e: 'Rome',
                    correct_answer: 'C',
                    explanation: 'Paris is the capital of France',
                    order_number: 2
                }
            ])
            .returning()
            .execute();

        // Create completed quiz session
        const sessionResult = await db.insert(quizSessionsTable)
            .values({
                user_id: userId,
                quiz_package_id: quizPackageId,
                started_at: new Date('2024-01-01T10:00:00Z'),
                completed_at: new Date('2024-01-01T10:30:00Z'),
                time_remaining_seconds: 1800, // 30 minutes remaining
                total_score: 50, // 1 out of 2 correct = 50%
                total_correct: 1,
                total_questions: 2,
                is_completed: true
            })
            .returning()
            .execute();
        const sessionId = sessionResult[0].id;

        // Create user answers
        await db.insert(userAnswersTable)
            .values([
                {
                    session_id: sessionId,
                    question_id: questionsResult[0].id,
                    selected_answer: 'B',
                    is_correct: true,
                    answered_at: new Date('2024-01-01T10:15:00Z')
                },
                {
                    session_id: sessionId,
                    question_id: questionsResult[1].id,
                    selected_answer: 'A',
                    is_correct: false,
                    answered_at: new Date('2024-01-01T10:25:00Z')
                }
            ])
            .execute();

        // Test the handler
        const result = await getQuizResultDetails(sessionId);

        // Verify basic quiz result properties
        expect(result).toBeDefined();
        expect(result!.session_id).toBe(sessionId);
        expect(result!.user_id).toBe(userId);
        expect(result!.quiz_package_title).toBe('Test Quiz Package');
        expect(result!.total_questions).toBe(2);
        expect(result!.total_correct).toBe(1);
        expect(result!.total_score).toBe(50);
        expect(result!.completion_time_minutes).toBe(30);
        expect(result!.completed_at).toBeInstanceOf(Date);

        // Verify answers array
        expect(result!.answers).toHaveLength(2);
        
        // Check first answer (correct)
        const firstAnswer = result!.answers.find(a => a.question.order_number === 1);
        expect(firstAnswer).toBeDefined();
        expect(firstAnswer!.question.question_text).toBe('What is 2+2?');
        expect(firstAnswer!.question.correct_answer).toBe('B');
        expect(firstAnswer!.question.explanation).toBe('Basic arithmetic: 2+2=4');
        expect(firstAnswer!.userAnswer.selected_answer).toBe('B');
        expect(firstAnswer!.userAnswer.is_correct).toBe(true);

        // Check second answer (incorrect)
        const secondAnswer = result!.answers.find(a => a.question.order_number === 2);
        expect(secondAnswer).toBeDefined();
        expect(secondAnswer!.question.question_text).toBe('What is the capital of France?');
        expect(secondAnswer!.question.correct_answer).toBe('C');
        expect(secondAnswer!.question.explanation).toBe('Paris is the capital of France');
        expect(secondAnswer!.userAnswer.selected_answer).toBe('A');
        expect(secondAnswer!.userAnswer.is_correct).toBe(false);
    });

    it('should return null for non-existent session', async () => {
        const result = await getQuizResultDetails(999999);
        expect(result).toBeNull();
    });

    it('should return null for incomplete session', async () => {
        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password123',
                role: 'user'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create test quiz package
        const quizPackageResult = await db.insert(quizPackagesTable)
            .values({
                title: 'Test Quiz Package',
                description: 'A test quiz package',
                time_limit_minutes: 60,
                total_questions: 1,
                is_active: true,
                created_by: userId
            })
            .returning()
            .execute();
        const quizPackageId = quizPackageResult[0].id;

        // Create incomplete quiz session (not completed)
        const sessionResult = await db.insert(quizSessionsTable)
            .values({
                user_id: userId,
                quiz_package_id: quizPackageId,
                started_at: new Date(),
                time_remaining_seconds: 3600,
                total_questions: 1,
                is_completed: false // Not completed
            })
            .returning()
            .execute();
        const sessionId = sessionResult[0].id;

        const result = await getQuizResultDetails(sessionId);
        expect(result).toBeNull();
    });

    it('should return null for completed session without score data', async () => {
        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password123',
                role: 'user'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create test quiz package
        const quizPackageResult = await db.insert(quizPackagesTable)
            .values({
                title: 'Test Quiz Package',
                description: 'A test quiz package',
                time_limit_minutes: 60,
                total_questions: 1,
                is_active: true,
                created_by: userId
            })
            .returning()
            .execute();
        const quizPackageId = quizPackageResult[0].id;

        // Create completed session but without score data
        const sessionResult = await db.insert(quizSessionsTable)
            .values({
                user_id: userId,
                quiz_package_id: quizPackageId,
                started_at: new Date(),
                completed_at: new Date(),
                time_remaining_seconds: 1800,
                // total_score and total_correct are null
                total_questions: 1,
                is_completed: true
            })
            .returning()
            .execute();
        const sessionId = sessionResult[0].id;

        const result = await getQuizResultDetails(sessionId);
        expect(result).toBeNull();
    });

    it('should handle session with no answers correctly', async () => {
        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password123',
                role: 'user'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create test quiz package
        const quizPackageResult = await db.insert(quizPackagesTable)
            .values({
                title: 'Empty Quiz Package',
                description: 'A quiz package with no questions',
                time_limit_minutes: 60,
                total_questions: 0,
                is_active: true,
                created_by: userId
            })
            .returning()
            .execute();
        const quizPackageId = quizPackageResult[0].id;

        // Create completed quiz session with zero questions
        const sessionResult = await db.insert(quizSessionsTable)
            .values({
                user_id: userId,
                quiz_package_id: quizPackageId,
                started_at: new Date('2024-01-01T10:00:00Z'),
                completed_at: new Date('2024-01-01T10:05:00Z'),
                time_remaining_seconds: 3300,
                total_score: 0,
                total_correct: 0,
                total_questions: 0,
                is_completed: true
            })
            .returning()
            .execute();
        const sessionId = sessionResult[0].id;

        const result = await getQuizResultDetails(sessionId);

        expect(result).toBeDefined();
        expect(result!.session_id).toBe(sessionId);
        expect(result!.total_questions).toBe(0);
        expect(result!.total_correct).toBe(0);
        expect(result!.total_score).toBe(0);
        expect(result!.completion_time_minutes).toBe(5);
        expect(result!.answers).toHaveLength(0);
    });

    it('should calculate completion time correctly for different durations', async () => {
        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password123',
                role: 'user'
            })
            .returning()
            .execute();
        const userId = userResult[0].id;

        // Create test quiz package
        const quizPackageResult = await db.insert(quizPackagesTable)
            .values({
                title: 'Test Quiz Package',
                description: 'A test quiz package',
                time_limit_minutes: 120,
                total_questions: 1,
                is_active: true,
                created_by: userId
            })
            .returning()
            .execute();
        const quizPackageId = quizPackageResult[0].id;

        // Create completed quiz session that took 75.3 minutes (should round to 75)
        const sessionResult = await db.insert(quizSessionsTable)
            .values({
                user_id: userId,
                quiz_package_id: quizPackageId,
                started_at: new Date('2024-01-01T10:00:00Z'),
                completed_at: new Date('2024-01-01T11:15:18Z'), // 75 minutes and 18 seconds later
                time_remaining_seconds: 2700,
                total_score: 100,
                total_correct: 1,
                total_questions: 1,
                is_completed: true
            })
            .returning()
            .execute();
        const sessionId = sessionResult[0].id;

        const result = await getQuizResultDetails(sessionId);

        expect(result).toBeDefined();
        expect(result!.completion_time_minutes).toBe(75);
    });
});