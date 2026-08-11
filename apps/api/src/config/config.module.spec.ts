import 'reflect-metadata';
import { validate } from './config.validation';

describe('ConfigValidation', () => {
  it('uses the docker postgres credentials by default when DATABASE_URL is not provided', () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;
    jest.resetModules();

    const { configuration } = require('./configuration');

    expect(configuration.database.url).toBe('postgresql://postgres:postgrespassword2026@localhost:5432/jovianex_db');

    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
  });
  it('should successfully validate correct environment configurations', () => {
    const validConfig = {
      NODE_ENV: 'development',
      PORT: 3000,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/jovianex_db',
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      JWT_SECRET: 'supersecret',
    };

    const result = validate(validConfig);
    expect(result).toBeDefined();
    expect(result.PORT).toBe(3000);
  });

  it('should throw an error when required configuration elements are missing', () => {
    const invalidConfig = {
      NODE_ENV: 'invalid_env', // Invalid enum value
    };

    expect(() => validate(invalidConfig)).toThrow();
  });
});
