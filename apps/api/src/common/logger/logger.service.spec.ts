import 'reflect-metadata';
import { AppLoggerService } from './logger.service';

describe('AppLoggerService', () => {
  let loggerService: AppLoggerService;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    loggerService = new AppLoggerService();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should print normal text log in development mode', () => {
    // Force isProduction configuration to false
    (loggerService as any).isProduction = false;

    loggerService.log('test log message', 'TestContext');

    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedText = consoleLogSpy.mock.calls[0][0];
    expect(loggedText).toContain('[INFO]');
    expect(loggedText).toContain('[TestContext]');
    expect(loggedText).toContain('test log message');
  });

  it('should print structured JSON log in production mode', () => {
    // Force isProduction configuration to true
    (loggerService as any).isProduction = true;

    loggerService.log('test log message', 'TestContext');

    expect(consoleLogSpy).toHaveBeenCalled();
    const loggedText = consoleLogSpy.mock.calls[0][0];
    const logObject = JSON.parse(loggedText);
    expect(logObject.level).toBe('info');
    expect(logObject.context).toBe('TestContext');
    expect(logObject.message).toBe('test log message');
  });
});
