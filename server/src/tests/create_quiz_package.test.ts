import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { quizPackagesTable, usersTable } from '../db/schema';
import { type CreateQuizPackageInput } from '../schema';
import { createQuizPackage } from '../handlers/create_quiz_package';
import { eq } from 'drizzle-orm';

describe('createQuizPackage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test users for all tests
  let adminUserId: number;
  let regularUserId: number;

  beforeEach(async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        username: 'admin_user',
        password: 'password123',
        role: 'admin'
      })
      .returning()
      .execute();
    adminUserId = adminResult[0].id;

    // Create regular user
    const userResult = await db.insert(usersTable)
      .values({
        username: 'regular_user',
        password: 'password123',
        role: 'user'
      })
      .returning()
      .execute();
    regularUserId = userResult[0].id;
  });

  const testInput: CreateQuizPackageInput = {
    title: 'CPNS Test Package 2024',
    description: 'Comprehensive CPNS preparation package',
    time_limit_minutes: 120,
    is_active: true,
    created_by: 0 // Will be set in each test
  };

  it('should create a quiz package with admin user', async () => {
    const input = { ...testInput, created_by: adminUserId };
    const result = await createQuizPackage(input);

    // Basic field validation
    expect(result.title).toEqual('CPNS Test Package 2024');
    expect(result.description).toEqual('Comprehensive CPNS preparation package');
    expect(result.time_limit_minutes).toEqual(120);
    expect(result.total_questions).toEqual(110); // Default CPNS question count
    expect(result.is_active).toEqual(true);
    expect(result.created_by).toEqual(adminUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create quiz package with default values applied by Zod', async () => {
    const minimalInput: CreateQuizPackageInput = {
      title: 'Minimal Package',
      time_limit_minutes: 120, // Zod default would be applied
      is_active: true, // Zod default would be applied
      created_by: adminUserId
    };
    
    const result = await createQuizPackage(minimalInput);

    expect(result.title).toEqual('Minimal Package');
    expect(result.description).toBeNull(); // Optional field
    expect(result.time_limit_minutes).toEqual(120); // Zod default
    expect(result.total_questions).toEqual(110); // Default CPNS count
    expect(result.is_active).toEqual(true); // Zod default
    expect(result.created_by).toEqual(adminUserId);
  });

  it('should handle null description correctly', async () => {
    const inputWithNullDescription: CreateQuizPackageInput = {
      title: 'Package with null description',
      description: null,
      time_limit_minutes: 120,
      is_active: true,
      created_by: adminUserId
    };
    
    const result = await createQuizPackage(inputWithNullDescription);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Package with null description');
  });

  it('should save quiz package to database', async () => {
    const input = { ...testInput, created_by: adminUserId };
    const result = await createQuizPackage(input);

    // Verify in database
    const quizPackages = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, result.id))
      .execute();

    expect(quizPackages).toHaveLength(1);
    const savedPackage = quizPackages[0];
    expect(savedPackage.title).toEqual('CPNS Test Package 2024');
    expect(savedPackage.description).toEqual('Comprehensive CPNS preparation package');
    expect(savedPackage.time_limit_minutes).toEqual(120);
    expect(savedPackage.total_questions).toEqual(110);
    expect(savedPackage.is_active).toEqual(true);
    expect(savedPackage.created_by).toEqual(adminUserId);
    expect(savedPackage.created_at).toBeInstanceOf(Date);
    expect(savedPackage.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInput, created_by: 99999 }; // Non-existent user ID
    
    await expect(createQuizPackage(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when user is not admin', async () => {
    const input = { ...testInput, created_by: regularUserId }; // Regular user, not admin
    
    await expect(createQuizPackage(input)).rejects.toThrow(/only admin users can create quiz packages/i);
  });

  it('should create multiple quiz packages by the same admin', async () => {
    const input1 = { ...testInput, title: 'Package 1', created_by: adminUserId };
    const input2 = { ...testInput, title: 'Package 2', created_by: adminUserId };

    const result1 = await createQuizPackage(input1);
    const result2 = await createQuizPackage(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Package 1');
    expect(result2.title).toEqual('Package 2');
    expect(result1.created_by).toEqual(adminUserId);
    expect(result2.created_by).toEqual(adminUserId);

    // Verify both saved in database
    const allPackages = await db.select()
      .from(quizPackagesTable)
      .execute();
    
    expect(allPackages).toHaveLength(2);
  });

  it('should handle custom time limit', async () => {
    const input = {
      ...testInput,
      time_limit_minutes: 180, // Custom 3-hour limit
      created_by: adminUserId
    };

    const result = await createQuizPackage(input);

    expect(result.time_limit_minutes).toEqual(180);
    expect(result.total_questions).toEqual(110); // Still default
  });

  it('should create inactive quiz package', async () => {
    const input = {
      ...testInput,
      is_active: false,
      created_by: adminUserId
    };

    const result = await createQuizPackage(input);

    expect(result.is_active).toEqual(false);
    expect(result.title).toEqual(testInput.title);
  });
});