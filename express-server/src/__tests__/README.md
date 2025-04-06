# MySpaceAgency-Backend Testing Documentation

This document outlines the testing strategy for the GraphQL functionality in the MySpaceAgency-Backend project.

## Overview

The testing suite focuses on GraphQL functionality, providing comprehensive coverage for:

- GraphQL client communication with Hasura
- GraphQL queries and mutations
- API endpoints that expose GraphQL functionality
- Authentication integration with GraphQL endpoints
- Error handling for GraphQL operations

## Test Structure

The tests are organized into several categories:

### 1. GraphQL Client Tests (`gql/hasuraClient.test.ts`)

Tests the GraphQL client that communicates with the Hasura backend:

- Making GraphQL requests with admin secret
- Making requests with custom authentication headers
- Executing specific queries for CDM events
- Executing mutations for creating events and inserting CDMs
- Error handling (network errors, syntax errors, etc.)
- Configuration fallbacks

### 2. GraphQL Operations Tests (`gql/operations.test.ts`)

Tests specific GraphQL operations implemented in the application:

- `findMatchingEvent` query
- `createEvent` mutation
- `insertCdm` mutation
- `getUsers` query
- Error handling for various GraphQL operations
- Empty result handling

### 3. API Endpoint Tests

#### GraphQL Endpoint Tests (`api/graphql-endpoint.test.ts`)

Tests the Express endpoints that expose GraphQL functionality:

- Authentication requirements
- JWT token validation
- Forwarding GraphQL queries to Hasura
- Handling query variables
- Error responses for invalid queries
- Mutation execution

#### General API Tests (`api/endpoints.test.ts`)

Tests all API endpoints including the GraphQL endpoint:

- Health check endpoint
- GraphQL endpoint integration
- Authentication middleware integration
- Complex nested queries with variables

### 4. End-to-End Integration Tests (`e2e/graphql-integration.test.ts`)

Tests complete workflows that use GraphQL functionality:

- Querying events by satellite designator
- Complete CDM event workflow (query, create, update)
- Authentication requirements in the full API context
- Error handling in the complete request/response cycle

## Running Tests

All tests are designed to run without requiring the actual server or external dependencies to be running. All external services are properly mocked.

### Running All Tests

```bash
cd express-server
npm test
```

### Running Only GraphQL Tests

```bash
npm test -- --testPathPattern="(gql|graphql)"
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

## Test Environment

The test environment is configured in `../setupTests.ts` and includes:

- Environment variables required for testing
- Mock data for CDM events
- Authentication configuration

## Mock Strategy

The tests use Jest's mocking capabilities to simulate external dependencies:

- **Hasura GraphQL API**: Mocked using `jest.mock('../../gql/hasuraClient')`
- **Authentication**: JWT verification is mocked
- **BullMQ Queue**: Queue operations are mocked
- **File System**: File operations for CDM files are mocked

## Error Handling Coverage

The tests verify proper error handling for various scenarios:

- Invalid GraphQL syntax
- Network errors
- Authentication failures
- Foreign key violations
- Server errors from Hasura
- Invalid or malformed requests

