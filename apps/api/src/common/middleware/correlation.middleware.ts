import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationHeader = 'x-correlation-id';
    const correlationId = (req.headers[correlationHeader] as string) || randomUUID();
    
    req.headers[correlationHeader] = correlationId;
    res.setHeader(correlationHeader, correlationId);
    
    next();
  }
}
