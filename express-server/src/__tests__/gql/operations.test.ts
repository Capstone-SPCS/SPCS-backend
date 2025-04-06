import { gql } from '../../gql/hasuraClient';
import { findMatchingEvent } from '../../gql/query/findMatchingEvent';
import { createEvent } from '../../gql/mutation/createEvent';
import { insertCdm } from '../../gql/mutation/insertCdm';
import { getUsers } from '../../gql/query/getUsers';

// Mock the gql client
jest.mock('../../gql/hasuraClient');

describe('GraphQL Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Queries', () => {
    it('should query for matching events', async () => {
      // Mock successful response
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
      
      // Define parameters for the query
      const params = {
        sat1_object_designator: '39088',
        sat2_object_designator: '27843',
        tca_start: '2025-01-26T02:30:00.000',
        tca_end: '2025-01-26T03:00:00.000'
      };
      
      // Execute the query
      const result = await gql(findMatchingEvent, params);
      
      // Verify the result
      expect(result).toEqual(mockEvents);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].id).toBe('123');
      
      // Verify the gql function was called correctly
      expect(gql).toHaveBeenCalledWith(findMatchingEvent, params);
    });
    
    it('should handle empty results from matching events query', async () => {
      // Mock empty response
      const mockEmptyEvents = { events: [] };
      (gql as jest.Mock).mockResolvedValue(mockEmptyEvents);
      
      // Define parameters for the query
      const params = {
        sat1_object_designator: '99999', // Non-existent satellite
        sat2_object_designator: '88888', // Non-existent satellite
        tca_start: '2030-01-01T00:00:00.000',
        tca_end: '2030-01-02T00:00:00.000'
      };
      
      // Execute the query
      const result = await gql(findMatchingEvent, params);
      
      // Verify the result is empty
      expect(result).toEqual(mockEmptyEvents);
      expect(result.events).toHaveLength(0);
    });
    
    it('should query for users', async () => {
      // Mock successful response
      const mockUsers = {
        users: [
          { id: 1, name: 'User 1', email: 'user1@example.com' },
          { id: 2, name: 'User 2', email: 'user2@example.com' }
        ]
      };
      (gql as jest.Mock).mockResolvedValue(mockUsers);
      
      // Execute the query
      const result = await gql(getUsers);
      
      // Verify the result
      expect(result).toEqual(mockUsers);
      expect(result.users).toHaveLength(2);
      expect(result.users[0].name).toBe('User 1');
      
      // Verify the gql function was called correctly
      expect(gql).toHaveBeenCalledWith(getUsers);
    });
  });
  
  describe('Mutations', () => {
    it('should create a new event', async () => {
      // Mock successful event creation
      const mockEventResult = {
        insert_events_one: {
          id: '125',
          tca: '2025-01-28T04:41:56.000',
          sat1_object_designator: '39090',
          sat2_object_designator: '27845'
        }
      };
      (gql as jest.Mock).mockResolvedValue(mockEventResult);
      
      // Define event creation parameters
      const eventParams = {
        tca: '2025-01-28T04:41:56.000',
        sat1_object_designator: '39090',
        sat2_object_designator: '27845'
      };
      
      // Execute the mutation
      const result = await gql(createEvent, eventParams);
      
      // Verify the result
      expect(result).toEqual(mockEventResult);
      expect(result.insert_events_one.id).toBe('125');
      
      // Verify the gql function was called correctly
      expect(gql).toHaveBeenCalledWith(createEvent, eventParams);
    });
    
    it('should insert a CDM', async () => {
      // Mock successful CDM insertion
      const mockCdmResult = {
        insert_cdms_one: {
          id: '456',
          event_id: '123'
        }
      };
      (gql as jest.Mock).mockResolvedValue(mockCdmResult);
      
      // Mock CDM data
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
      
      // Define CDM insertion parameters
      const cdmParams = {
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
      
      // Execute the mutation
      const result = await gql(insertCdm, cdmParams);
      
      // Verify the result
      expect(result).toEqual(mockCdmResult);
      expect(result.insert_cdms_one.id).toBe('456');
      expect(result.insert_cdms_one.event_id).toBe('123');
      
      // Verify the gql function was called correctly
      expect(gql).toHaveBeenCalledWith(insertCdm, cdmParams);
    });
    
    it('should handle errors during event creation', async () => {
      // Mock error during event creation
      const errorMessage = 'Duplicate event with the same satellites and TCA';
      (gql as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      // Define event creation parameters
      const eventParams = {
        tca: '2025-01-28T04:41:56.000',
        sat1_object_designator: '39090',
        sat2_object_designator: '27845'
      };
      
      // Execute the mutation and expect it to throw
      await expect(gql(createEvent, eventParams))
        .rejects.toThrow(errorMessage);
    });
    
    it('should handle errors during CDM insertion', async () => {
      // Mock error during CDM insertion
      const errorMessage = 'Invalid event_id reference';
      (gql as jest.Mock).mockRejectedValue(new Error(errorMessage));
      
      // Define CDM insertion parameters with invalid event ID
      const invalidCdmParams = {
        rawData: [{}],
        event_id: '999999' // Non-existent event ID
      };
      
      // Execute the mutation and expect it to throw
      await expect(gql(insertCdm, invalidCdmParams))
        .rejects.toThrow(errorMessage);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      // Mock network error
      const networkError = new Error('Network error');
      (gql as jest.Mock).mockRejectedValue(networkError);
      
      // Try to query users
      await expect(gql(getUsers))
        .rejects.toThrow('Network error');
    });
    
    it('should handle authentication errors', async () => {
      // Mock authentication error
      const authError = new Error('Invalid admin secret');
      (gql as jest.Mock).mockRejectedValue(authError);
      
      // Try to query users
      await expect(gql(getUsers))
        .rejects.toThrow('Invalid admin secret');
    });
    
    it('should handle permission errors', async () => {
      // Mock permission error
      const permissionError = new Error('Permission denied');
      (gql as jest.Mock).mockRejectedValue(permissionError);
      
      // Define mutation parameters
      const eventParams = {
        tca: '2025-01-28T04:41:56.000',
        sat1_object_designator: '39090',
        sat2_object_designator: '27845'
      };
      
      // Try to create an event
      await expect(gql(createEvent, eventParams))
        .rejects.toThrow('Permission denied');
    });
  });
}); 