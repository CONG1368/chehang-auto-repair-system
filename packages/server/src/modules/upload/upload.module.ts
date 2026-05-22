import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { FileServeController } from './file-serve.controller';

@Module({
  controllers: [UploadController, FileServeController],
  providers: [UploadService],
})
export class UploadModule {}
