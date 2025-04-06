# API Documentation

This document outlines the API endpoints available in the MySpaceAgency-Backend.

## REST Endpoints

### Health Check

```
GET /health
```

**Description**: Simple health check endpoint to verify the server is running.

**Response**:
```json
{
  "status": "alive"
}
```

## GraphQL Endpoint

```
POST /api/graphql
```

**Description**: Proxy endpoint that forwards GraphQL queries to Hasura.

**Authentication**: Requires a valid JWT token in the Authorization header.

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Body**:
```json
{
  "query": "YOUR_GRAPHQL_QUERY",
  "variables": {}
}
```

**Example Query**:
```graphql
query GetEvents {
  events {
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
```

