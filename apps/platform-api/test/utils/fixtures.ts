import { AuthUser } from '@repo/nestjs/auth';

// Origin for the platform-api e2e tests
export const ORIGIN = 'http://localhost:3001';

// Reusable UUID for tests
export const UUID = '11111111-1111-4111-8111-111111111111';
export const VALID_UUID_1 = 'e6005cbb-84f9-467a-bb48-e8cbffc9c991';
export const VALID_UUID_2 = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
export const VALID_UUID_3 = '11111111-1111-4111-8111-111111111111';

export const mockCreatedAt = new Date();

export const mockUser: AuthUser = {
  id: 'user-1',
  roles: ['staff'],
  claims: {
    sub: 'user-1-sub',
    email: 'test@example.com',
    name: 'Test User',
  },
};

export const adminUser: AuthUser = {
  id: 'user-123',
  roles: ['admin'],
  claims: {
    sub: 'user-123-sub',
    email: 'admin@example.com',
    name: 'Admin User',
  },
};

export const citizenUser: AuthUser = {
  id: 'user-123',
  roles: ['citizen'],
  claims: {
    sub: 'user-123-sub',
    email: 'citizen@example.com',
    name: 'Jane Citizen',
  },
};
