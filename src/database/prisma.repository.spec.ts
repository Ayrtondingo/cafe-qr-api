import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaRepository } from './prisma.repository';
import { PrismaService } from './prisma.service';
import type { DbClient } from './transaction-context';

@Injectable()
class SampleRepository extends PrismaRepository {
  client(): DbClient {
    return this.db;
  }
}

describe('PrismaRepository', () => {
  it('Nest inyecta PrismaService en subclases sin constructor propio', async () => {
    const fakeDb = { kind: 'db' } as unknown as DbClient;
    const moduleRef = await Test.createTestingModule({
      providers: [SampleRepository, { provide: PrismaService, useValue: { db: fakeDb } }],
    }).compile();

    expect(moduleRef.get(SampleRepository).client()).toBe(fakeDb);
  });
});
