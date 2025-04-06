FROM node:18-alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install
RUN npm install -g ts-node

# Copy source code
COPY src/ ./src/

EXPOSE 3001

# Start directly with ts-node
CMD ["ts-node", "src/index.ts"]