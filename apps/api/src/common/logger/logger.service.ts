import { Injectable, LoggerService } from '@nestjs/common';
import { configuration } from '../../config/configuration';

@Injectable()
export class AppLoggerService implements LoggerService {
  private isProduction = configuration.environment === 'production';

  log(message: any, context?: string) {
    this.printLog('info', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printLog('error', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.printLog('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.printLog('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.printLog('verbose', message, context);
  }

  private printLog(level: string, message: any, context?: string, trace?: string) {
    const timestamp = new Date().toISOString();
    
    if (this.isProduction) {
      // JSON structured logging
      const logObject = {
        timestamp,
        level,
        context: context || 'Application',
        message: typeof message === 'object' ? JSON.stringify(message) : message,
        ...(trace && { trace }),
      };
      console.log(JSON.stringify(logObject));
    } else {
      // Color coded terminal logging
      const color = level === 'error' ? '\x1b[31m' : level === 'warn' ? '\x1b[33m' : '\x1b[36m';
      const reset = '\x1b[0m';
      const ctxLabel = context ? `[${context}]` : '';
      console.log(`${color}${timestamp} [${level.toUpperCase()}] ${ctxLabel} ${message}${reset}`);
      if (trace) {
        console.error(trace);
      }
    }
  }
}
