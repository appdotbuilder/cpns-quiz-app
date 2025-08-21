import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable } from '../db/schema';
import { type CreateQuestionInput } from '../schema';
import { createQuestion } from '../handlers/create_question';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  username: 'testadmin',
  password: 'password123',
  role: 'admin' as const
};

// Test quiz package data
const testQuizPackage = {
  title: 'Test Quiz Package',
  description: 'A quiz package for testing questions',
  time_limit_minutes: 120,
  total_questions: 0, // Will be updated when questions are added
  is_active: true
};

// Test question input
const testQuestionInput: CreateQuestionInput = {
  quiz_package_id: 0, // Will be set after creating quiz package
  question_text: 'What is the capital of Indonesia?',
  option_a: 'Jakarta',
  option_b: 'Surabaya',
  option_c: 'Bandung',
  option_d: 'Medan',
  option_e: 'Denpasar',
  correct_answer: 'A',
  explanation: 'Jakarta is the capital and largest city of Indonesia.',
  order_number: 1
};

describe('createQuestion', () => {
  let userId: number;
  let quizPackageId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({
        ...testQuizPackage,
        created_by: userId
      })
      .returning()
      .execute();
    quizPackageId = quizPackageResult[0].id;
  });

  afterEach(resetDB);

  it('should create a question successfully', async () => {
    const input = {
      ...testQuestionInput,
      quiz_package_id: quizPackageId
    };

    const result = await createQuestion(input);

    // Validate the returned question
    expect(result.id).toBeDefined();
    expect(result.quiz_package_id).toEqual(quizPackageId);
    expect(result.question_text).toEqual('What is the capital of Indonesia?');
    expect(result.option_a).toEqual('Jakarta');
    expect(result.option_b).toEqual('Surabaya');
    expect(result.option_c).toEqual('Bandung');
    expect(result.option_d).toEqual('Medan');
    expect(result.option_e).toEqual('Denpasar');
    expect(result.correct_answer).toEqual('A');
    expect(result.explanation).toEqual('Jakarta is the capital and largest city of Indonesia.');
    expect(result.order_number).toEqual(1);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save question to database', async () => {
    const input = {
      ...testQuestionInput,
      quiz_package_id: quizPackageId
    };

    const result = await createQuestion(input);

    // Query the database to verify the question was saved
    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, result.id))
      .execute();

    expect(questions).toHaveLength(1);
    const savedQuestion = questions[0];
    expect(savedQuestion.quiz_package_id).toEqual(quizPackageId);
    expect(savedQuestion.question_text).toEqual('What is the capital of Indonesia?');
    expect(savedQuestion.correct_answer).toEqual('A');
    expect(savedQuestion.order_number).toEqual(1);
  });

  it('should update quiz package total_questions count', async () => {
    const input = {
      ...testQuestionInput,
      quiz_package_id: quizPackageId
    };

    // Initially, total_questions should be 0
    let quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();
    expect(quizPackage[0].total_questions).toEqual(0);

    // Create first question
    await createQuestion(input);

    // Check that total_questions is updated to 1
    quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();
    expect(quizPackage[0].total_questions).toEqual(1);

    // Create second question
    await createQuestion({
      ...input,
      question_text: 'What is 2 + 2?',
      option_a: '3',
      option_b: '4',
      option_c: '5',
      option_d: '6',
      option_e: '7',
      correct_answer: 'B',
      order_number: 2
    });

    // Check that total_questions is updated to 2
    quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();
    expect(quizPackage[0].total_questions).toEqual(2);
  });

  it('should handle question with null explanation', async () => {
    const input = {
      ...testQuestionInput,
      quiz_package_id: quizPackageId,
      explanation: undefined // This should result in null
    };

    const result = await createQuestion(input);

    expect(result.explanation).toBeNull();

    // Verify in database
    const questions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, result.id))
      .execute();

    expect(questions[0].explanation).toBeNull();
  });

  it('should throw error when quiz package does not exist', async () => {
    const input = {
      ...testQuestionInput,
      quiz_package_id: 99999 // Non-existent quiz package ID
    };

    await expect(createQuestion(input)).rejects.toThrow(/Quiz package with ID 99999 not found/i);
  });

  it('should create multiple questions with different order numbers', async () => {
    const questions = [
      {
        ...testQuestionInput,
        quiz_package_id: quizPackageId,
        question_text: 'Question 1',
        order_number: 1
      },
      {
        ...testQuestionInput,
        quiz_package_id: quizPackageId,
        question_text: 'Question 2',
        option_a: 'Option A2',
        correct_answer: 'B' as const,
        order_number: 2
      },
      {
        ...testQuestionInput,
        quiz_package_id: quizPackageId,
        question_text: 'Question 3',
        option_a: 'Option A3',
        correct_answer: 'C' as const,
        order_number: 3
      }
    ];

    // Create all questions
    const results = await Promise.all(questions.map(q => createQuestion(q)));

    // Verify all questions were created with correct order numbers
    expect(results).toHaveLength(3);
    expect(results[0].order_number).toEqual(1);
    expect(results[1].order_number).toEqual(2);
    expect(results[2].order_number).toEqual(3);

    // Verify total_questions count is updated correctly
    const quizPackage = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, quizPackageId))
      .execute();
    expect(quizPackage[0].total_questions).toEqual(3);
  });

  it('should handle different correct answer options', async () => {
    const answerOptions = ['A', 'B', 'C', 'D', 'E'] as const;
    
    for (let i = 0; i < answerOptions.length; i++) {
      const input = {
        ...testQuestionInput,
        quiz_package_id: quizPackageId,
        question_text: `Question with correct answer ${answerOptions[i]}`,
        correct_answer: answerOptions[i],
        order_number: i + 1
      };

      const result = await createQuestion(input);
      expect(result.correct_answer).toEqual(answerOptions[i]);
    }

    // Verify all 5 questions were created
    const allQuestions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, quizPackageId))
      .execute();
    expect(allQuestions).toHaveLength(5);
  });
});