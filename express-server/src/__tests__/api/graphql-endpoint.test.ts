import express from 'express';
import request from 'supertest';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { verifyAuth } from '../../middleware/authentication';
import { gql } from '../../gql/hasuraClient';

// Mock dependencies
jest.mock('../../middleware/authentication');
jest.mock('../../gql/hasuraClient');
jest.mock('jsonwebtoken');

describe('GraphQL API Endpoint', () => {
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
    
    // Add the GraphQL endpoint
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
  
  describe('Authentication', () => {
    it('should require authentication token', async () => {
      // Override auth middleware to simulate missing token
      (verifyAuth as jest.Mock).mockImplementation((req, res, next) => {
        res.status(401).json({ error: 'No token provided' });
      });
      
      const response = await request(app)
        .post('/api/graphql')
        .send({
          query: 'query { test }',
          variables: {}
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'No token provided' });
    });
    
    it('should verify valid JWT token', async () => {
      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({ sub: 'test-user-123' });
      
      // Reset auth middleware to use actual implementation
      (verifyAuth as jest.Mock).mockImplementation((req, res, next) => {
        // Simplified version of the actual middleware for testing
        try {
          const supabaseToken = req.headers.authorization?.split("Bearer ")[1];
          if (!supabaseToken) {
            return res.status(401).json({ error: 'No token provided' });
          }
          
          const decodedToken = jwt.verify(supabaseToken, 'test-secret') as any;
          req.body.userId = decodedToken.sub;
          next();
        } catch (error) {
          res.status(401).json({ error: 'Authentication failed' });
        }
      });
      
      // Mock GraphQL response
      const mockData = { events: [{ id: '123' }] };
      (gql as jest.Mock).mockResolvedValue(mockData);
      
      const response = await request(app)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({
          query: 'query { events { id } }',
          variables: {}
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockData);
      expect(jwt.verify).toHaveBeenCalledWith('valid.token', 'test-secret');
    });
    
    it('should reject invalid JWT token', async () => {
      // Mock JWT verification failure
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      // Reset auth middleware to use actual implementation
      (verifyAuth as jest.Mock).mockImplementation((req, res, next) => {
        try {
          const supabaseToken = req.headers.authorization?.split("Bearer ")[1];
          if (!supabaseToken) {
            return res.status(401).json({ error: 'No token provided' });
          }
          
          const decodedToken = jwt.verify(supabaseToken, 'test-secret') as any;
          req.body.userId = decodedToken.sub;
          next();
        } catch (error) {
          res.status(401).json({ error: 'Authentication failed' });
        }
      });
      
      const response = await request(app)
        .post('/api/graphql')
        .set('Authorization', 'Bearer invalid.token')
        .send({
          query: 'query { events { id } }',
          variables: {}
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Authentication failed' });
    });
  });
  
  describe('GraphQL Queries', () => {
    it('should forward query to Hasura and return result', async () => {
      // Mock successful GraphQL response
      const mockEventsData = {
        events: [
          { id: '123', tca: '2025-01-26T02:41:56.000' },
          { id: '124', tca: '2025-01-27T03:41:56.000' }
        ]
      };
      (gql as jest.Mock).mockResolvedValue(mockEventsData);
      
      const query = `
        query GetEvents {
          events {
            id
            tca
          }
        }
      `;
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query, variables: {} });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEventsData);
      expect(gql).toHaveBeenCalledWith(
        query,
        {},
        {
          'x-hasura-role': 'admin',
          'x-hasura-user-id': 'test-user-123'
        }
      );
    });
    
    it('should handle query with variables', async () => {
      // Mock successful GraphQL response
      const mockFilteredEvents = {
        events: [{ id: '123', tca: '2025-01-26T02:41:56.000' }]
      };
      (gql as jest.Mock).mockResolvedValue(mockFilteredEvents);
      
      const query = `
        query GetEventsBySatellite($sat1: String!) {
          events(where: {sat1_object_designator: {_eq: $sat1}}) {
            id
            tca
          }
        }
      `;
      
      const variables = { sat1: '39088' };
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query, variables });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFilteredEvents);
      expect(gql).toHaveBeenCalledWith(
        query,
        variables,
        {
          'x-hasura-role': 'admin',
          'x-hasura-user-id': 'test-user-123'
        }
      );
    });
    
    it('should handle query syntax errors', async () => {
      // Mock GraphQL error
      (gql as jest.Mock).mockRejectedValue(new Error('Syntax error in GraphQL query'));
      
      const invalidQuery = `
        query BrokenQuery {
          events {
            missing closing brace
        }
      `;
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: invalidQuery, variables: {} });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'GraphQL query failed' });
    });
  });
  
  describe('GraphQL Mutations', () => {
    it('should execute mutation and return result', async () => {
      // Mock successful mutation response
      const mockCreatedEvent = {
        insert_events_one: {
          id: '125',
          tca: '2025-01-28T04:41:56.000',
          sat1_object_designator: '39090',
          sat2_object_designator: '27845'
        }
      };
      (gql as jest.Mock).mockResolvedValue(mockCreatedEvent);
      
      const mutation = `
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
      
      const variables = {
        tca: '2025-01-28T04:41:56.000',
        sat1: '39090',
        sat2: '27845'
      };
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: mutation, variables });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockCreatedEvent);
      expect(gql).toHaveBeenCalledWith(
        mutation,
        variables,
        {
          'x-hasura-role': 'admin',
          'x-hasura-user-id': 'test-user-123'
        }
      );
    });
    
    it('should handle mutation errors', async () => {
      // Mock mutation error
      (gql as jest.Mock).mockRejectedValue(new Error('Foreign key violation'));
      
      const mutation = `
        mutation InsertCdm($event_id: bigint!) {
          insert_cdms_one(object: {
            event_id: $event_id
            # Missing required fields
          }) {
            id
          }
        }
      `;
      
      const variables = {
        event_id: 999999 // Non-existent event ID
      };
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query: mutation, variables });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'GraphQL query failed' });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle Hasura server errors', async () => {
      // Mock Hasura server error
      (gql as jest.Mock).mockRejectedValue(new Error('Hasura server error'));
      
      const query = `query { users { id } }`;
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query, variables: {} });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'GraphQL query failed' });
    });
    
    it('should handle network errors', async () => {
      // Mock network error
      (gql as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const query = `query { users { id } }`;
      
      const response = await request(app)
        .post('/api/graphql')
        .send({ query, variables: {} });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'GraphQL query failed' });
    });
    
    it('should handle malformed requests', async () => {
      // Test with invalid JSON body
      const response = await request(app)
        .post('/api/graphql')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBe(400); // Express will return 400 for invalid JSON
    });
  });
}); 