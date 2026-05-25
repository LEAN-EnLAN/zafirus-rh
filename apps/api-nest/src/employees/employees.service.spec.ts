import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { Employee } from './employee.entity';
import { makeEmployee } from '../test-utils/fixtures.factory';

describe('EmployeesService', () => {
  const repo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  let service: EmployeesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({ providers: [EmployeesService, { provide: getRepositoryToken(Employee), useValue: repo }] }).compile();
    service = module.get(EmployeesService);
  });

  it('CRUD', async () => {
    const emp = makeEmployee();
    repo.create.mockReturnValue(emp);
    repo.save.mockResolvedValue(emp);
    repo.find.mockResolvedValue([emp]);
    repo.findOne.mockResolvedValue(emp);

    await expect(service.create({ firstName: 'Ana' })).resolves.toEqual(emp);
    await expect(service.findAll()).resolves.toEqual([emp]);
    await expect(service.findOne(emp.id)).resolves.toEqual(emp);
    await expect(service.update(emp.id, { area: 'Product' })).resolves.toMatchObject({ area: 'Product' });
  });

  it('findOne throws', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
