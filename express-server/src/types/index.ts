export interface HealthStatus {
    status: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    environment: string;
  }
  
  export interface ErrorResponse {
    message: string;
    stack?: string;
  }