import express from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { getUsers } from './gql/query/getUsers';
import { gql } from './gql/hasuraClient';
import { processMockCdms } from './mockLogic/mockCdm';
import path from 'path';
import cors from 'cors';
import { insertCdm } from './gql/mutation/insertCdm';
import { findMatchingEvent } from './gql/query/findMatchingEvent';
import { createEvent } from './gql/mutation/createEvent';
import { verifyAuth } from './middleware/authentication';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import Arena from 'bull-arena';
import basicAuth from 'express-basic-auth';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();

// Redis Configuration
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

// Create Redis connection
const connection = new Redis(redisOptions);

// Create the CDM processing queue
const cdmQueue = new Queue('CDMProcessingQueue', { connection: redisOptions });

// Keep track of processed CDMs (for worker batching)
let lastProcessedIndex = 0;
const BATCH_SIZE = 5;

// Create servers for WebSocket support
const app = express();
const mainServer = http.createServer(app);
const io = new Server(mainServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected to WebSocket');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected from WebSocket');
  });
});

// Worker definition – processes batches of mock CDMs when a job is enqueued
const worker = new Worker('CDMProcessingQueue', async (job: Job) => {
  try {
    const mockCdmsPath = path.join(__dirname, 'mockCdms');
    const allCdmData = await processMockCdms(mockCdmsPath);
    
    // Notify start of processing
    io.emit('processingStart', { 
      timestamp: new Date(),
      message: 'Starting CDM batch processing'
    });
    
    // Process the next batch of CDMs
    const endIndex = Math.min(lastProcessedIndex + BATCH_SIZE, allCdmData.length);
    const batchCdms = allCdmData.slice(lastProcessedIndex, endIndex);
    const processedCdms = [];
    
    for (const cdmData of batchCdms) {
      const tca = new Date(cdmData.TCA);
      const tcaStart = new Date(tca.getTime() - 10 * 60 * 1000);
      const tcaEnd = new Date(tca.getTime() + 10 * 60 * 1000);

      // Check for an existing event
      const eventResult = await gql(findMatchingEvent, {
        sat1_object_designator: cdmData.SAT1_OBJECT_DESIGNATOR,
        sat2_object_designator: cdmData.SAT2_OBJECT_DESIGNATOR,
        tca_start: tcaStart.toISOString(),
        tca_end: tcaEnd.toISOString()
      });

      let eventId;
      if (eventResult.events.length > 0) {
        eventId = eventResult.events[0].id;
      } else {
        const newEventResult = await gql(createEvent, {
          tca: tca.toISOString(),
          sat1_object_designator: cdmData.SAT1_OBJECT_DESIGNATOR,
          sat2_object_designator: cdmData.SAT2_OBJECT_DESIGNATOR
        });
        eventId = newEventResult.insert_events_one.id;
      }

      const variables = {
        rawData: [cdmData],
        tca: new Date(cdmData.TCA).toISOString(),
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
        creation_date: new Date(cdmData.CREATION_DATE).toISOString(),
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
      };

      await gql(insertCdm, variables);
      
      processedCdms.push({
        sat1: cdmData.SAT1_OBJECT_DESIGNATOR,
        sat2: cdmData.SAT2_OBJECT_DESIGNATOR,
        tca: cdmData.TCA,
        eventId
      });
      
      // Emit progress update to connected clients
      io.emit('cdmProcessed', {
        timestamp: new Date(),
        cdm: {
          sat1: cdmData.SAT1_OBJECT_DESIGNATOR,
          sat2: cdmData.SAT2_OBJECT_DESIGNATOR,
          tca: cdmData.TCA
        }
      });
      
      console.log('Inserted CDM for:', cdmData.SAT1_OBJECT_DESIGNATOR);
    }
    
    // Update the index for the next batch
    lastProcessedIndex = endIndex;
    if (lastProcessedIndex >= allCdmData.length) {
      lastProcessedIndex = 0;
    }
    
    // Notify completion
    io.emit('processingComplete', {
      timestamp: new Date(),
      processedCount: processedCdms.length,
      cdms: processedCdms
    });
    
    return { processedCount: batchCdms.length, processedCdms };
  } catch (error) {
    console.error('Error processing CDM batch:', error);
    io.emit('processingError', {
      timestamp: new Date(),
      error: ":("
    });
    throw error;
  }
}, { connection: redisOptions });

// Setup Arena for monitoring BullMQ jobs
const arenaConfig = Arena(
  {
    BullMQ: Queue,
    queues: [
      {
        type: 'bullmq',
        name: 'CDMProcessingQueue',
        hostId: 'CDM Processing Worker',
        redis: redisOptions
      }
    ]
  },
  {
    basePath: '/arena',
    disableListen: true
  }
);

// Create a monitoring app for Arena
const monitorApp = express();
monitorApp.use(cors());

if (!process.env.ARENA_USERNAME || !process.env.ARENA_PASSWORD) {
  throw new Error('Environment variables ARENA_USERNAME and ARENA_PASSWORD must be set');
}

monitorApp.use('/arena', basicAuth({
  users: { [process.env.ARENA_USERNAME]: process.env.ARENA_PASSWORD },
  challenge: true,
  unauthorizedResponse: () => 'Unauthorized'
}));

monitorApp.use('/', arenaConfig);

app.use(express.json());
app.use(cors());

// GraphQL endpoint
app.post('/api/graphql', verifyAuth, (req: any, res: any) => {
  const { query, variables } = req.body;
  console.log('User data:', req.user);
  const hasuraHeaders = {
    'x-hasura-role': "admin",
    'x-hasura-user-id': req.user?.userId
  };

  gql(query, variables, hasuraHeaders)
    .then(result => res.json(result))
    .catch(error => {
      console.error('GraphQL error:', error);
      res.status(500).json({ error: 'GraphQL query failed' });
    });
});

// Health check endpoint
app.get('/health', (_, res) => {
  res.send({ status: 'alive' });
});

// Listen for worker errors
worker.on('failed', (job, err) => {
  if (job) {
    console.error(`[CDM_SERVICE] Job ${job.id} failed with error ${err.message}`);
    io.emit('jobFailed', {
      timestamp: new Date(),
      jobId: job.id,
      error: err.message
    });
  } else {
    console.error(`[CDM_SERVICE] A job failed with error ${err.message}`);
    io.emit('jobFailed', {
      timestamp: new Date(),
      error: err.message
    });
  }
});

// --- Repeatable job setup ---
// The following function is used to schedule the job to process CDMs
// on a daily (24h) basis. For now, we are commenting out its call.
// async function setupRepeatableJobs() {
//   const repeatables = await cdmQueue.getRepeatableJobs();
//   await Promise.all(
//     repeatables.map((repeatable) =>
//       cdmQueue.removeRepeatableByKey(repeatable.key)
//     )
//   );

//   await cdmQueue.add(
//     'processCDMBatch',
//     {},
//     {
//       repeat: { pattern: '0 0 * * *' }, // Every day at midnight (once every 24h)
//       jobId: 'repeatable-cdm-processing'
//     }
//   );
//   console.log('[CDM_SERVICE] Set up repeatable CDM processing job');
// }

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('[CDM_SERVICE] SIGTERM signal received: closing services');
  await worker.close();
  await cdmQueue.close();
  process.exit(0);
});

const MONITOR_PORT = 3837;
const API_PORT = process.env.PORT || 3000;

// Start the Arena monitoring server
monitorApp.listen(MONITOR_PORT, () => {
  console.log(`[CDM_SERVICE] Bull Arena is running on http://localhost:${MONITOR_PORT}/arena`);
});

// Start the main API server with WebSocket support
mainServer.listen(API_PORT, async () => {
  console.log(`[CDM_SERVICE] API server running on port ${API_PORT}`);
  
  // Wait for 30 seconds before starting the processing
  console.log('Waiting 30 seconds before processing mock CDMs...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // === Load and process all mock CDMs on server startup ===
  try {
    const mockCdmsPath = path.join(__dirname, 'mockCdms');
    const cdmDataArray = await processMockCdms(mockCdmsPath);
    console.log(`Found ${cdmDataArray.length} mock CDMs to process on startup.`);
    
    // Use a cache to avoid repeating event lookups for CDMs sharing the same event window.
    const eventCache = new Map<string, string>();

    for (const cdmData of cdmDataArray) {
      try {
        // Calculate TCA and related times only once.
        const tca = new Date(cdmData.TCA);
        const tcaIso = tca.toISOString();
        const tcaStart = new Date(tca.getTime() - 10 * 60 * 1000);
        const tcaEnd = new Date(tca.getTime() + 10 * 60 * 1000);
        const tcaStartIso = tcaStart.toISOString();
        const tcaEndIso = tcaEnd.toISOString();

        // Create a cache key based on designators and TCA.
        const cacheKey = `${cdmData.SAT1_OBJECT_DESIGNATOR}_${cdmData.SAT2_OBJECT_DESIGNATOR}_${tcaIso}`;
        
        let eventId = eventCache.get(cacheKey);
        if (!eventId) {
          // Check for an existing event
          const eventResult = await gql(findMatchingEvent, {
            sat1_object_designator: cdmData.SAT1_OBJECT_DESIGNATOR,
            sat2_object_designator: cdmData.SAT2_OBJECT_DESIGNATOR,
            tca_start: tcaStartIso,
            tca_end: tcaEndIso
          });
      
          if (eventResult.events.length > 0) {
            // Use existing event
            eventId = eventResult.events[0].id;
          } else {
            // Create a new event if none exists
            const newEventResult = await gql(createEvent, {
              tca: tcaIso,
              sat1_object_designator: cdmData.SAT1_OBJECT_DESIGNATOR,
              sat2_object_designator: cdmData.SAT2_OBJECT_DESIGNATOR
            });
            eventId = newEventResult.insert_events_one.id;
          }
          // Cache the eventId so that subsequent CDMs in the same window reuse it.
          if (eventId) {
            eventCache.set(cacheKey, eventId);
          }
        }
  
        console.log("eventId", eventId);
        const variables = {
          rawData: [cdmData],
          tca: tcaIso,
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
          creation_date: new Date(cdmData.CREATION_DATE).toISOString(),
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
        };
    
        const result = await gql(insertCdm, variables);
        console.log('Inserted CDM:', result);
      } catch (error) {
        console.error('Error inserting CDM:', error);
      }
    }
  } catch (error) {
    console.error('Error processing mock CDMs on startup:', error);
  }
  
  // Optionally, log additional data (e.g., list of users) after startup
  try {
    const result = await gql(getUsers);
    console.log(result);
  } catch (error) {
    console.error('Error fetching users:', error);
  }
});



