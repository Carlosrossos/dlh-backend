import jwt from 'jsonwebtoken';
import User, { IUser } from '../../models/User';
import mongoose from 'mongoose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  token: string;
}

/**
 * Creates a test user and returns the user with a valid JWT token
 */
export async function createTestUser(
  overrides: Partial<{
    email: string;
    password: string;
    name: string;
    role: 'user' | 'admin';
  }> = {}
): Promise<TestUser> {
  const userData = {
    email: overrides.email || `test-${Date.now()}@example.com`,
    password: overrides.password || 'password123',
    name: overrides.name || 'Test User',
    role: overrides.role || 'user',
  };

  const user = await User.create(userData) as IUser & { _id: mongoose.Types.ObjectId };
  const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    token,
  };
}

/**
 * Creates a test admin user
 */
export async function createTestAdmin(
  overrides: Partial<{
    email: string;
    password: string;
    name: string;
  }> = {}
): Promise<TestUser> {
  return createTestUser({
    ...overrides,
    role: 'admin',
    name: overrides.name || 'Test Admin',
  });
}

/**
 * Generates an invalid/expired token for testing
 */
export function generateInvalidToken(): string {
  return 'invalid.token.here';
}

/**
 * Generates an expired token
 */
export function generateExpiredToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '-1h' });
}
