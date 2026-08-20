import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ChangesController } from './changes.controller';
import { ChangesService } from './changes.service';

@Module({
  imports: [PrismaModule],
  controllers: [ChangesController],
  providers: [ChangesService],
  exports: [ChangesService],
})
export class ChangesModule {}
