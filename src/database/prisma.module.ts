import { Global, Module } from '@nestjs/common';
import { TransactionManager } from '../common/transactions/transaction-manager';
import { PrismaTransactionManager } from './prisma-transaction.manager';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, { provide: TransactionManager, useClass: PrismaTransactionManager }],
  exports: [PrismaService, TransactionManager],
})
export class PrismaModule {}
