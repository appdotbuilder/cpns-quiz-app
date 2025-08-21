import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable } from '../db/schema';
import { type CreateUserInput, type CreateQuizPackageInput } from '../schema';
import { getQuizPackageById } from '../handlers/get_quiz_package_by_id';
import { eq } from 'drizzle-orm';

describe('getQuizPackageById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return quiz package when found', async () => {
    // Create a user first (required for created_by foreign key)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a quiz package
    const quizPackageData: CreateQuizPackageInput = {
      title: 'CPNS Practice Test',
      description: 'Complete CPNS preparation quiz',
      time_limit_minutes: 120,
      is_active: true,
      created_by: userId
    };

    const insertResult = await db.insert(quizPackagesTable)
      .values(quizPackageData)
      .returning()
      .execute();

    const createdPackage = insertResult[0];

    // Test the handler
    const result = await getQuizPackageById(createdPackage.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdPackage.id);
    expect(result!.title).toEqual('CPNS Practice Test');
    expect(result!.description).toEqual('Complete CPNS preparation quiz');
    expect(result!.time_limit_minutes).toEqual(120);
    expect(result!.total_questions).toEqual(110); // Default value
    expect(result!.is_active).toEqual(true);
    expect(result!.created_by).toEqual(userId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when quiz package not found', async () => {
    const result = await getQuizPackageById(999);
    expect(result).toBeNull();
  });

  it('should handle default values correctly', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser2',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a quiz package with minimal data (using defaults)
    const insertResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Minimal Quiz Package',
        created_by: userId
        // Using defaults for time_limit_minutes, total_questions, is_active
      })
      .returning()
      .execute();

    const createdPackage = insertResult[0];

    // Test the handler
    const result = await getQuizPackageById(createdPackage.id);

    expect(result).not.toBeNull();
    expect(result!.title).toEqual('Minimal Quiz Package');
    expect(result!.description).toBeNull(); // Default null
    expect(result!.time_limit_minutes).toEqual(120); // Default value
    expect(result!.total_questions).toEqual(110); // Default value
    expect(result!.is_active).toEqual(true); // Default value
    expect(result!.created_by).toEqual(userId);
  });

  it('should handle inactive quiz packages', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser3',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create an inactive quiz package
    const insertResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Inactive Quiz Package',
        description: 'This quiz is inactive',
        time_limit_minutes: 90,
        total_questions: 50,
        is_active: false,
        created_by: userId
      })
      .returning()
      .execute();

    const createdPackage = insertResult[0];

    // Test the handler - should still return inactive packages
    const result = await getQuizPackageById(createdPackage.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(createdPackage.id);
    expect(result!.title).toEqual('Inactive Quiz Package');
    expect(result!.is_active).toEqual(false);
    expect(result!.time_limit_minutes).toEqual(90);
    expect(result!.total_questions).toEqual(50);
  });

  it('should verify data is saved correctly in database', async () => {
    // Create a user first
    const userResult = await db.insert(usersTable)
      .values({
        username: 'verifyuser',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create a quiz package
    const insertResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Verification Test',
        description: 'Testing data integrity',
        time_limit_minutes: 150,
        total_questions: 75,
        is_active: true,
        created_by: userId
      })
      .returning()
      .execute();

    const createdPackage = insertResult[0];

    // Query database directly to verify data
    const dbResults = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, createdPackage.id))
      .execute();

    expect(dbResults).toHaveLength(1);
    
    const dbPackage = dbResults[0];
    expect(dbPackage.title).toEqual('Verification Test');
    expect(dbPackage.description).toEqual('Testing data integrity');
    expect(dbPackage.time_limit_minutes).toEqual(150);
    expect(dbPackage.total_questions).toEqual(75);
    expect(dbPackage.is_active).toEqual(true);
    expect(dbPackage.created_by).toEqual(userId);

    // Test handler returns the same data
    const handlerResult = await getQuizPackageById(createdPackage.id);
    expect(handlerResult).not.toBeNull();
    expect(handlerResult!.title).toEqual(dbPackage.title);
    expect(handlerResult!.description).toEqual(dbPackage.description);
    expect(handlerResult!.time_limit_minutes).toEqual(dbPackage.time_limit_minutes);
    expect(handlerResult!.total_questions).toEqual(dbPackage.total_questions);
    expect(handlerResult!.is_active).toEqual(dbPackage.is_active);
    expect(handlerResult!.created_by).toEqual(dbPackage.created_by);
  });
});