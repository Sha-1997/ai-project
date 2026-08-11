import 'reflect-metadata';
import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<any>;
  let mockContext: Partial<ExecutionContext>;
  let mockCallHandler: Partial<CallHandler>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          headers: {
            'x-correlation-id': 'test-correlation-id',
          },
        }),
      }),
    };

    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of({ message: 'Success payload' })),
    };
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should transform response structure successfully', (done) => {
    interceptor
      .intercept(mockContext as ExecutionContext, mockCallHandler as CallHandler)
      .subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual({ message: 'Success payload' });
        expect(result.correlationId).toBe('test-correlation-id');
        expect(result.timestamp).toBeDefined();
        done();
      });
  });
});
