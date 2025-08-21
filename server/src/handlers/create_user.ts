import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Check if username already exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (existingUser.length > 0) {
      throw new Error('Username already exists');
    }

    // Hash password using Bun's built-in password hashing
    const hashedPassword = await Bun.password.hash(input.password, {
      algorithm: 'bcrypt',
      cost: 10
    });

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        username: input.username,
        password: hashedPassword,
        role: input.role // Zod default 'user' will already be applied
      })
      .returning()
      .execute();

    const user = result[0];
    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};