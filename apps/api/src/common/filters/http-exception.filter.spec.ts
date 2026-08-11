import 'reflect-metadata';
import { HttpExceptionFilter } from './http-exception.filter';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockArgumentsHost: Partial<ArgumentsHost>;
  let mockResponse: any;
  let mockRequest: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-url',
      headers: {
        'x-correlation-id': 'test-correlation-id',
      },
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should catch and format HttpException correctly', () => {
    const exception = new HttpException('Bad request error message', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BAD_REQUEST_ERROR',
          message: 'Bad request error message',
        }),
        correlationId: 'test-correlation-id',
      })
    );
  });

  it('should catch and format generic Error as INTERNAL_SERVER_ERROR', () => {
    const exception = new Error('Generic database connection failed');

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'Error',
          message: 'Generic database connection failed',
        }),
        correlationId: 'test-correlation-id',
      })
    );
  });
});
