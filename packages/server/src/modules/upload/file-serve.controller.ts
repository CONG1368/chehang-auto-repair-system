import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from 'express';
import { join } from 'path';
import { existsSync, createReadStream } from 'fs';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class FileServeController {
  @Get(':module/:filename')
  async serveFile(
    @Param('module') module: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // 路径穿越防护：禁止 .. 与子路径分隔符
    if (
      module.includes('..') ||
      filename.includes('..') ||
      module.includes('/') ||
      filename.includes('\\')
    ) {
      throw new NotFoundException('文件不存在');
    }

    const filePath = join(process.cwd(), 'uploads', module, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException('文件不存在');
    }

    const stream = createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ code: 404, message: '文件读取失败' });
      }
    });
    stream.pipe(res);
  }
}
