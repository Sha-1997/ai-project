import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<any>();
    const correlationId = request.headers['x-correlation-id'] || 'system-generated';

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let details: any = null;

    if (exception instanceof HttpException) {
      const resContent: any = exception.getResponse();
      errorMessage = resContent.message || exception.message;
      errorCode = resContent.error || 'BAD_REQUEST_ERROR';
      details = resContent.details || null;
    } else if (exception instanceof Error) {
      errorMessage = exception.message;
      errorCode = exception.name || 'UNKNOWN_ERROR';
    }

    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details,
      },
      timestamp: new Date().toISOString(),
      correlationId,
    };

    // Log the error detail
    console.error(`[JovianeX API] Exception caught on ${request.url}:`, exception);

    response.status(status).json(errorResponse);
  }
}
