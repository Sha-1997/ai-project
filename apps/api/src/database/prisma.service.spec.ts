import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call $connect on initialization', async () => {
    const connectSpy = jest.spyOn(service, '$connect').mockImplementation(async () => {});
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();
    connectSpy.mockRestore();
  });

  it('should call $disconnect on destruction', async () => {
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockImplementation(async () => {});
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
    disconnectSpy.mockRestore();
  });
});
