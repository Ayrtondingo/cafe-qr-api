import { PrismaTransactionManager } from './prisma-transaction.manager';
import type { PrismaService } from './prisma.service';
import { DbClient, transactionStorage } from './transaction-context';

describe('PrismaTransactionManager', () => {
  const fakeTx = { kind: 'tx' } as unknown as DbClient;
  const $transaction = jest.fn((callback: (tx: DbClient) => Promise<unknown>) => callback(fakeTx));
  const manager = new PrismaTransactionManager({ $transaction } as unknown as PrismaService);

  beforeEach(() => $transaction.mockClear());

  it('expone el cliente transaccional dentro del bloque', async () => {
    const seen = await manager.run(() => Promise.resolve(transactionStorage.getStore()));

    expect(seen).toBe(fakeTx);
    expect(transactionStorage.getStore()).toBeUndefined();
  });

  it('une transacciones anidadas a la externa', async () => {
    await manager.run(() => manager.run(() => Promise.resolve('ok')));

    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it('propaga el error para que Prisma haga rollback', async () => {
    await expect(manager.run(() => Promise.reject(new Error('mesa ocupada')))).rejects.toThrow(
      'mesa ocupada',
    );
  });
});
