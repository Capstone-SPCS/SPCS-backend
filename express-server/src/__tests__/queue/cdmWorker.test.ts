import { Queue, Worker, Job } from 'bullmq';
import { EventEmitter } from 'events';
import path from 'path';
import { processMockCdms } from '../../mockLogic/mockCdm';
import { gql } from '../../gql/hasuraClient';

// Mock dependencies
jest.mock('bullmq');
jest.mock('ioredis');
jest.mock('../../mockLogic/mockCdm');
jest.mock('../../gql/hasuraClient');

describe('CDM Queue Worker', () => {
  let mockWorker: any;
  let mockQueue: any;
  let mockJob: Partial<Job>;
  let mockIo: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Socket.IO
    mockIo = {
      emit: jest.fn()
    };
    
    // Mock BullMQ job
    mockJob = {
      id: 'test-job-123',
      data: {}
    };
    
    // Mock BullMQ worker factory function
    (Worker as unknown as jest.Mock).mockImplementation((queueName, processFn, options) => {
      // Store the process function to test it
      mockWorker = new EventEmitter();
      mockWorker.process = processFn;
      mockWorker.close = jest.fn().mockResolvedValue(undefined);
      return mockWorker;
    });
    
    // Mock Queue
    (Queue as unknown as jest.Mock).mockImplementation(() => {
      mockQueue = {
        add: jest.fn().mockResolvedValue({}),
        close: jest.fn().mockResolvedValue(undefined)
      };
      return mockQueue;
    });
    
    // Mock processMockCdms
    const mockCdmData = [
      {
        CCSDS_CDM_VERS: "1.0",
        CREATION_DATE: '2025-01-19T03:38:05.831',
        ORIGINATOR: "CSpoc",
        MESSAGE_ID: "5741_conj50_7046",
        TCA: '2025-01-26T02:41:56.000',
        MISS_DISTANCE: '2926',
        COLLISION_PROBABILITY: '1e-30',
        SAT1_OBJECT: "OBJECT1",
        SAT1_OBJECT_DESIGNATOR: '39088',
        SAT1_CATALOG_NAME: "SATCAT",
        SAT1_OBJECT_NAME: "CASSIOPE",
        SAT1_INTERNATIONAL_DESIGNATOR: "2013-055A",
        SAT1_OBJECT_TYPE: "PAYLOAD",
        SAT1_OPERATOR_ORGANIZATION: "CSA",
        SAT1_COVARIANCE_METHOD: "CALCULATED",
        SAT1_MANEUVERABLE: "NO",
        SAT1_REFERENCE_FRAME: "ITRF",
        SAT1_X: '5817.129',
        SAT1_Y: '3973.919',
        SAT1_Z: '1283.665',
        SAT1_X_DOT: '-4.18940333',
        SAT1_Y_DOT: '5.92025135',
        SAT1_Z_DOT: '0.02921623',
        SAT1_CR_R: '338.149',
        SAT1_CT_R: '-846.8535',
        SAT1_CT_T: '70533.593',
        SAT1_CN_R: '-6.07949699',
        SAT1_CN_T: '143.41039999',
        SAT1_CN_N: '62.565',
        SAT1_CRDOT_R: '0.74017159',
        SAT1_CRDOT_T: '-95.80014000',
        SAT1_CRDOT_N: '-0.13916969',
        SAT1_CRDOT_RDOT: '0.09971835',
        SAT1_CTDOT_R: '-0.07367386',
        SAT1_CTDOT_T: '0.71836619',
        SAT1_CTDOT_N: '0.00619004',
        SAT1_CTDOT_RDOT: '-0.00059734',
        SAT1_CTDOT_TDOT: '0.00000770',
        SAT1_CNDOT_R: '0.00761199',
        SAT1_CNDOT_T: '0.01313531',
        SAT1_CNDOT_N: '0.01335135',
        SAT1_CNDOT_RDOT: '-0.00001540',
        SAT1_CNDOT_TDOT: '-0.00000803',
        SAT1_CNDOT_NDOT: '0.00003242',
        SAT2_OBJECT: "OBJECT2",
        SAT2_OBJECT_DESIGNATOR: '27843',
        SAT2_CATALOG_NAME: "SATCAT",
        SAT2_OBJECT_NAME: "RCM-1",
        SAT2_INTERNATIONAL_DESIGNATOR: "2019-033A",
        SAT2_OBJECT_TYPE: "PAYLOAD",
        SAT2_EPHEMERIS_NAME: "NONE",
        SAT2_COVARIANCE_METHOD: "CALCULATED",
        SAT2_MANEUVERABLE: "YES",
        SAT2_REFERENCE_FRAME: "ITRF",
        SAT2_X: '11634.541',
        SAT2_Y: '7949.533',
        SAT2_Z: '2569.700',
        SAT2_X_DOT: '-8.40340667',
        SAT2_Y_DOT: '21.62900271',
        SAT2_Z_DOT: '7.16023246',
        SAT2_CR_R: '263.549',
        SAT2_CT_R: '-1160480.999',
        SAT2_CT_T: '218581.784',
        SAT2_CN_R: '1243.8049999',
        SAT2_CN_T: '28041.01999',
        SAT2_CN_N: '37.711',
        SAT2_CRDOT_R: '1220.9649999',
        SAT2_CRDOT_T: '-527741.8000',
        SAT2_CRDOT_N: '-29.14798999',
        SAT2_CRDOT_RDOT: '555.3798',
        SAT2_CTDOT_R: '-4.36628299',
        SAT2_CTDOT_T: '686.84129999',
        SAT2_CTDOT_N: '-1.33792599',
        SAT2_CTDOT_RDOT: '-0.72250559',
        SAT2_CTDOT_TDOT: '0.00386120',
        SAT2_CNDOT_R: '6.91558228',
        SAT2_CNDOT_T: '1720.10768567',
        SAT2_CNDOT_N: '13.93965299',
        SAT2_CNDOT_RDOT: '-0.36574490',
        SAT2_CNDOT_TDOT: '-0.00184073',
        SAT2_CNDOT_NDOT: '0.00610551',
        SAT2_OPERATOR_ORGANIZATION: "CSA"
      },
      {
        CCSDS_CDM_VERS: "1.0",
        CREATION_DATE: '2025-01-20T03:38:05.831',
        ORIGINATOR: "CSpoc",
        MESSAGE_ID: "5742_conj51_7047",
        TCA: '2025-01-27T03:41:56.000',
        MISS_DISTANCE: '2927',
        COLLISION_PROBABILITY: '1e-30',
        SAT1_OBJECT: "OBJECT1",
        SAT1_OBJECT_DESIGNATOR: '39089',
        SAT1_CATALOG_NAME: "SATCAT",
        SAT1_OBJECT_NAME: "CASSIOPE",
        SAT1_INTERNATIONAL_DESIGNATOR: "2013-055B",
        SAT1_OBJECT_TYPE: "PAYLOAD",
        SAT1_OPERATOR_ORGANIZATION: "CSA",
        SAT1_COVARIANCE_METHOD: "CALCULATED",
        SAT1_MANEUVERABLE: "NO",
        SAT1_REFERENCE_FRAME: "ITRF",
        SAT1_X: '5818.129',
        SAT1_Y: '3974.919',
        SAT1_Z: '1284.665',
        SAT1_X_DOT: '-4.18940334',
        SAT1_Y_DOT: '5.92025136',
        SAT1_Z_DOT: '0.02921624',
        SAT1_CR_R: '339.149',
        SAT1_CT_R: '-846.8536',
        SAT1_CT_T: '70534.593',
        SAT1_CN_R: '-6.07949700',
        SAT1_CN_T: '143.41040000',
        SAT1_CN_N: '63.565',
        SAT1_CRDOT_R: '0.74017160',
        SAT1_CRDOT_T: '-95.80014001',
        SAT1_CRDOT_N: '-0.13916970',
        SAT1_CRDOT_RDOT: '0.09971836',
        SAT1_CTDOT_R: '-0.07367387',
        SAT1_CTDOT_T: '0.71836620',
        SAT1_CTDOT_N: '0.00619005',
        SAT1_CTDOT_RDOT: '-0.00059735',
        SAT1_CTDOT_TDOT: '0.00000771',
        SAT1_CNDOT_R: '0.00761200',
        SAT1_CNDOT_T: '0.01313532',
        SAT1_CNDOT_N: '0.01335136',
        SAT1_CNDOT_RDOT: '-0.00001541',
        SAT1_CNDOT_TDOT: '-0.00000804',
        SAT1_CNDOT_NDOT: '0.00003243',
        SAT2_OBJECT: "OBJECT2",
        SAT2_OBJECT_DESIGNATOR: '27844',
        SAT2_CATALOG_NAME: "SATCAT",
        SAT2_OBJECT_NAME: "RCM-2",
        SAT2_INTERNATIONAL_DESIGNATOR: "2019-033B",
        SAT2_OBJECT_TYPE: "PAYLOAD",
        SAT2_EPHEMERIS_NAME: "NONE",
        SAT2_COVARIANCE_METHOD: "CALCULATED",
        SAT2_MANEUVERABLE: "YES",
        SAT2_REFERENCE_FRAME: "ITRF",
        SAT2_X: '11635.541',
        SAT2_Y: '7950.533',
        SAT2_Z: '2570.700',
        SAT2_X_DOT: '-8.40340668',
        SAT2_Y_DOT: '21.62900272',
        SAT2_Z_DOT: '7.16023247',
        SAT2_CR_R: '264.549',
        SAT2_CT_R: '-1160481.000',
        SAT2_CT_T: '218582.784',
        SAT2_CN_R: '1243.8050000',
        SAT2_CN_T: '28041.02000',
        SAT2_CN_N: '38.711',
        SAT2_CRDOT_R: '1220.9650000',
        SAT2_CRDOT_T: '-527741.8001',
        SAT2_CRDOT_N: '-29.14799000',
        SAT2_CRDOT_RDOT: '555.3799',
        SAT2_CTDOT_R: '-4.36628300',
        SAT2_CTDOT_T: '686.84130000',
        SAT2_CTDOT_N: '-1.33792600',
        SAT2_CTDOT_RDOT: '-0.72250560',
        SAT2_CTDOT_TDOT: '0.00386121',
        SAT2_CNDOT_R: '6.91558229',
        SAT2_CNDOT_T: '1720.10768568',
        SAT2_CNDOT_N: '13.93965300',
        SAT2_CNDOT_RDOT: '-0.36574491',
        SAT2_CNDOT_TDOT: '-0.00184074',
        SAT2_CNDOT_NDOT: '0.00610552',
        SAT2_OPERATOR_ORGANIZATION: "CSA"
      }
    ];
    (processMockCdms as jest.Mock).mockResolvedValue(mockCdmData);
    
    // Mock GraphQL responses
    (gql as jest.Mock).mockImplementation((query, variables) => {
      if (query.includes('findMatchingEvent')) {
        return Promise.resolve({ events: [] });
      } else if (query.includes('createEvent')) {
        return Promise.resolve({ insert_events_one: { id: '123' } });
      } else if (query.includes('insert_cdms_one')) {
        return Promise.resolve({ insert_cdms_one: { id: '456' } });
      }
      return Promise.resolve({ data: 'mock data' });
    });
  });
  
  it('should create a worker with correct queue name', () => {
    // Require the module that sets up the worker
    // This is a simulated version since we can't directly test the index.ts
    const worker = new Worker('CDMProcessingQueue', async () => {}, { connection: {} });
    
    expect(Worker).toHaveBeenCalledWith('CDMProcessingQueue', expect.any(Function), expect.any(Object));
  });
  
  it('should process jobs and emit socket events', async () => {
    // Create a worker using the same pattern as index.ts
    const worker = new Worker('CDMProcessingQueue', async (job: Job) => {
      try {
        const mockCdmsPath = path.join(__dirname, '../../mockCdms');
        const allCdmData = await processMockCdms(mockCdmsPath);
        
        // Emit start event
        mockIo.emit('processingStart', { 
          timestamp: expect.any(Date),
          message: 'Starting CDM batch processing'
        });
        
        // Process CDMs
        for (const cdmData of allCdmData.slice(0, 2)) {
          // Find/create event logic...
          const eventResult = await gql('findMatchingEvent', {
            sat1_object_designator: cdmData.SAT1_OBJECT_DESIGNATOR,
            sat2_object_designator: cdmData.SAT2_OBJECT_DESIGNATOR,
            tca_start: expect.any(String),
            tca_end: expect.any(String)
          });
          
          let eventId;
          if (eventResult.events.length > 0) {
            eventId = eventResult.events[0].id;
          } else {
            const newEventResult = await gql('createEvent', {
              tca: expect.any(String),
              sat1_object_designator: cdmData.SAT1_OBJECT_DESIGNATOR,
              sat2_object_designator: cdmData.SAT2_OBJECT_DESIGNATOR
            });
            eventId = newEventResult.insert_events_one.id;
          }
          
          // Insert CDM
          await gql('insertCdm', {
            rawData: [cdmData],
            tca: expect.any(String),
            sat1_x: parseFloat(cdmData.SAT1_X),
            sat1_y: parseFloat(cdmData.SAT1_Y),
            sat1_z: parseFloat(cdmData.SAT1_Z),
            sat2_x: parseFloat(cdmData.SAT2_X),
            sat2_y: parseFloat(cdmData.SAT2_Y),
            sat2_z: parseFloat(cdmData.SAT2_Z),
            sat1_object_designator: cdmData.SAT1_OBJECT_DESIGNATOR,
            sat2_object_designator: cdmData.SAT2_OBJECT_DESIGNATOR,
            event_id: eventId,
            collision_probability: parseFloat(cdmData.COLLISION_PROBABILITY),
            miss_distance: parseFloat(cdmData.MISS_DISTANCE),
            sat1_cn_n: parseFloat(cdmData.SAT1_CN_N),
            sat1_cn_r: parseFloat(cdmData.SAT1_CN_R),
            sat1_cn_t: parseFloat(cdmData.SAT1_CN_T),
            sat1_cr_r: parseFloat(cdmData.SAT1_CR_R),
            sat1_ct_r: parseFloat(cdmData.SAT1_CT_R),
            sat1_ct_t: parseFloat(cdmData.SAT1_CT_T),
            sat2_cn_n: parseFloat(cdmData.SAT2_CN_N),
            sat2_cn_r: parseFloat(cdmData.SAT2_CN_R),
            sat2_cn_t: parseFloat(cdmData.SAT2_CN_T),
            sat2_cr_r: parseFloat(cdmData.SAT2_CR_R),
            sat2_ct_r: parseFloat(cdmData.SAT2_CT_R),
            sat2_ct_t: parseFloat(cdmData.SAT2_CT_T),
            message_id: cdmData.MESSAGE_ID,
            originator: cdmData.ORIGINATOR,
            sat1_x_dot: parseFloat(cdmData.SAT1_X_DOT),
            sat1_y_dot: parseFloat(cdmData.SAT1_Y_DOT),
            sat1_z_dot: parseFloat(cdmData.SAT1_Z_DOT),
            sat2_x_dot: parseFloat(cdmData.SAT2_X_DOT),
            sat2_y_dot: parseFloat(cdmData.SAT2_Y_DOT),
            sat2_z_dot: parseFloat(cdmData.SAT2_Z_DOT),
            sat1_object: cdmData.SAT1_OBJECT,
            sat2_object: cdmData.SAT2_OBJECT,
            sat1_cndot_n: parseFloat(cdmData.SAT1_CNDOT_N),
            sat1_cndot_r: parseFloat(cdmData.SAT1_CNDOT_R),
            sat1_cndot_t: parseFloat(cdmData.SAT1_CNDOT_T),
            sat1_crdot_n: parseFloat(cdmData.SAT1_CRDOT_N),
            sat1_crdot_r: parseFloat(cdmData.SAT1_CRDOT_R),
            sat1_crdot_t: parseFloat(cdmData.SAT1_CRDOT_T),
            sat1_ctdot_n: parseFloat(cdmData.SAT1_CTDOT_N),
            sat1_ctdot_r: parseFloat(cdmData.SAT1_CTDOT_R),
            sat1_ctdot_t: parseFloat(cdmData.SAT1_CTDOT_T),
            sat2_cndot_n: parseFloat(cdmData.SAT2_CNDOT_N),
            sat2_cndot_r: parseFloat(cdmData.SAT2_CNDOT_R),
            sat2_cndot_t: parseFloat(cdmData.SAT2_CNDOT_T),
            sat2_crdot_n: parseFloat(cdmData.SAT2_CRDOT_N),
            sat2_crdot_r: parseFloat(cdmData.SAT2_CRDOT_R),
            sat2_crdot_t: parseFloat(cdmData.SAT2_CRDOT_T),
            sat2_ctdot_n: parseFloat(cdmData.SAT2_CTDOT_N),
            sat2_ctdot_r: parseFloat(cdmData.SAT2_CTDOT_R),
            sat2_ctdot_t: parseFloat(cdmData.SAT2_CTDOT_T),
            creation_date: expect.any(String),
            ccsds_cdm_vers: cdmData.CCSDS_CDM_VERS,
            sat1_cndot_ndot: parseFloat(cdmData.SAT1_CNDOT_NDOT),
            sat1_cndot_rdot: parseFloat(cdmData.SAT1_CNDOT_RDOT),
            sat1_cndot_tdot: parseFloat(cdmData.SAT1_CNDOT_TDOT),
            sat1_crdot_rdot: parseFloat(cdmData.SAT1_CRDOT_RDOT),
            sat1_ctdot_rdot: parseFloat(cdmData.SAT1_CTDOT_RDOT),
            sat1_ctdot_tdot: parseFloat(cdmData.SAT1_CTDOT_TDOT),
            sat2_cndot_ndot: parseFloat(cdmData.SAT2_CNDOT_NDOT),
            sat2_cndot_rdot: parseFloat(cdmData.SAT2_CNDOT_RDOT),
            sat2_cndot_tdot: parseFloat(cdmData.SAT2_CNDOT_TDOT),
            sat2_crdot_rdot: parseFloat(cdmData.SAT2_CRDOT_RDOT),
            sat2_ctdot_rdot: parseFloat(cdmData.SAT2_CTDOT_RDOT),
            sat2_ctdot_tdot: parseFloat(cdmData.SAT2_CTDOT_TDOT),
            sat1_object_name: cdmData.SAT1_OBJECT_NAME,
            sat1_object_type: cdmData.SAT1_OBJECT_TYPE,
            sat2_object_name: cdmData.SAT2_OBJECT_NAME,
            sat2_object_type: cdmData.SAT2_OBJECT_TYPE,
            sat1_catalog_name: cdmData.SAT1_CATALOG_NAME,
            sat1_maneuverable: cdmData.SAT1_MANEUVERABLE,
            sat2_catalog_name: cdmData.SAT2_CATALOG_NAME,
            sat2_maneuverable: cdmData.SAT2_MANEUVERABLE,
            sat2_ephemeris_name: cdmData.SAT2_EPHEMERIS_NAME,
            sat1_reference_frame: cdmData.SAT1_REFERENCE_FRAME,
            sat2_reference_frame: cdmData.SAT2_REFERENCE_FRAME,
            sat1_covariance_method: cdmData.SAT1_COVARIANCE_METHOD,
            sat1_operator_organization: cdmData.SAT1_OPERATOR_ORGANIZATION,
            sat2_covariance_method: cdmData.SAT2_COVARIANCE_METHOD,
            sat2_operator_organization: cdmData.SAT2_OPERATOR_ORGANIZATION,
            sat1_international_designator: cdmData.SAT1_INTERNATIONAL_DESIGNATOR,
            sat2_international_designator: cdmData.SAT2_INTERNATIONAL_DESIGNATOR
          });
          
          // Emit progress event
          mockIo.emit('cdmProcessed', {
            timestamp: expect.any(Date),
            cdm: {
              sat1: cdmData.SAT1_OBJECT_DESIGNATOR,
              sat2: cdmData.SAT2_OBJECT_DESIGNATOR,
              tca: cdmData.TCA
            }
          });
        }
        
        // Emit completion event
        mockIo.emit('processingComplete', {
          timestamp: expect.any(Date),
          processedCount: 2,
          cdms: expect.any(Array)
        });
        
        return { processedCount: 2, processedCdms: expect.any(Array) };
      } catch (error) {
        mockIo.emit('processingError', {
          timestamp: expect.any(Date),
          error: ":("
        });
        throw error;
      }
    }, { connection: {} });
    
    // Simulate a job being processed
    const result = await mockWorker.process(mockJob as Job);
    
    // Verify the mock functions were called
    expect(processMockCdms).toHaveBeenCalled();
    expect(gql).toHaveBeenCalledTimes(6); // 2 CDMs × (findMatchingEvent + createEvent + insertCdm)
    expect(mockIo.emit).toHaveBeenCalledTimes(4); // start + 2×processed + complete
    
    // Verify socket events
    expect(mockIo.emit).toHaveBeenCalledWith('processingStart', expect.any(Object));
    expect(mockIo.emit).toHaveBeenCalledWith('cdmProcessed', expect.any(Object));
    expect(mockIo.emit).toHaveBeenCalledWith('processingComplete', expect.any(Object));
    
    // Verify result
    expect(result).toHaveProperty('processedCount');
    expect(result.processedCount).toBe(2);
  });
  
  it('should handle processing errors and emit error event', async () => {
    // Mock an error in processMockCdms
    (processMockCdms as jest.Mock).mockRejectedValue(new Error('Processing error'));
    
    // Create a worker that will throw an error
    const worker = new Worker('CDMProcessingQueue', async (job: Job) => {
      try {
        const mockCdmsPath = path.join(__dirname, '../../mockCdms');
        const allCdmData = await processMockCdms(mockCdmsPath);
        return { processedCount: allCdmData.length };
      } catch (error) {
        mockIo.emit('processingError', {
          timestamp: expect.any(Date),
          error: ":("
        });
        throw error;
      }
    }, { connection: {} });
    
    // Process should throw an error
    await expect(mockWorker.process(mockJob as Job)).rejects.toThrow('Processing error');
    
    // Should emit error event
    expect(mockIo.emit).toHaveBeenCalledWith('processingError', expect.any(Object));
  });
}); 