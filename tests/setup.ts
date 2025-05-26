// Setup file for tests
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Set test environment
process.env.NODE_ENV = 'test';

// Set required config values for tests
process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';

// Mock Redis if disabled
if (process.env.DISABLE_REDIS) {
  jest.mock('bullmq', () => ({
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'test-job-id' }),
      close: jest.fn().mockResolvedValue(undefined),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      run: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    })),
  }));
}