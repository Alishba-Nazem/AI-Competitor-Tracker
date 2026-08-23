import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { WorkspaceService } from './workspace.service';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, WorkspaceService],
  exports: [AuthService, JwtAuthGuard, WorkspaceService],
})
export class AuthModule {}
