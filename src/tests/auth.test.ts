import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers/app';
import { createTestUser } from './helpers/testUtils';
import User from '../models/User';

const app = createTestApp();

describe('Auth Routes', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
      });
    });

    it('should return error if email already exists', async () => {
      // Create user first
      await User.create({
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Another User',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('User already exists');
    });

    it('should return error if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
    });

    it('should return error if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          password: 'password123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
    });

    it('should return error if email is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'invalid-email',
          password: 'password123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/signin', () => {
    beforeEach(async () => {
      await User.create({
        email: 'login@example.com',
        password: 'correctpassword',
        name: 'Login User',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'login@example.com',
          password: 'correctpassword',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('login@example.com');
    });

    it('should return error with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return error with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/signin')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('should return error if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/signin')
        .send({
          password: 'password123',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const testUser = await createTestUser({
        email: 'me@example.com',
        name: 'Me User',
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUser.token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        email: 'me@example.com',
        name: 'Me User',
      });
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('should return 403 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return success message even for non-existent email (security)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Si un compte existe');
    });

    it('should return error if email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password/:token', () => {
    it('should return error with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/invalidtoken')
        .send({ password: 'newpassword123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Token invalide ou expiré');
    });

    it('should return error if password is too short', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password/sometoken')
        .send({ password: '123' });

      expect(res.status).toBe(400);
    });
  });
});
