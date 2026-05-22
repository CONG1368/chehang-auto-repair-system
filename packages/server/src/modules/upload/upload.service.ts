import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadService {
  getUploadDir(module: string): string {
    const dir = join(__dirname, '..', '..', '..', 'uploads', module);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  getFilePath(module: string, filename: string): string {
    return join(this.getUploadDir(module), filename);
  }

  deleteFile(module: string, filename: string): void {
    const filePath = this.getFilePath(module, filename);
    if (existsSync(filePath)) unlinkSync(filePath);
  }
}
