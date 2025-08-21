import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with correct credentials', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'testpass',
        role: 'user'
      })
      .execute();

    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'testpass'
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('testuser');
    expect(result!.role).toEqual('user');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should authenticate admin with correct credentials', async () => {
    // Create admin user
    await db.insert(usersTable)
      .values({
        username: 'admin',
        password: 'admin',
        role: 'admin'
      })
      .execute();

    const loginInput: LoginInput = {
      username: 'admin',
      password: 'admin'
    };

    const result = await login(loginInput);

    expect(result).not.toBeNull();
    expect(result!.username).toEqual('admin');
    expect(result!.role).toEqual('admin');
    expect(result!.id).toBeDefined();
  });

  it('should return null for non-existent user', async () => {
    const loginInput: LoginInput = {
      username: 'nonexistent',
      password: 'password'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'correctpass',
        role: 'user'
      })
      .execute();

    const loginInput: LoginInput = {
      username: 'testuser',
      password: 'wrongpass'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should handle empty database', async () => {
    const loginInput: LoginInput = {
      username: 'anyuser',
      password: 'anypass'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should handle case sensitive usernames', async () => {
    // Create user with lowercase username
    await db.insert(usersTable)
      .values({
        username: 'testuser',
        password: 'testpass',
        role: 'user'
      })
      .execute();

    const loginInput: LoginInput = {
      username: 'TestUser', // Different case
      password: 'testpass'
    };

    const result = await login(loginInput);

    expect(result).toBeNull();
  });

  it('should authenticate multiple users correctly', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values([
        {
          username: 'user1',
          password: 'pass1',
          role: 'user'
        },
        {
          username: 'user2',
          password: 'pass2',
          role: 'admin'
        }
      ])
      .execute();

    // Test first user
    const login1: LoginInput = {
      username: 'user1',
      password: 'pass1'
    };

    const result1 = await login(login1);
    expect(result1).not.toBeNull();
    expect(result1!.username).toEqual('user1');
    expect(result1!.role).toEqual('user');

    // Test second user
    const login2: LoginInput = {
      username: 'user2',
      password: 'pass2'
    };

    const result2 = await login(login2);
    expect(result2).not.toBeNull();
    expect(result2!.username).toEqual('user2');
    expect(result2!.role).toEqual('admin');

    // Test wrong password for first user
    const login3: LoginInput = {
      username: 'user1',
      password: 'pass2'
    };

    const result3 = await login(login3);
    expect(result3).toBeNull();
  });
});