import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable } from '../db/schema';
import { type UpdateQuizPackageInput } from '../schema';
import { updateQuizPackage } from '../handlers/update_quiz_package';
import { eq } from 'drizzle-orm';

describe('updateQuizPackage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let adminUser: any;
  let testPackage: any;

  beforeEach(async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        username: 'admin_user',
        password: 'admin123',
        role: 'admin'
      })
      .returning()
      .execute();
    adminUser = adminResult[0];

    // Create test quiz package
    const packageResult = await db.insert(quizPackagesTable)
      .values({
        title: 'Original CPNS Test',
        description: 'Original description',
        time_limit_minutes: 120,
        total_questions: 110,
        is_active: true,
        created_by: adminUser.id
      })
      .returning()
      .execute();
    testPackage = packageResult[0];
  });

  it('should update quiz package title', async () => {
    const input: UpdateQuizPackageInput = {
      id: testPackage.id,
      title: 'Updated CPNS Test'
    };

    const result = await updateQuizPackage(input);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(testPackage.id);
    expect(result!.title).toEqual('Updated CPNS Test');
    expect(result!.description).toEqual('Original description'); // Unchanged
    expect(result!.time_limit_minutes).toEqual(120); // Unchanged
    expect(result!.is_active).toEqual(true); // Unchanged
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.updated_at > testPackage.updated_at).toBe(true);
  });

  it('should update multiple fields', async () => {
    const input: UpdateQuizPackageInput = {
      id: testPackage.id,
      title: 'Multi-Field Update',
      description: 'Updated description',
      time_limit_minutes: 180,
      is_active: false
    };

    const result = await updateQuizPackage(input);

    expect(result).toBeDefined();
    expect(result!.title).toEqual('Multi-Field Update');
    expect(result!.description).toEqual('Updated description');
    expect(result!.time_limit_minutes).toEqual(180);
    expect(result!.is_active).toEqual(false);
    expect(result!.created_by).toEqual(adminUser.id); // Unchanged
    expect(result!.total_questions).toEqual(110); // Unchanged
  });

  it('should update description to null', async () => {
    const input: UpdateQuizPackageInput = {
      id: testPackage.id,
      description: null
    };

    const result = await updateQuizPackage(input);

    expect(result).toBeDefined();
    expect(result!.description).toBeNull();
    expect(result!.title).toEqual('Original CPNS Test'); // Unchanged
  });

  it('should update only is_active field', async () => {
    const input: UpdateQuizPackageInput = {
      id: testPackage.id,
      is_active: false
    };

    const result = await updateQuizPackage(input);

    expect(result).toBeDefined();
    expect(result!.is_active).toEqual(false);
    expect(result!.title).toEqual('Original CPNS Test'); // Unchanged
    expect(result!.time_limit_minutes).toEqual(120); // Unchanged
  });

  it('should return null for non-existent quiz package', async () => {
    const input: UpdateQuizPackageInput = {
      id: 99999,
      title: 'Non-existent Package'
    };

    const result = await updateQuizPackage(input);

    expect(result).toBeNull();
  });

  it('should save changes to database', async () => {
    const input: UpdateQuizPackageInput = {
      id: testPackage.id,
      title: 'Database Update Test',
      time_limit_minutes: 90
    };

    await updateQuizPackage(input);

    // Verify changes in database
    const packages = await db.select()
      .from(quizPackagesTable)
      .where(eq(quizPackagesTable.id, testPackage.id))
      .execute();

    expect(packages).toHaveLength(1);
    expect(packages[0].title).toEqual('Database Update Test');
    expect(packages[0].time_limit_minutes).toEqual(90);
    expect(packages[0].description).toEqual('Original description'); // Unchanged
  });

  it('should update time_limit_minutes with positive value', async () => {
    const input: UpdateQuizPackageInput = {
      id: testPackage.id,
      time_limit_minutes: 240
    };

    const result = await updateQuizPackage(input);

    expect(result).toBeDefined();
    expect(result!.time_limit_minutes).toEqual(240);
  });

  it('should handle empty update gracefully', async () => {
    const input: UpdateQuizPackageInput = {
      id: testPackage.id
    };

    const result = await updateQuizPackage(input);

    expect(result).toBeDefined();
    expect(result!.title).toEqual('Original CPNS Test');
    expect(result!.description).toEqual('Original description');
    expect(result!.time_limit_minutes).toEqual(120);
    expect(result!.is_active).toEqual(true);
    // Should still update the updated_at timestamp
    expect(result!.updated_at > testPackage.updated_at).toBe(true);
  });
});