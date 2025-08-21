import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable, questionsTable } from '../db/schema';
import { type CreateQuestionInput } from '../schema';
import { getQuestionsByPackage } from '../handlers/get_questions_by_package';
import { eq } from 'drizzle-orm';

describe('getQuestionsByPackage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return questions ordered by order_number', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test quiz package
    const [quizPackage] = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz package',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();

    // Create test questions in non-sequential order
    const testQuestions: CreateQuestionInput[] = [
      {
        quiz_package_id: quizPackage.id,
        question_text: 'Question 3?',
        option_a: 'Option A3',
        option_b: 'Option B3',
        option_c: 'Option C3',
        option_d: 'Option D3',
        option_e: 'Option E3',
        correct_answer: 'C',
        explanation: 'Explanation 3',
        order_number: 3
      },
      {
        quiz_package_id: quizPackage.id,
        question_text: 'Question 1?',
        option_a: 'Option A1',
        option_b: 'Option B1',
        option_c: 'Option C1',
        option_d: 'Option D1',
        option_e: 'Option E1',
        correct_answer: 'A',
        explanation: 'Explanation 1',
        order_number: 1
      },
      {
        quiz_package_id: quizPackage.id,
        question_text: 'Question 2?',
        option_a: 'Option A2',
        option_b: 'Option B2',
        option_c: 'Option C2',
        option_d: 'Option D2',
        option_e: 'Option E2',
        correct_answer: 'B',
        explanation: 'Explanation 2',
        order_number: 2
      }
    ];

    await db.insert(questionsTable)
      .values(testQuestions)
      .execute();

    // Get questions
    const result = await getQuestionsByPackage(quizPackage.id);

    // Verify questions are returned in correct order
    expect(result).toHaveLength(3);
    expect(result[0].question_text).toEqual('Question 1?');
    expect(result[0].order_number).toEqual(1);
    expect(result[1].question_text).toEqual('Question 2?');
    expect(result[1].order_number).toEqual(2);
    expect(result[2].question_text).toEqual('Question 3?');
    expect(result[2].order_number).toEqual(3);
  });

  it('should return all question fields including sensitive data', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test quiz package
    const [quizPackage] = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz package',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();

    // Create test question
    const testQuestion: CreateQuestionInput = {
      quiz_package_id: quizPackage.id,
      question_text: 'What is the capital of Indonesia?',
      option_a: 'Jakarta',
      option_b: 'Surabaya',
      option_c: 'Bandung',
      option_d: 'Medan',
      option_e: 'Yogyakarta',
      correct_answer: 'A',
      explanation: 'Jakarta is the capital and largest city of Indonesia',
      order_number: 1
    };

    await db.insert(questionsTable)
      .values(testQuestion)
      .execute();

    // Get questions
    const result = await getQuestionsByPackage(quizPackage.id);

    // Verify all fields are present including sensitive ones
    expect(result).toHaveLength(1);
    const question = result[0];
    
    expect(question.id).toBeDefined();
    expect(question.quiz_package_id).toEqual(quizPackage.id);
    expect(question.question_text).toEqual('What is the capital of Indonesia?');
    expect(question.option_a).toEqual('Jakarta');
    expect(question.option_b).toEqual('Surabaya');
    expect(question.option_c).toEqual('Bandung');
    expect(question.option_d).toEqual('Medan');
    expect(question.option_e).toEqual('Yogyakarta');
    expect(question.correct_answer).toEqual('A'); // Should include correct answer
    expect(question.explanation).toEqual('Jakarta is the capital and largest city of Indonesia'); // Should include explanation
    expect(question.order_number).toEqual(1);
    expect(question.created_at).toBeInstanceOf(Date);
    expect(question.updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array for non-existent package', async () => {
    const result = await getQuestionsByPackage(999);
    expect(result).toHaveLength(0);
  });

  it('should return empty array for package with no questions', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test quiz package without questions
    const [quizPackage] = await db.insert(quizPackagesTable)
      .values({
        title: 'Empty Quiz',
        description: 'A quiz package with no questions',
        time_limit_minutes: 120,
        total_questions: 0,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();

    const result = await getQuestionsByPackage(quizPackage.id);
    expect(result).toHaveLength(0);
  });

  it('should handle questions with null explanation', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test quiz package
    const [quizPackage] = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz package',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();

    // Create question without explanation
    await db.insert(questionsTable)
      .values({
        quiz_package_id: quizPackage.id,
        question_text: 'Question without explanation?',
        option_a: 'Option A',
        option_b: 'Option B',
        option_c: 'Option C',
        option_d: 'Option D',
        option_e: 'Option E',
        correct_answer: 'A',
        explanation: null,
        order_number: 1
      })
      .execute();

    const result = await getQuestionsByPackage(quizPackage.id);
    
    expect(result).toHaveLength(1);
    expect(result[0].explanation).toBeNull();
  });

  it('should verify questions are saved in database correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create test quiz package
    const [quizPackage] = await db.insert(quizPackagesTable)
      .values({
        title: 'Test Quiz',
        description: 'A test quiz package',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();

    // Create test question
    const testQuestion: CreateQuestionInput = {
      quiz_package_id: quizPackage.id,
      question_text: 'Test question?',
      option_a: 'Option A',
      option_b: 'Option B',
      option_c: 'Option C',
      option_d: 'Option D',
      option_e: 'Option E',
      correct_answer: 'D',
      explanation: 'Test explanation',
      order_number: 5
    };

    await db.insert(questionsTable)
      .values(testQuestion)
      .execute();

    // Get questions using handler
    const handlerResult = await getQuestionsByPackage(quizPackage.id);

    // Verify by querying database directly
    const dbResult = await db.select()
      .from(questionsTable)
      .where(eq(questionsTable.quiz_package_id, quizPackage.id))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbResult).toHaveLength(1);
    expect(handlerResult[0].id).toEqual(dbResult[0].id);
    expect(handlerResult[0].question_text).toEqual(dbResult[0].question_text);
    expect(handlerResult[0].correct_answer).toEqual(dbResult[0].correct_answer);
  });

  it('should handle multiple packages correctly', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password',
        role: 'admin'
      })
      .returning()
      .execute();

    // Create two quiz packages
    const [package1] = await db.insert(quizPackagesTable)
      .values({
        title: 'Quiz Package 1',
        description: 'First quiz package',
        time_limit_minutes: 120,
        total_questions: 2,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();

    const [package2] = await db.insert(quizPackagesTable)
      .values({
        title: 'Quiz Package 2',
        description: 'Second quiz package',
        time_limit_minutes: 90,
        total_questions: 1,
        is_active: true,
        created_by: user.id
      })
      .returning()
      .execute();

    // Create questions for both packages
    await db.insert(questionsTable)
      .values([
        {
          quiz_package_id: package1.id,
          question_text: 'Package 1 Question 1?',
          option_a: 'A1', option_b: 'B1', option_c: 'C1', option_d: 'D1', option_e: 'E1',
          correct_answer: 'A',
          explanation: 'Explanation 1-1',
          order_number: 1
        },
        {
          quiz_package_id: package1.id,
          question_text: 'Package 1 Question 2?',
          option_a: 'A2', option_b: 'B2', option_c: 'C2', option_d: 'D2', option_e: 'E2',
          correct_answer: 'B',
          explanation: 'Explanation 1-2',
          order_number: 2
        },
        {
          quiz_package_id: package2.id,
          question_text: 'Package 2 Question 1?',
          option_a: 'A3', option_b: 'B3', option_c: 'C3', option_d: 'D3', option_e: 'E3',
          correct_answer: 'C',
          explanation: 'Explanation 2-1',
          order_number: 1
        }
      ])
      .execute();

    // Get questions for package 1
    const package1Result = await getQuestionsByPackage(package1.id);
    expect(package1Result).toHaveLength(2);
    expect(package1Result[0].question_text).toEqual('Package 1 Question 1?');
    expect(package1Result[1].question_text).toEqual('Package 1 Question 2?');

    // Get questions for package 2
    const package2Result = await getQuestionsByPackage(package2.id);
    expect(package2Result).toHaveLength(1);
    expect(package2Result[0].question_text).toEqual('Package 2 Question 1?');
  });
});