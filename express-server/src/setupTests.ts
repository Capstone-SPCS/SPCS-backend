// This file sets up the test environment
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test file if it exists
dotenv.config({
  path: path.resolve(__dirname, '../../.env.test')
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.HASURA_GRAPHQL_ADMIN_SECRET = 'test-admin-secret';
process.env.HASURA_GRAPHQL_URL = 'http://localhost:8080/v1/graphql';

// Instead of adding a test, we're instead going to rename this file
// to setup.js (instead of setup.ts) to prevent Jest from considering it a test file 