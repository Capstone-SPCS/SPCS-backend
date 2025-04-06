import express from 'express';
import request from 'supertest';
import cors from 'cors';
import { verifyAuth } from '../../middleware/authentication';
import { gql } from '../../gql/hasuraClient';

// Mock dependencies
jest.mock('../../middleware/authentication');
jest.mock('../../gql/hasuraClient');

describe('API Endpoints', () => {
  let app: express.Application;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a test Express app
    app = express();
    app.use(express.json());
    app.use(cors());
    
    // Mock authentication middleware
    (verifyAuth as jest.Mock) = jest.fn((req, res, next) => {
      req.user = { userId: 'test-user-123' };
      next();
    });
    
    // Configure endpoints for testing
    app.get('/health', (_, res) => {
      res.send({ status: 'alive' });
    });
    
    app.post('/api/graphql', verifyAuth as any, (req: any, res: any) => {
      const { query, variables } = req.body;
      const hasuraHeaders = {
        'x-hasura-role': "admin",
        'x-hasura-user-id': req.user?.userId
      };
    
      (gql as jest.Mock)(query, variables, hasuraHeaders)
        .then((result: any) => res.json(result))
        .catch((error: any) => {
          console.error('GraphQL error:', error);
          res.status(500).json({ error: 'GraphQL query failed' });
        });
    });
  });
  
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'alive' });
    });
  });
  
  describe('POST /api/graphql', () => {
    it('should forward GraphQL query to Hasura and return result', async () => {
      // Mock successful GraphQL response
      const mockResult = { users: [{ id: 1, name: 'Test User' }] };
      (gql as jest.Mock).mockResolvedValue(mockResult);
      
      const testQuery = 'query { users { id name } }';
      const testVariables = { limit: 10 };
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: testQuery, variables: testVariables });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      
      // Verify GraphQL client was called correctly
      expect(gql).toHaveBeenCalledWith(
        testQuery,
        testVariables,
        {
          'x-hasura-role': 'admin',
          'x-hasura-user-id': 'test-user-123'
        }
      );
    });
    
    it('should return 500 when GraphQL query fails', async () => {
      // Mock GraphQL error
      (gql as jest.Mock).mockRejectedValue(new Error('GraphQL error'));
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: 'invalid query' });
      
      // Verify error response
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'GraphQL query failed' });
    });
    
    it('should use authentication middleware', async () => {
      // Override mock to simulate auth failure
      (verifyAuth as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'Unauthorized' });
      });
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: 'query { test }' });
      
      // Verify auth failure response
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
      
      // Verify GraphQL client was not called
      expect(gql).not.toHaveBeenCalled();
    });

    it('should handle GraphQL query with variables for CDM events', async () => {
      // Mock successful response for CDM events query
      const mockResult = {
        events: [
          {
            id: '123',
            tca: '2025-01-26T02:41:56.000',
            sat1_object_designator: '39088',
            sat2_object_designator: '27843',
            cdms: [
              { id: '456', miss_distance: 2926 }
            ]
          }
        ]
      };
      (gql as jest.Mock).mockResolvedValue(mockResult);
      
      // Query with nested fields and variables
      const testQuery = `
        query GetEventWithCdms($sat1: String!) {
          events(where: {sat1_object_designator: {_eq: $sat1}}) {
            id
            tca
            sat1_object_designator
            sat2_object_designator
            cdms {
              id
              miss_distance
            }
          }
        }
      `;
      
      const testVariables = { sat1: '39088' };
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: testQuery, variables: testVariables });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(response.body.events[0].cdms[0].miss_distance).toBe(2926);
      
      // Verify GraphQL client was called correctly
      expect(gql).toHaveBeenCalledWith(
        testQuery,
        testVariables,
        {
          'x-hasura-role': 'admin',
          'x-hasura-user-id': 'test-user-123'
        }
      );
    });

    it('should handle GraphQL mutation for creating an event', async () => {
      // Mock successful event creation
      const mockResult = {
        insert_events_one: {
          id: '125',
          tca: '2025-01-28T04:41:56.000',
          sat1_object_designator: '39090',
          sat2_object_designator: '27845'
        }
      };
      (gql as jest.Mock).mockResolvedValue(mockResult);
      
      // Mutation with variables
      const testMutation = `
        mutation CreateEvent($tca: timestamptz!, $sat1: String!, $sat2: String!) {
          insert_events_one(object: {
            tca: $tca,
            sat1_object_designator: $sat1,
            sat2_object_designator: $sat2
          }) {
            id
            tca
            sat1_object_designator
            sat2_object_designator
          }
        }
      `;
      
      const testVariables = {
        tca: '2025-01-28T04:41:56.000',
        sat1: '39090',
        sat2: '27845'
      };
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: testMutation, variables: testVariables });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      
      // Verify GraphQL client was called correctly
      expect(gql).toHaveBeenCalledWith(
        testMutation,
        testVariables,
        {
          'x-hasura-role': 'admin',
          'x-hasura-user-id': 'test-user-123'
        }
      );
    });
  });
}); 