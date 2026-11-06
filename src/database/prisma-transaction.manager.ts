import { Injectable } from '@nestjs/common';
import {
  TransactionManager,
  type TransactionOptions,
} from '../common/transactions/transaction-manager';
import { PrismaService } from './prisma.service';
import { transactionStorage } from './transaction-context';

const TRANSACTION_TIMEOUT_MS = 15_000;

@Injectable()
export class PrismaTransactionManager extends TransactionManager {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  run<T>(work: () => Promise<T>, options: TransactionOptions = {}): Promise<T> {
    // Transacciones anidadas se unen a la transacción externa.
    if (transactionStorage.getStore()) {
      return work();
    }

    return this.prisma.$transaction((tx) => transactionStorage.run(tx, work), {
      timeout: options.timeoutMs ?? TRANSACTION_TIMEOUT_MS,
    });
  }
}
