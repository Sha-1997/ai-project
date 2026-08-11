import 'reflect-metadata';
import { CorrelationMiddleware } from './correlation.middleware';
import { Request, Response, NextFunction } from 'express';

describe('CorrelationMiddleware', () => {
  let middleware: CorrelationMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new CorrelationMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should generate a new correlation ID if not present in request headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers['x-correlation-id']).toBeDefined();
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'x-correlation-id',
      mockRequest.headers['x-correlation-id']
    );
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should reuse existing correlation ID if present in request headers', () => {
    mockRequest.headers!['x-correlation-id'] = 'pre-existing-id';

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers['x-correlation-id']).toBe('pre-existing-id');
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', 'pre-existing-id');
    expect(nextFunction).toHaveBeenCalled();
  });
});
