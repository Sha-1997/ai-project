import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

describe('PaginationDtoValidation', () => {
  it('should pass validation with default settings', async () => {
    const dtoInstance = plainToInstance(PaginationDto, {});
    const errors = await validate(dtoInstance);
    expect(errors.length).toBe(0);
    expect(dtoInstance.page).toBe(1);
    expect(dtoInstance.limit).toBe(10);
  });

  it('should pass validation with custom valid parameters', async () => {
    const validParams = { page: '5', limit: '50' };
    const dtoInstance = plainToInstance(PaginationDto, validParams, {
      enableImplicitConversion: true,
    });
    const errors = await validate(dtoInstance);
    expect(errors.length).toBe(0);
    expect(dtoInstance.page).toBe(5);
    expect(dtoInstance.limit).toBe(50);
  });

  it('should fail validation with invalid negative values', async () => {
    const invalidParams = { page: -1, limit: 150 };
    const dtoInstance = plainToInstance(PaginationDto, invalidParams);
    const errors = await validate(dtoInstance);
    expect(errors.length).toBeGreaterThan(0);
  });
});
