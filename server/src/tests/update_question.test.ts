import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable } from '../db/schema';
import { type UpdateQuestionInput } from '../schema';
import { updateQuestion } from '../handlers/update_question';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'testadmin',
  password: 'password123',
  role: 'admin' as const
};

const testQuizPackage = {
  title: 'Test Quiz Package',
  description: 'A quiz package for testing',
  time_limit_minutes: 120,
  total_questions: 110,
  is_active: true,
  created_by: 1 // Will be set after user creation
};

const testQuestion = {
  quiz_package_id: 1, // Will be set after quiz package creation
  question_text: 'Original question text',
  option_a: 'Original option A',
  option_b: 'Original option B',
  option_c: 'Original option C',
  option_d: 'Original option D',
  option_e: 'Original option E',
  correct_answer: 'A' as const,
  explanation: 'Original explanation',
  order_number: 1
};

describe('updateQuestion', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let quizPackageId: number;
  let questionId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test quiz package
    const quizPackageResult = await db.insert(quizPackagesTable)
      .values({ ...testQuizPackage, created_by: userId })
      .returning()
      .execute();
    quizPackageId = quizPackageResult[0].id;

    // Create test question
    const questionResult = await db.insert(questionsTable)
      .values({ ...testQuestion, quiz_package_id: quizPackageId })
      .returning()
      .execute();
    questionId = questionResult[0].id;
  });

  it('should update a question with all fields', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Updated question text',
      option_a: 'Updated option A',
      option_b: 'Updated option B',
      option_c: 'Updated option C',
      option_d: 'Updated option D',
      option_e: 'Updated option E',
      correct_answer: 'B',
      explanation: 'Updated explanation',
      order_number: 5
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeDefined();
    expect(result?.id).toBe(questionId);
    expect(result?.question_text).toBe('Updated question text');
    expect(result?.option_a).toBe('Updated option A');
    expect(result?.option_b).toBe('Updated option B');
    expect(result?.option_c).toBe('Updated option C');
    expect(result?.option_d).toBe('Updated option D');
    expect(result?.option_e).toBe('Updated option E');
    expect(result?.correct_answer).toBe('B');
    expect(result?.explanation).toBe('Updated explanation');
    expect(result?.order_number).toBe(5);
    expect(result?.quiz_package_id).toBe(quizPackageId);
    expect(result?.updated_at).toBeInstanceOf(Date);
    expect(result?.created_at).toBeInstanceOf(Date);
  });

  it('should update only provided fields', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Partially updated question',
      correct_answer: 'C'
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeDefined();
    expect(result?.question_text).toBe('Partially updated question');
    expect(result?.correct_answer).toBe('C');
    // Other fields should remain unchanged
    expect(result?.option_a).toBe('Original option A');
    expect(result?.option_b).toBe('Original option B');
    expect(result?.explanation).toBe('Original explanation');
    expect(result?.order_number).toBe(1);
  });

  it('should update explanation to null', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      explanation: null
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeDefined();
    expect(result?.explanation).toBeNull();
    // Other fields should remain unchanged
    expect(result?.question_text).toBe('Original question text');
    expect(result?.correct_answer).toBe('A');
  });

  it('should update order number only', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      order_number: 10
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeDefined();
    expect(result?.order_number).toBe(10);
    // All other fields should remain unchanged
    expect(result?.question_text).toBe('Original question text');
    expect(result?.option_a).toBe('Original option A');
    expect(result?.correct_answer).toBe('A');
  });

  it('should save updated question to database', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Database test question',
      correct_answer: 'D'
    };

    await updateQuestion(updateInput);

    // Verify the update was saved to database
    const savedQuestions = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.id, questionId))
      .execute();

    expect(savedQuestions).toHaveLength(1);
    expect(savedQuestions[0].question_text).toBe('Database test question');
    expect(savedQuestions[0].correct_answer).toBe('D');
    expect(savedQuestions[0].option_a).toBe('Original option A'); // Unchanged
    expect(savedQuestions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent question', async () => {
    const updateInput: UpdateQuestionInput = {
      id: 99999, // Non-existent ID
      question_text: 'This should not work'
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeNull();
  });

  it('should update all answer options correctly', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      option_a: 'New A',
      option_b: 'New B',
      option_c: 'New C',
      option_d: 'New D',
      option_e: 'New E',
      correct_answer: 'E'
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeDefined();
    expect(result?.option_a).toBe('New A');
    expect(result?.option_b).toBe('New B');
    expect(result?.option_c).toBe('New C');
    expect(result?.option_d).toBe('New D');
    expect(result?.option_e).toBe('New E');
    expect(result?.correct_answer).toBe('E');
  });

  it('should handle updating with same values', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Original question text', // Same as current
      correct_answer: 'A' // Same as current
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeDefined();
    expect(result?.question_text).toBe('Original question text');
    expect(result?.correct_answer).toBe('A');
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should maintain foreign key relationships', async () => {
    const updateInput: UpdateQuestionInput = {
      id: questionId,
      question_text: 'Question with maintained relationships'
    };

    const result = await updateQuestion(updateInput);

    expect(result).toBeDefined();
    expect(result?.quiz_package_id).toBe(quizPackageId);
    
    // Verify the relationship is still valid by joining
    const questionsWithPackage = await db.select()
      .from(questionsTable)
      .innerJoin(quizPackagesTable, eq(questionsTable.quiz_package_id, quizPackagesTable.id))
      .where(eq(questionsTable.id, questionId))
      .execute();

    expect(questionsWithPackage).toHaveLength(1);
    expect(questionsWithPackage[0].questions.question_text).toBe('Question with maintained relationships');
    expect(questionsWithPackage[0].quiz_packages.title).toBe('Test Quiz Package');
  });
});