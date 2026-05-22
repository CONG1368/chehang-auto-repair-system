import { Test, TestingModule } from '@nestjs/testing';
import { UploadService } from './upload.service';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();

    service = module.get<UploadService>(UploadService);

    jest.clearAllMocks();
  });

  describe('getUploadDir', () => {
    it('应返回基于模块名的上传目录路径', () => {
      const mockDir = '/mock/root/uploads/beauty';
      (path.join as jest.Mock).mockReturnValue(mockDir);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

      const result = service.getUploadDir('beauty');

      expect(result).toBe(mockDir);
      expect(path.join).toHaveBeenCalledWith(
        expect.any(String),
        '..',
        '..',
        '..',
        'uploads',
        'beauty',
      );
    });

    it('目录不存在时应创建目录', () => {
      const mockDir = '/mock/root/uploads/repair';
      (path.join as jest.Mock).mockReturnValue(mockDir);
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

      const result = service.getUploadDir('repair');

      expect(result).toBe(mockDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockDir, { recursive: true });
    });

    it('目录已存在时不应重复创建', () => {
      const mockDir = '/mock/root/uploads/avatar';
      (path.join as jest.Mock).mockReturnValue(mockDir);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);

      service.getUploadDir('avatar');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
