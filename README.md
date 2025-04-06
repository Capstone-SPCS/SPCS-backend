# MySpaceAgency-Backend

This is the backend server for the MySpaceAgency application, which handles CDM (Conjunction Data Message) processing and provides GraphQL API access to satellite conjunction data.

## System Architecture

The backend consists of the following components:

1. **Express Server**: Node.js/TypeScript server that processes CDM files and provides REST/GraphQL API endpoints
2. **Hasura GraphQL Engine**: Provides a GraphQL API layer over the database
3. **Redis**: Used for queue management and caching
4. **Supabase**: External PostgreSQL database service for data storage

## Running the Application

### Prerequisites

- Docker and Docker Compose
- Node.js (for local development)
- A `.env` file with the required environment variables

### Starting the Server

The simplest way to run the entire application stack is using Docker Compose:

```bash
# From the root directory of the project
docker-compose up --build
```

This command does the following:

1. **`docker-compose up`**: Starts all services defined in the docker-compose.yml file
2. **`--build`**: Forces Docker to rebuild the images, ensuring you have the latest code changes

The server will be accessible at:
- Express server: http://localhost:3001 (or the port defined in your .env)
- Hasura console: http://localhost:8080/console

### Running Only the Express Server Locally

To run just the Express server without Docker (for development):

```bash
cd express-server
npm install
npm run dev
```

### Running Tests

```bash
cd express-server
npm test
```

For more detailed information about testing, see the [Testing Documentation](./src/__tests__/README.md).

## Environment Variables

The application uses two sets of environment variables:

### Root .env File

This file contains variables used by Docker Compose:

```
# Server Configuration
PORT=3001                    # Port for the Express server
NODE_ENV=development         # Environment (development, production)

# Hasura Configuration
HASURA_GRAPHQL_ADMIN_SECRET  # Admin password for Hasura
HASURA_GRAPHQL_JWT_SECRET    # JWT configuration for Hasura auth
HASURA_GRAPHQL_DATABASE_URL  # PostgreSQL connection string for Hasura

# JWT Configuration
JWT_SECRET                   # Secret for JWT token generation/validation

# Supabase Configuration
SUPABASE_URL                 # URL of your Supabase instance
SUPABASE_ANON_KEY            # Supabase anonymous key for public operations
SUPABASE_SERVICE_ROLE_KEY    # Service role key for privileged operations
```

### Express Server .env File

The Express server has its own environment variables:

```
# Server Configuration
PORT=3001                    # Port the server runs on
NODE_ENV=development         # Environment mode

# Security
JWT_SECRET                   # Secret for JWT tokens
HASURA_GRAPHQL_ADMIN_SECRET  # Secret for Hasura admin access

# Supabase Connection
SUPABASE_URL                 # Supabase instance URL
SUPABASE_ANON_KEY            # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY    # Supabase service role key

# Redis Configuration
REDIS_PORT=6379              # Redis port
REDIS_HOST=redis             # Redis hostname
ARENA_USERNAME               # Username for Bull Arena queue UI
ARENA_PASSWORD               # Password for Bull Arena queue UI
```

## Docker Containers

The application runs several Docker containers, each serving a specific purpose:

### 1. Redis Container

**Image**: `redis:7`  
**Purpose**: Acts as a message broker and queue manager for BullMQ, which handles CDM processing jobs. It stores job data, allows for retries, and ensures processing reliability.  

**Configuration**:
- Runs with `--replica-read-only no` to ensure write access
- Has a health check to ensure it's running properly before other services start

### 2. Express Server Container

**Image**: Custom build from Dockerfile  
**Purpose**: The main application server that:
- Processes CDM files
- Provides REST API endpoints
- Acts as a GraphQL client to Hasura
- Manages authentication
- Handles WebSocket connections for real-time updates  

**Configuration**:
- Maps the host port to the container port
- Mounts the express-server directory as a volume for development
- Has a health check that pings the `/health` endpoint

### 3. Hasura Container

**Image**: `hasura/graphql-engine:v2.28.0`  
**Purpose**: Provides a GraphQL API layer over the PostgreSQL database in Supabase, allowing:
- Complex queries with relationships
- Real-time subscriptions
- Role-based access control
- Authorization with JWT  
**Configuration**:
- Connects to the Supabase PostgreSQL database using the connection string from HASURA_GRAPHQL_DATABASE_URL environment variable
- Enables the admin console for management
- Configured with JWT authentication
- Has a health check to ensure it's running properly

## Database

The application uses a PostgreSQL database hosted on Supabase. The database stores:
- Satellite conjunction events
- CDM data
- User information

Hasura provides a GraphQL interface to this database, enabling complex queries and mutations.

## API Endpoints

The Express server exposes the following key endpoints:

- **GET /health**: Health check endpoint
- **POST /api/graphql**: GraphQL endpoint that proxies requests to Hasura

