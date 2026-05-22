import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule],
  controllers: [SystemController],
  providers: [SystemService],
  exports: [SystemService],
})
export class SystemModule {}
