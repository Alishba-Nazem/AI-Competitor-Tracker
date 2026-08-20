import { Module } from '@nestjs/common';
import { SnapshotProductsController } from './snapshot-products.controller';
import { SnapshotProductsService } from './snapshot-products.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SnapshotProductsController],
  providers: [SnapshotProductsService],
})
export class SnapshotProductsModule {}
