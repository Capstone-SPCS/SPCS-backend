import { verifyAuth } from '../../middleware/authentication';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn()
}));

describe('verifyAuth middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  
  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    nextFunction = jest.fn();
  });
  
  it('should verify valid token and call next', async () => {
    // Mock token
    const mockToken = 'valid.jwt.token';
    mockRequest.headers = {
      authorization: `Bearer ${mockToken}`
    };
    
    // Mock successful JWT verification
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'user123' });
    
    await verifyAuth(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );
    
    // Assertions
    expect(jwt.verify).toHaveBeenCalledWith(
      mockToken,
      process.env.JWT_SECRET as string
    );
    expect(mockRequest.body.userId).toBe('user123');
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });
  
  it('should return 401 when no token is provided', async () => {
    // No authorization header
    mockRequest.headers = {};
    
    await verifyAuth(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );
    
    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(nextFunction).not.toHaveBeenCalled();
  });
  
  it('should return 401 when token verification fails', async () => {
    // Mock token
    mockRequest.headers = {
      authorization: 'Bearer invalid.token'
    };
    
    // Mock JWT verification failure
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });
    
    await verifyAuth(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );
    
    // Assertions
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    expect(nextFunction).not.toHaveBeenCalled();
  });
}); 