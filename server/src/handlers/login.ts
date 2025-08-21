import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const login = async (input: LoginInput): Promise<User | null> => {
  try {
    // Query user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      return null; // User not found
    }

    const user = users[0];

    // In a real implementation, you would compare hashed passwords
    // For this implementation, we're doing plain text comparison as per the requirements
    if (user.password === input.password) {
      return user;
    }

    return null; // Invalid password
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};