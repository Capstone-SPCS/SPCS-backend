import request from 'supertest';
import http from 'http';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { gql } from '../../gql/hasuraClient';
import { verifyAuth } from '../../middleware/authentication';

// Mock dependencies
jest.mock('../../gql/hasuraClient');
jest.mock('jsonwebtoken');

describe('GraphQL Integration Tests', () => {
  let app: express.Application;
  let server: http.Server;
  let apiUrl: string;
  
  beforeEach((done) => {
    jest.clearAllMocks();
    
    // Create Express app
    app = express();
    app.use(express.json());
    app.use(cors());
    
    // Mock JWT verification
    (jwt.verify as jest.Mock).mockImplementation((token) => {
      if (token === 'valid.token') {
        return { sub: 'test-user-123' };
      }
      throw new Error('Invalid token');
    });
    
    // Setup test authentication middleware
    app.post('/api/graphql', verifyAuth, (req: any, res: any) => {
      const { query, variables } = req.body;
      const hasuraHeaders = {
        'x-hasura-role': "admin",
        'x-hasura-user-id': req.body.userId
      };
    
      (gql as jest.Mock)(query, variables, hasuraHeaders)
        .then((result: any) => res.json(result))
        .catch((error: any) => {
          console.error('GraphQL error:', error);
          res.status(500).json({ error: 'GraphQL query failed' });
        });
    });
    
    // Start server
    server = app.listen(0, () => {
      const address = server.address() as any;
      apiUrl = `http://localhost:${address.port}`;
      done();
    });
  });
  
  afterEach((done) => {
    server.close(done);
  });
  
  describe('GraphQL CDM Event Workflows', () => {
    it('should support querying events by satellite designator', async () => {
      // Mock successful event query
      const mockEvents = {
        events: [
          {
            id: '123',
            tca: '2025-01-26T02:41:56.000',
            sat1_object_designator: '39088',
            sat2_object_designator: '27843'
          }
        ]
      };
      (gql as jest.Mock).mockResolvedValue(mockEvents);
      
      const query = `
        query GetEventsBySatellite($sat1: String!) {
          events(where: {sat1_object_designator: {_eq: $sat1}}) {
            id
            tca
            sat1_object_designator
            sat2_object_designator
          }
        }
      `;
      
      const variables = { sat1: '39088' };
      
      const response = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({ query, variables });
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvents);
    });
    
    it('should support a complete CDM event workflow: query, create, update', async () => {
      // Step 1: Mock empty event query result
      const mockEmptyEvents = { events: [] };
      (gql as jest.Mock).mockResolvedValueOnce(mockEmptyEvents);
      
      // Step 2: Mock create event result
      const mockCreatedEvent = {
        insert_events_one: {
          id: '125',
          tca: '2025-01-28T04:41:56.000',
          sat1_object_designator: '39090',
          sat2_object_designator: '27845'
        }
      };
      (gql as jest.Mock).mockResolvedValueOnce(mockCreatedEvent);
      
      // Step 3: Mock insert CDM result
      const mockInsertedCdm = {
        insert_cdms_one: {
          id: '456',
          event_id: '125',
          tca: '2025-01-28T04:41:56.000',
          sat1_object_designator: '39090',
          sat2_object_designator: '27845',
          miss_distance: 2926
        }
      };
      (gql as jest.Mock).mockResolvedValueOnce(mockInsertedCdm);
      
      // Step 4: Mock updated event query result
      const mockUpdatedEvent = {
        events: [
          {
            id: '125',
            tca: '2025-01-28T04:41:56.000',
            sat1_object_designator: '39090',
            sat2_object_designator: '27845',
            cdms: [
              {
                id: '456',
                miss_distance: 2926
              }
            ]
          }
        ]
      };
      (gql as jest.Mock).mockResolvedValueOnce(mockUpdatedEvent);
      
      // Step 1: Query for existing events (should be empty)
      const findQuery = `
        query FindMatchingEvent($sat1: String!, $sat2: String!, $tca_start: timestamptz!, $tca_end: timestamptz!) {
          events(where: {
            sat1_object_designator: { _eq: $sat1 },
            sat2_object_designator: { _eq: $sat2 },
            tca: { _gte: $tca_start, _lte: $tca_end }
          }) {
            id
          }
        }
      `;
      
      const findVariables = {
        sat1: '39090',
        sat2: '27845',
        tca_start: '2025-01-28T04:00:00.000',
        tca_end: '2025-01-28T05:00:00.000'
      };
      
      const findResponse = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({ query: findQuery, variables: findVariables });
      
      expect(findResponse.status).toBe(200);
      expect(findResponse.body).toEqual(mockEmptyEvents);
      
      // Step 2: Create a new event
      const createQuery = `
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
      
      const createVariables = {
        tca: '2025-01-28T04:41:56.000',
        sat1: '39090',
        sat2: '27845'
      };
      
      const createResponse = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({ query: createQuery, variables: createVariables });
      
      expect(createResponse.status).toBe(200);
      expect(createResponse.body).toEqual(mockCreatedEvent);
      
      // Step 3: Insert a CDM for the event
      const cdmQuery = `
        mutation InsertCdm($event_id: bigint!, $tca: timestamp!, $sat1: String!, $sat2: String!, $miss_distance: float8!) {
          insert_cdms_one(object: {
            event_id: $event_id,
            tca: $tca,
            sat1_object_designator: $sat1,
            sat2_object_designator: $sat2,
            miss_distance: $miss_distance
          }) {
            id
            event_id
            tca
            sat1_object_designator
            sat2_object_designator
            miss_distance
          }
        }
      `;
      
      const cdmVariables = {
        event_id: 125,
        tca: '2025-01-28T04:41:56.000',
        sat1: '39090',
        sat2: '27845',
        miss_distance: 2926
      };
      
      const cdmResponse = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({ query: cdmQuery, variables: cdmVariables });
      
      expect(cdmResponse.status).toBe(200);
      expect(cdmResponse.body).toEqual(mockInsertedCdm);
      
      // Step 4: Query the event with its CDMs
      const getEventQuery = `
        query GetEventWithCdms($event_id: bigint!) {
          events(where: { id: { _eq: $event_id } }) {
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
      
      const getEventVariables = { event_id: 125 };
      
      const getEventResponse = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({ query: getEventQuery, variables: getEventVariables });
      
      expect(getEventResponse.status).toBe(200);
      expect(getEventResponse.body).toEqual(mockUpdatedEvent);
      expect(getEventResponse.body.events[0].cdms[0].miss_distance).toBe(2926);
    });
  });
  
  describe('GraphQL Authentication and Error Handling', () => {
    it('should reject requests without a token', async () => {
      const query = `query { events { id } }`;
      
      const response = await request(apiUrl)
        .post('/api/graphql')
        .send({ query });
      
      expect(response.status).toBe(401);
    });
    
    it('should reject requests with an invalid token', async () => {
      const query = `query { events { id } }`;
      
      const response = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer invalid.token')
        .send({ query });
      
      expect(response.status).toBe(401);
    });
    
    it('should handle GraphQL syntax errors', async () => {
      // Mock GraphQL error
      (gql as jest.Mock).mockRejectedValue(new Error('Syntax error in GraphQL query'));
      
      const badQuery = `
        query {
          events {
            missing_closing_brace
        }
      `;
      
      const response = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({ query: badQuery });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'GraphQL query failed' });
    });
    
    it('should handle server errors from Hasura', async () => {
      // Mock Hasura server error
      (gql as jest.Mock).mockRejectedValue(new Error('Hasura internal server error'));
      
      const query = `query { events { id } }`;
      
      const response = await request(apiUrl)
        .post('/api/graphql')
        .set('Authorization', 'Bearer valid.token')
        .send({ query });
      
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'GraphQL query failed' });
    });
  });
}); 