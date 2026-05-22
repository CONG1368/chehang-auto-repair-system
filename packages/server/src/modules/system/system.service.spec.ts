import { Test, TestingModule } from '@nestjs/testing';
import { SystemService } from './system.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('SystemService', () => {
  let service: SystemService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      systemConfig: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SystemService>(SystemService);
  });

  describe('getConfig', () => {
    it('数据库无配置时应返回所有默认值', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([]);

      const result = await service.getConfig();

      expect(result.appName).toBe('车行综合管理系统');
      expect(result.description).toBe('数字化管理 · 智能化运营 · 一体化服务');
      expect(result.businessHours).toBe('周一至周六 8:00-18:00');
      expect(result.hourlyRate).toBe('80');
      expect(result.maxDiscount).toBe('20');
      expect(result.minRecharge).toBe('500');
      expect(result.safetyStock).toBe('10');
      expect(result.maxStock).toBe('100');
      expect(result.smsEnabled).toBe('false');
      expect(result.autoGenerateOrderNo).toBe('true');
      expect(result.requireCheckPhoto).toBe('true');
      expect(result.logo).toBe('');
      expect(result.contactPhone).toBe('');
      expect(result.address).toBe('');
    });

    it('部分配置存在时应与默认值合并', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        { key: 'appName', value: '自定义车行名称' },
        { key: 'contactPhone', value: '13800001111' },
        { key: 'hourlyRate', value: '120' },
      ]);

      const result = await service.getConfig();

      // 数据库中有值的取数据库值
      expect(result.appName).toBe('自定义车行名称');
      expect(result.contactPhone).toBe('13800001111');
      expect(result.hourlyRate).toBe('120');

      // 数据库中没有的取默认值
      expect(result.description).toBe('数字化管理 · 智能化运营 · 一体化服务');
      expect(result.maxDiscount).toBe('20');
      expect(result.businessHours).toBe('周一至周六 8:00-18:00');
      expect(result.smsEnabled).toBe('false');
    });
  });

  describe('updateConfig', () => {
    it('应逐个 upsert 传入的配置项', async () => {
      // upsert 执行后，再调用 findMany 返回更新后的配置
      mockPrisma.systemConfig.upsert.mockResolvedValue({});
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        { key: 'appName', value: '新车行' },
        { key: 'contactPhone', value: '13900002222' },
      ]);

      const dto = { appName: '新车行', contactPhone: '13900002222' } as any;
      const result = await service.updateConfig(dto);

      // 验证 upsert 被调用了两次
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'appName' },
        update: { value: '新车行' },
        create: { key: 'appName', value: '新车行' },
      });
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'contactPhone' },
        update: { value: '13900002222' },
        create: { key: 'contactPhone', value: '13900002222' },
      });

      // 最终返回更新后的配置
      expect(result.appName).toBe('新车行');
    });

    it('应跳过值为 undefined 或 null 的配置项', async () => {
      mockPrisma.systemConfig.upsert.mockResolvedValue({});
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        { key: 'appName', value: '车行综合管理系统' },
      ]);

      const dto = { appName: '有效值', logo: undefined, address: null } as any;
      await service.updateConfig(dto);

      // 只对有效值调用 upsert，undefined 和 null 被跳过
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledTimes(1);
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'appName' },
        update: { value: '有效值' },
        create: { key: 'appName', value: '有效值' },
      });
    });

    it('应对值进行 trim 处理', async () => {
      mockPrisma.systemConfig.upsert.mockResolvedValue({});
      mockPrisma.systemConfig.findMany.mockResolvedValue([]);

      const dto = { appName: '  前后有空格  ' } as any;
      await service.updateConfig(dto);

      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'appName' },
        update: { value: '前后有空格' },
        create: { key: 'appName', value: '前后有空格' },
      });
    });
  });
});
