# Development Guide

This document provides guidelines for developing the MySpaceAgency-Backend.

## Project Structure

```
express-server/
├── src/                   # Source code
│   ├── __tests__/         # Tests
│   ├── gql/               # GraphQL queries/mutations
│   │   ├── hasuraClient.ts # GraphQL client
│   │   ├── mutation/      # GraphQL mutations
│   │   └── query/         # GraphQL queries
│   ├── middleware/        # Express middleware
│   ├── mockLogic/         # Mock CDM processing
│   ├── routes/            # API routes
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── index.ts           # Application entry point
│   └── setupTests.ts      # Test setup
├── docs/                  # Documentation
├── mockCdms/              # Mock CDM files for development
└── package.json           # Project dependencies
```

## Development Workflow

1. Clone the repository
2. Set up environment variables
3. Install dependencies: `npm install`
4. Run in development mode: `npm run dev`
5. Write tests for new features
6. Submit a pull request

## Coding Standards

- Use TypeScript for type safety
- Follow the ESLint configuration
- Write tests for all new features
- Document your code with JSDoc comments

## Testing

See the [Testing Documentation](../src/__tests__/README.md) for detailed information about the testing strategy.

## GraphQL Development

### Adding a New Query

1. Create a new file in `src/gql/query/`
2. Define your GraphQL query using the template literal syntax
3. Test the query using `src/gql/hasuraClient.ts`
4. Add tests in `src/__tests__/gql/operations.test.ts`

### Adding a New Mutation

1. Create a new file in `src/gql/mutation/`
2. Define your GraphQL mutation using the template literal syntax
3. Test the mutation using `src/gql/hasuraClient.ts`
4. Add tests in `src/__tests__/gql/operations.test.ts`

## API Development

When adding new API endpoints:

1. Create a new route file in `src/routes/`
2. Add the route to `index.ts`
3. Write tests for the new endpoint
4. Update the API documentation in `docs/API.md`

## Deployment

The application is designed to be deployed using Docker. The process is:

1. Build the Docker image: `docker build -t myspaceagency-backend .`
2. Push the image to a registry
3. Deploy the image to your hosting environment
4. Set up the environment variables
5. Ensure Redis and Hasura are properly configured 