import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, quizPackagesTable } from '../db/schema';
import { type CreateUserInput, type CreateQuizPackageInput } from '../schema';
import { getQuizPackages } from '../handlers/get_quiz_packages';

// Test data
const adminUser: CreateUserInput = {
  username: 'admin_user',
  password: 'adminpass',
  role: 'admin'
};

const regularUser: CreateUserInput = {
  username: 'regular_user', 
  password: 'userpass',
  role: 'user'
};

const activePackage: CreateQuizPackageInput = {
  title: 'Active Quiz Package',
  description: 'This is an active quiz package',
  time_limit_minutes: 120,
  is_active: true,
  created_by: 1 // Will be set after creating admin user
};

const inactivePackage: CreateQuizPackageInput = {
  title: 'Inactive Quiz Package',
  description: 'This is an inactive quiz package',
  time_limit_minutes: 90,
  is_active: false,
  created_by: 1 // Will be set after creating admin user
};

describe('getQuizPackages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active quiz packages when no user ID provided', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        username: adminUser.username,
        password: adminUser.password,
        role: adminUser.role
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    // Create active and inactive packages
    await db.insert(quizPackagesTable)
      .values([
        {
          ...activePackage,
          created_by: adminId
        },
        {
          ...inactivePackage,
          created_by: adminId
        }
      ])
      .execute();

    const result = await getQuizPackages();

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Active Quiz Package');
    expect(result[0].is_active).toBe(true);
    expect(result[0].description).toEqual('This is an active quiz package');
    expect(result[0].time_limit_minutes).toEqual(120);
    expect(result[0].total_questions).toEqual(110); // Default value
    expect(result[0].created_by).toEqual(adminId);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return only active packages for regular users', async () => {
    // Create users
    const adminResult = await db.insert(usersTable)
      .values({
        username: adminUser.username,
        password: adminUser.password,
        role: adminUser.role
      })
      .returning()
      .execute();

    const regularResult = await db.insert(usersTable)
      .values({
        username: regularUser.username,
        password: regularUser.password,
        role: regularUser.role
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;
    const regularUserId = regularResult[0].id;

    // Create active and inactive packages
    await db.insert(quizPackagesTable)
      .values([
        {
          ...activePackage,
          created_by: adminId
        },
        {
          ...inactivePackage,
          created_by: adminId
        }
      ])
      .execute();

    const result = await getQuizPackages(regularUserId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Active Quiz Package');
    expect(result[0].is_active).toBe(true);
  });

  it('should return all packages (active and inactive) for admin users', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        username: adminUser.username,
        password: adminUser.password,
        role: adminUser.role
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    // Create active and inactive packages
    await db.insert(quizPackagesTable)
      .values([
        {
          ...activePackage,
          created_by: adminId
        },
        {
          ...inactivePackage,
          created_by: adminId
        }
      ])
      .execute();

    const result = await getQuizPackages(adminId);

    expect(result).toHaveLength(2);
    
    const activePkg = result.find(p => p.is_active);
    const inactivePkg = result.find(p => !p.is_active);
    
    expect(activePkg).toBeDefined();
    expect(activePkg!.title).toEqual('Active Quiz Package');
    expect(activePkg!.is_active).toBe(true);
    
    expect(inactivePkg).toBeDefined();
    expect(inactivePkg!.title).toEqual('Inactive Quiz Package');
    expect(inactivePkg!.is_active).toBe(false);
  });

  it('should return empty array when no packages exist', async () => {
    // Create admin user (required for foreign key constraint)
    await db.insert(usersTable)
      .values({
        username: adminUser.username,
        password: adminUser.password,
        role: adminUser.role
      })
      .execute();

    const result = await getQuizPackages();

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle non-existent user ID gracefully', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        username: adminUser.username,
        password: adminUser.password,
        role: adminUser.role
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    // Create active package
    await db.insert(quizPackagesTable)
      .values({
        ...activePackage,
        created_by: adminId
      })
      .execute();

    // Use non-existent user ID - should behave like admin (show all packages)
    const result = await getQuizPackages(99999);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Active Quiz Package');
  });

  it('should return packages with all required fields correctly formatted', async () => {
    // Create admin user
    const adminResult = await db.insert(usersTable)
      .values({
        username: adminUser.username,
        password: adminUser.password,
        role: adminUser.role
      })
      .returning()
      .execute();

    const adminId = adminResult[0].id;

    // Create package with null description
    await db.insert(quizPackagesTable)
      .values({
        title: 'Test Package',
        description: null,
        time_limit_minutes: 60,
        total_questions: 50,
        is_active: true,
        created_by: adminId
      })
      .execute();

    const result = await getQuizPackages();

    expect(result).toHaveLength(1);
    const pkg = result[0];
    
    expect(typeof pkg.id).toBe('number');
    expect(typeof pkg.title).toBe('string');
    expect(pkg.description).toBe(null);
    expect(typeof pkg.time_limit_minutes).toBe('number');
    expect(typeof pkg.total_questions).toBe('number');
    expect(typeof pkg.is_active).toBe('boolean');
    expect(typeof pkg.created_by).toBe('number');
    expect(pkg.created_at).toBeInstanceOf(Date);
    expect(pkg.updated_at).toBeInstanceOf(Date);
  });
});