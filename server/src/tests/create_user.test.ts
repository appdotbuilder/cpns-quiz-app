import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  role: 'user'
};

// Admin user test input
const adminInput: CreateUserInput = {
  username: 'adminuser',
  password: 'adminpass456',
  role: 'admin'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with default role', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.username).toEqual('testuser');
    expect(result.role).toEqual('user');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password).not.toEqual('password123');
    expect(result.password.length).toBeGreaterThan(20); // bcrypt hashes are typically 60+ chars
  });

  it('should create an admin user', async () => {
    const result = await createUser(adminInput);

    expect(result.username).toEqual('adminuser');
    expect(result.role).toEqual('admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed
    expect(result.password).not.toEqual('adminpass456');
    expect(result.password.length).toBeGreaterThan(20);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].username).toEqual('testuser');
    expect(users[0].role).toEqual('user');
    expect(users[0].password).not.toEqual('password123'); // Should be hashed
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await createUser(testInput);

    // Verify password was hashed using bcrypt
    const isValid = await Bun.password.verify('password123', result.password);
    expect(isValid).toBe(true);

    // Verify wrong password doesn't match
    const isInvalid = await Bun.password.verify('wrongpassword', result.password);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create another user with same username
    const duplicateInput: CreateUserInput = {
      username: 'testuser', // Same username
      password: 'differentpass',
      role: 'admin'
    };

    await expect(createUser(duplicateInput)).rejects.toThrow(/username already exists/i);
  });

  it('should handle username uniqueness case-sensitively', async () => {
    // Create first user
    await createUser(testInput);

    // Create user with different case - should succeed
    const differentCaseInput: CreateUserInput = {
      username: 'TestUser', // Different case
      password: 'password123',
      role: 'user'
    };

    const result = await createUser(differentCaseInput);
    expect(result.username).toEqual('TestUser');
    expect(result.id).toBeDefined();
  });

  it('should apply Zod default role when not specified', async () => {
    // Test input without role (should default to 'user')
    const inputWithoutRole = {
      username: 'defaultroleuser',
      password: 'password123'
      // role not specified - should use Zod default
    };

    const result = await createUser(inputWithoutRole as CreateUserInput);
    
    expect(result.username).toEqual('defaultroleuser');
    expect(result.role).toEqual('user'); // Should have default value
  });
});