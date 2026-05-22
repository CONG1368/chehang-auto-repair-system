import { Module } from '@nestjs/common';
import { BeautyController } from './beauty.controller';
import { BeautyService } from './beauty.service';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule],
  controllers: [BeautyController],
  providers: [BeautyService],
  exports: [BeautyService],
})
export class BeautyModule {}
