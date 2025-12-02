import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createTestApp } from './helpers/app';
import { createTestUser } from './helpers/testUtils';
import POI from '../models/POI';

const app = createTestApp();

// Helper to create a test POI
async function createTestPOI(createdBy: string, overrides = {}) {
  return POI.create({
    name: 'Test Cabane',
    category: 'Cabane',
    massif: 'Mont Blanc',
    coordinates: { lat: 45.8326, lng: 6.8652 },
    description: 'Une cabane de test pour les tests automatisés.',
    altitude: 2500,
    sunExposition: 'Sud',
    status: 'approved',
    createdBy: new mongoose.Types.ObjectId(createdBy),
    ...overrides,
  });
}

describe('POI Routes', () => {
  describe('GET /api/pois', () => {
    it('should return empty array when no POIs exist', async () => {
      const res = await request(app).get('/api/pois');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return all approved POIs', async () => {
      const user = await createTestUser();
      await createTestPOI(user.id);
      await createTestPOI(user.id, { name: 'Second POI' });
      await createTestPOI(user.id, { name: 'Pending POI', status: 'pending' });

      const res = await request(app).get('/api/pois');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2); // Only approved ones
    });

    it('should filter POIs by category', async () => {
      const user = await createTestUser();
      await createTestPOI(user.id, { category: 'Cabane' });
      await createTestPOI(user.id, { category: 'Refuge', name: 'Test Refuge' });

      const res = await request(app).get('/api/pois?category=Cabane');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('Cabane');
    });

    it('should filter POIs by massif', async () => {
      const user = await createTestUser();
      await createTestPOI(user.id, { massif: 'Mont Blanc' });
      await createTestPOI(user.id, { massif: 'Vanoise', name: 'Vanoise POI' });

      const res = await request(app).get('/api/pois?massif=Vanoise');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].massif).toBe('Vanoise');
    });
  });

  describe('GET /api/pois/:id', () => {
    it('should return a POI by id', async () => {
      const user = await createTestUser();
      const poi = await createTestPOI(user.id);

      const res = await request(app).get(`/api/pois/${poi._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Test Cabane');
    });

    it('should return 404 for non-existent POI', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/pois/${fakeId}`);

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid POI id', async () => {
      const res = await request(app).get('/api/pois/invalid-id');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pois', () => {
    it('should create a pending modification when authenticated', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/pois')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'New POI',
          category: 'Bivouac',
          massif: 'Écrins',
          coordinates: { lat: 44.9, lng: 6.4 },
          description: 'A new spot for testing creation.',
          altitude: 3000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('new_poi');
      expect(res.body.data.status).toBe('pending');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/pois')
        .send({
          name: 'New POI',
          category: 'Bivouac',
          massif: 'Écrins',
          coordinates: { lat: 44.9, lng: 6.4 },
          description: 'A new spot.',
          altitude: 3000,
        });

      expect(res.status).toBe(401);
    });

    it('should return 400 for invalid data', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/pois')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'X', // Too short
          category: 'InvalidCategory',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/pois/:id/like', () => {
    it('should toggle like on a POI', async () => {
      const user = await createTestUser();
      const poi = await createTestPOI(user.id);

      // First like
      const res1 = await request(app)
        .post(`/api/pois/${poi._id}/like`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.likes).toBe(1);
      expect(res1.body.data.isLiked).toBe(true);

      // Unlike
      const res2 = await request(app)
        .post(`/api/pois/${poi._id}/like`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.likes).toBe(0);
      expect(res2.body.data.isLiked).toBe(false);
    });
  });

  describe('POST /api/pois/:id/bookmark', () => {
    it('should toggle bookmark on a POI', async () => {
      const user = await createTestUser();
      const poi = await createTestPOI(user.id);

      // Add bookmark
      const res1 = await request(app)
        .post(`/api/pois/${poi._id}/bookmark`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.success).toBe(true);
      expect(res1.body.data.isBookmarked).toBe(true);

      // Remove bookmark
      const res2 = await request(app)
        .post(`/api/pois/${poi._id}/bookmark`)
        .set('Authorization', `Bearer ${user.token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.data.isBookmarked).toBe(false);
    });
  });

  describe('POST /api/pois/:id/comments', () => {
    it('should create a pending comment', async () => {
      const user = await createTestUser();
      const poi = await createTestPOI(user.id);

      const res = await request(app)
        .post(`/api/pois/${poi._id}/comments`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ text: 'Great spot!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe('comment');
      expect(res.body.data.status).toBe('pending');
    });

    it('should return 400 for empty comment', async () => {
      const user = await createTestUser();
      const poi = await createTestPOI(user.id);

      const res = await request(app)
        .post(`/api/pois/${poi._id}/comments`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ text: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/pois/stats', () => {
    it('should return POI statistics', async () => {
      const user = await createTestUser();
      await createTestPOI(user.id, { category: 'Cabane' });
      await createTestPOI(user.id, { category: 'Refuge', name: 'Test Refuge' });

      const res = await request(app).get('/api/pois/stats');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('byCategory');
    });
  });

  describe('GET /api/pois/user/bookmarks', () => {
    it('should return user bookmarks', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .get('/api/pois/user/bookmarks')
        .set('Authorization', `Bearer ${user.token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/pois/user/bookmarks');

      expect(res.status).toBe(401);
    });
  });
});
