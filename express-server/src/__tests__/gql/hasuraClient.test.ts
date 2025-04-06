import { gql } from '../../gql/hasuraClient';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('gql client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Save original env and set test values
    process.env.HASURA_GRAPHQL_ADMIN_SECRET = 'test-admin-secret';
    process.env.HASURA_GRAPHQL_URL = 'http://test-hasura:8080/v1/graphql';
  });
  
  it('should make a GraphQL request with admin secret', async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: { test: 'data' }
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const query = 'query { test }';
    const variables = { var: 'value' };
    
    const result = await gql(query, variables);
    
    // Verify request was made correctly
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-hasura:8080/v1/graphql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': 'test-admin-secret'
        },
        body: JSON.stringify({
          query,
          variables
        })
      }
    );
    
    // Verify result
    expect(result).toEqual({ test: 'data' });
  });
  
  it('should make a GraphQL request with provided auth headers', async () => {
    // Mock successful response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: { test: 'data' }
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const query = 'query { test }';
    const variables = { var: 'value' };
    const headers = {
      'x-hasura-role': 'user',
      'x-hasura-user-id': 'user123'
    };
    
    const result = await gql(query, variables, headers);
    
    // Verify request was made correctly with custom headers
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-hasura:8080/v1/graphql',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-role': 'user',
          'x-hasura-user-id': 'user123',
          'x-hasura-admin-secret': 'test-admin-secret'
        },
        body: JSON.stringify({
          query,
          variables
        })
      }
    );
    
    // Verify result
    expect(result).toEqual({ test: 'data' });
  });
  
  it('should execute a query for retrieving CDM events', async () => {
    // Mock successful response with CDM events data
    const mockEventsData = {
      events: [
        { 
          id: '123', 
          tca: '2025-01-26T02:41:56.000',
          sat1_object_designator: '39088',
          sat2_object_designator: '27843'
        },
        {
          id: '124',
          tca: '2025-01-27T03:41:56.000',
          sat1_object_designator: '39089',
          sat2_object_designator: '27844'
        }
      ]
    };
    
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: mockEventsData
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const eventsQuery = `
      query GetEvents {
        events {
          id
          tca
          sat1_object_designator
          sat2_object_designator
        }
      }
    `;
    
    const result = await gql(eventsQuery);
    
    // Verify result contains events data
    expect(result).toEqual(mockEventsData);
    expect(result.events).toHaveLength(2);
    expect(result.events[0].id).toBe('123');
    expect(result.events[1].sat1_object_designator).toBe('39089');
  });
  
  it('should execute a mutation for creating a CDM event', async () => {
    // Mock successful response for event creation
    const mockEventCreationData = {
      insert_events_one: {
        id: '125',
        tca: '2025-01-28T04:41:56.000',
        sat1_object_designator: '39090',
        sat2_object_designator: '27845'
      }
    };
    
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: mockEventCreationData
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const createEventMutation = `
      mutation CreateEvent($tca: timestamptz!, $sat1_object_designator: String!, $sat2_object_designator: String!) {
        insert_events_one(object: {
          tca: $tca,
          sat1_object_designator: $sat1_object_designator,
          sat2_object_designator: $sat2_object_designator
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
      sat1_object_designator: '39090',
      sat2_object_designator: '27845'
    };
    
    const result = await gql(createEventMutation, variables);
    
    // Verify the mutation request was made correctly
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-hasura:8080/v1/graphql',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          query: createEventMutation,
          variables
        })
      })
    );
    
    // Verify result contains created event data
    expect(result).toEqual(mockEventCreationData);
    expect(result.insert_events_one.id).toBe('125');
    expect(result.insert_events_one.sat1_object_designator).toBe('39090');
  });
  
  it('should execute a mutation for inserting a CDM', async () => {
    // Mock successful response for CDM insertion
    const mockCdmInsertionData = {
      insert_cdms_one: {
        id: '456',
        tca: '2025-01-26T02:41:56.000',
        sat1_object_designator: '39088',
        sat2_object_designator: '27843',
        event_id: '123'
      }
    };
    
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: mockCdmInsertionData
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const insertCdmMutation = `
      mutation InsertCdm(
        $rawData: jsonb!,
        $tca: timestamp = null,
        $sat1_x: float8 = null,
        $sat1_y: float8 = null,
        $sat1_z: float8 = null,
        $sat2_x: float8 = null,
        $sat2_y: float8 = null,
        $sat2_z: float8 = null,
        $sat1_object_designator: String = null,
        $sat2_object_designator: String = null,
        $event_id: bigint = null,
        $collision_probability: float8 = null,
        $miss_distance: float8 = null
      ) {
        insert_cdms_one(object: {
          rawData: $rawData,
          tca: $tca,
          sat1_x: $sat1_x,
          sat1_y: $sat1_y,
          sat1_z: $sat1_z,
          sat2_x: $sat2_x,
          sat2_y: $sat2_y,
          sat2_z: $sat2_z,
          sat1_object_designator: $sat1_object_designator,
          sat2_object_designator: $sat2_object_designator,
          event_id: $event_id,
          collision_probability: $collision_probability,
          miss_distance: $miss_distance
        }) {
          id
          tca
          sat1_object_designator
          sat2_object_designator
          event_id
        }
      }
    `;
    
    const cdmData = {
      TCA: '2025-01-26T02:41:56.000',
      SAT1_OBJECT_DESIGNATOR: '39088',
      SAT2_OBJECT_DESIGNATOR: '27843',
      COLLISION_PROBABILITY: '1e-30',
      MISS_DISTANCE: '2926',
      SAT1_X: '5817.129',
      SAT1_Y: '3973.919',
      SAT1_Z: '1283.665',
      SAT2_X: '11634.541',
      SAT2_Y: '7949.533',
      SAT2_Z: '2569.700'
    };
    
    const variables = {
      rawData: [cdmData],
      tca: '2025-01-26T02:41:56.000',
      sat1_x: 5817.129,
      sat1_y: 3973.919,
      sat1_z: 1283.665,
      sat2_x: 11634.541,
      sat2_y: 7949.533,
      sat2_z: 2569.700,
      sat1_object_designator: '39088',
      sat2_object_designator: '27843',
      event_id: '123',
      collision_probability: 1e-30,
      miss_distance: 2926
    };
    
    const result = await gql(insertCdmMutation, variables);
    
    // Verify the mutation request was made correctly
    expect(mockFetch).toHaveBeenCalledWith(
      'http://test-hasura:8080/v1/graphql',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          query: insertCdmMutation,
          variables
        })
      })
    );
    
    // Verify result contains inserted CDM data
    expect(result).toEqual(mockCdmInsertionData);
    expect(result.insert_cdms_one.id).toBe('456');
    expect(result.insert_cdms_one.event_id).toBe('123');
  });
  
  it('should throw error for non-ok response', async () => {
    // Mock error response
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const query = 'query { test }';
    
    // Should throw error
    await expect(gql(query)).rejects.toThrow('HTTP error! status: 500');
  });
  
  it('should throw error when GraphQL returns errors', async () => {
    // Mock response with GraphQL errors
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: null,
        errors: [
          { message: 'Field "invalid" not found in type "Query"' },
          { message: 'Syntax error: unexpected "}}"' }
        ]
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const query = 'query { invalid fields }}';
    
    // Should throw error with concatenated messages
    await expect(gql(query)).rejects.toThrow('Field "invalid" not found in type "Query", Syntax error: unexpected "}}"');
  });
  
  it('should throw specific error for syntax errors in GraphQL query', async () => {
    // Mock response with syntax error
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: null,
        errors: [
          { message: 'Syntax error: unexpected "{", expecting NAME at line 1' }
        ]
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const malformedQuery = 'query { { test }';
    
    // Should throw the specific syntax error message
    await expect(gql(malformedQuery)).rejects.toThrow('Syntax error: unexpected "{", expecting NAME at line 1');
  });
  
  it('should use default Hasura URL if env var is not set', async () => {
    // Unset URL environment variable
    delete process.env.HASURA_GRAPHQL_URL;
    
    // Mock successful response
    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: { test: 'data' }
      })
    };
    
    mockFetch.mockResolvedValue(mockResponse);
    
    const query = 'query { test }';
    
    await gql(query);
    
    // Verify default URL was used
    expect(mockFetch).toHaveBeenCalledWith(
      'http://hasura:8080/v1/graphql',
      expect.any(Object)
    );
  });
}); 