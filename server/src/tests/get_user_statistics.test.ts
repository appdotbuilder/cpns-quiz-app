import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
    usersTable, 
    quizPackagesTable, 
    questionsTable, 
    quizSessionsTable, 
    userAnswersTable 
} from '../db/schema';
import { getUserStatistics } from '../handlers/get_user_statistics';

describe('getUserStatistics', () => {
    beforeEach(createDB);
    afterEach(resetDB);

    it('should return zero statistics for user with no quiz sessions', async () => {
        // Create a user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password',
                role: 'user'
            })
            .returning()
            .execute();

        const user = userResult[0];
        const stats = await getUserStatistics(user.id);

        expect(stats.user_id).toEqual(user.id);
        expect(stats.total_quizzes_taken).toEqual(0);
        expect(stats.total_questions_answered).toEqual(0);
        expect(stats.total_correct_answers).toEqual(0);
        expect(stats.average_score).toEqual(0);
        expect(stats.best_score).toEqual(0);
        expect(stats.total_time_spent_minutes).toEqual(0);
        expect(stats.last_quiz_date).toBeNull();
    });

    it('should return statistics for user with completed quiz sessions', async () => {
        // Create admin user for quiz package creation
        const adminResult = await db.insert(usersTable)
            .values({
                username: 'admin',
                password: 'password',
                role: 'admin'
            })
            .returning()
            .execute();
        const admin = adminResult[0];

        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password',
                role: 'user'
            })
            .returning()
            .execute();
        const user = userResult[0];

        // Create quiz package
        const packageResult = await db.insert(quizPackagesTable)
            .values({
                title: 'Test Quiz Package',
                description: 'A test quiz package',
                time_limit_minutes: 60,
                total_questions: 3,
                created_by: admin.id
            })
            .returning()
            .execute();
        const quizPackage = packageResult[0];

        // Create questions
        const questionResults = await db.insert(questionsTable)
            .values([
                {
                    quiz_package_id: quizPackage.id,
                    question_text: 'Question 1',
                    option_a: 'A',
                    option_b: 'B',
                    option_c: 'C',
                    option_d: 'D',
                    option_e: 'E',
                    correct_answer: 'A',
                    order_number: 1
                },
                {
                    quiz_package_id: quizPackage.id,
                    question_text: 'Question 2',
                    option_a: 'A',
                    option_b: 'B',
                    option_c: 'C',
                    option_d: 'D',
                    option_e: 'E',
                    correct_answer: 'B',
                    order_number: 2
                },
                {
                    quiz_package_id: quizPackage.id,
                    question_text: 'Question 3',
                    option_a: 'A',
                    option_b: 'B',
                    option_c: 'C',
                    option_d: 'D',
                    option_e: 'E',
                    correct_answer: 'C',
                    order_number: 3
                }
            ])
            .returning()
            .execute();

        // Create completed quiz sessions
        const session1Result = await db.insert(quizSessionsTable)
            .values({
                user_id: user.id,
                quiz_package_id: quizPackage.id,
                time_remaining_seconds: 1800, // 30 minutes remaining
                total_score: 80,
                total_correct: 2,
                total_questions: 3,
                is_completed: true,
                completed_at: new Date('2024-01-01T10:00:00Z')
            })
            .returning()
            .execute();
        const session1 = session1Result[0];

        const session2Result = await db.insert(quizSessionsTable)
            .values({
                user_id: user.id,
                quiz_package_id: quizPackage.id,
                time_remaining_seconds: 2400, // 40 minutes remaining
                total_score: 90,
                total_correct: 3,
                total_questions: 3,
                is_completed: true,
                completed_at: new Date('2024-01-02T10:00:00Z')
            })
            .returning()
            .execute();
        const session2 = session2Result[0];

        // Create user answers for session 1
        await db.insert(userAnswersTable)
            .values([
                {
                    session_id: session1.id,
                    question_id: questionResults[0].id,
                    selected_answer: 'A',
                    is_correct: true
                },
                {
                    session_id: session1.id,
                    question_id: questionResults[1].id,
                    selected_answer: 'A', // Wrong answer
                    is_correct: false
                },
                {
                    session_id: session1.id,
                    question_id: questionResults[2].id,
                    selected_answer: 'C',
                    is_correct: true
                }
            ])
            .execute();

        // Create user answers for session 2
        await db.insert(userAnswersTable)
            .values([
                {
                    session_id: session2.id,
                    question_id: questionResults[0].id,
                    selected_answer: 'A',
                    is_correct: true
                },
                {
                    session_id: session2.id,
                    question_id: questionResults[1].id,
                    selected_answer: 'B',
                    is_correct: true
                },
                {
                    session_id: session2.id,
                    question_id: questionResults[2].id,
                    selected_answer: 'C',
                    is_correct: true
                }
            ])
            .execute();

        const stats = await getUserStatistics(user.id);

        expect(stats.user_id).toEqual(user.id);
        expect(stats.total_quizzes_taken).toEqual(2);
        expect(stats.total_questions_answered).toEqual(6); // 3 questions × 2 sessions
        expect(stats.total_correct_answers).toEqual(5); // 2 correct in session1 + 3 correct in session2
        expect(stats.average_score).toEqual(85); // (80 + 90) / 2
        expect(stats.best_score).toEqual(90);
        expect(stats.total_time_spent_minutes).toEqual(70); // (1800 + 2400) / 60 seconds
        expect(stats.last_quiz_date).toEqual(new Date('2024-01-02T10:00:00Z'));
    });

    it('should only count completed quiz sessions', async () => {
        // Create admin user
        const adminResult = await db.insert(usersTable)
            .values({
                username: 'admin',
                password: 'password',
                role: 'admin'
            })
            .returning()
            .execute();
        const admin = adminResult[0];

        // Create test user
        const userResult = await db.insert(usersTable)
            .values({
                username: 'testuser',
                password: 'password',
                role: 'user'
            })
            .returning()
            .execute();
        const user = userResult[0];

        // Create quiz package
        const packageResult = await db.insert(quizPackagesTable)
            .values({
                title: 'Test Quiz Package',
                description: 'A test quiz package',
                time_limit_minutes: 60,
                total_questions: 2,
                created_by: admin.id
            })
            .returning()
            .execute();
        const quizPackage = packageResult[0];

        // Create questions
        const questionResults = await db.insert(questionsTable)
            .values([
                {
                    quiz_package_id: quizPackage.id,
                    question_text: 'Question 1',
                    option_a: 'A',
                    option_b: 'B',
                    option_c: 'C',
                    option_d: 'D',
                    option_e: 'E',
                    correct_answer: 'A',
                    order_number: 1
                },
                {
                    quiz_package_id: quizPackage.id,
                    question_text: 'Question 2',
                    option_a: 'A',
                    option_b: 'B',
                    option_c: 'C',
                    option_d: 'D',
                    option_e: 'E',
                    correct_answer: 'B',
                    order_number: 2
                }
            ])
            .returning()
            .execute();

        // Create one completed session
        const completedSessionResult = await db.insert(quizSessionsTable)
            .values({
                user_id: user.id,
                quiz_package_id: quizPackage.id,
                time_remaining_seconds: 1800,
                total_score: 75,
                total_correct: 1,
                total_questions: 2,
                is_completed: true,
                completed_at: new Date('2024-01-01T10:00:00Z')
            })
            .returning()
            .execute();
        const completedSession = completedSessionResult[0];

        // Create one incomplete session (should be ignored)
        await db.insert(quizSessionsTable)
            .values({
                user_id: user.id,
                quiz_package_id: quizPackage.id,
                time_remaining_seconds: 2400,
                total_score: null,
                total_correct: null,
                total_questions: 2,
                is_completed: false,
                completed_at: null
            })
            .execute();

        // Create answers only for completed session
        await db.insert(userAnswersTable)
            .values([
                {
                    session_id: completedSession.id,
                    question_id: questionResults[0].id,
                    selected_answer: 'A',
                    is_correct: true
                },
                {
                    session_id: completedSession.id,
                    question_id: questionResults[1].id,
                    selected_answer: 'A', // Wrong answer
                    is_correct: false
                }
            ])
            .execute();

        const stats = await getUserStatistics(user.id);

        expect(stats.total_quizzes_taken).toEqual(1); // Only completed session counted
        expect(stats.total_questions_answered).toEqual(2);
        expect(stats.total_correct_answers).toEqual(1);
        expect(stats.average_score).toEqual(75);
        expect(stats.best_score).toEqual(75);
    });

    it('should handle user with no quiz data gracefully', async () => {
        const nonExistentUserId = 999;
        const stats = await getUserStatistics(nonExistentUserId);

        expect(stats.user_id).toEqual(nonExistentUserId);
        expect(stats.total_quizzes_taken).toEqual(0);
        expect(stats.total_questions_answered).toEqual(0);
        expect(stats.total_correct_answers).toEqual(0);
        expect(stats.average_score).toEqual(0);
        expect(stats.best_score).toEqual(0);
        expect(stats.total_time_spent_minutes).toEqual(0);
        expect(stats.last_quiz_date).toBeNull();
    });
});