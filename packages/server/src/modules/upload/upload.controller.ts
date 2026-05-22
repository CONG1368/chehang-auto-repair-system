import {
  Controller, Post, Delete, Query, UseGuards, UseInterceptors,
  UploadedFiles, BadRequestException, Param,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadService } from './upload.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

const ALLOWED_MODULES = ['common', 'customers', 'vehicles', 'repair', 'quality', 'parts', 'purchase', 'avatars', 'logo'];
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('batch')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: (req: any, _file, cb) => {
          const module = req.query?.module || 'common';
          if (!ALLOWED_MODULES.includes(module)) {
            cb(new BadRequestException(`无效的上传模块: ${module}`), '');
            return;
          }
          const svc = new UploadService();
          cb(null, svc.getUploadDir(module));
        },
        filename: (_req, file, cb) => {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const random = Math.round(Math.random() * 10000);
          cb(null, `${timestamp}-${random}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        if (ALLOWED_EXTS.includes(ext) && ALLOWED_MIMES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`不支持的文件类型: ${ext || file.mimetype}`), false);
        }
      },
    }),
  )
  async uploadBatch(@UploadedFiles() files: any[], @Query('module') module: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择文件');
    }
    const urls = files.map((f: any) => `/uploads/${module}/${f.filename}`);
    return { urls, count: files.length };
  }

  @Delete('file/:module/:filename')
  async deleteFile(
    @Param('module') module: string,
    @Param('filename') filename: string,
  ) {
    if (module.includes('..') || filename.includes('..') || module.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('无效的文件路径');
    }
    this.uploadService.deleteFile(module, filename);
    return { message: '文件已删除' };
  }
}
