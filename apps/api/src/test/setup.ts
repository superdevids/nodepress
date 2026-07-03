import { beforeAll, afterAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-not-for-production';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-not-for-production';
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/nodepress_test';
});

afterAll(() => {

});
