import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSystemConfigDto } from './dto/system.dto';

@Injectable()
export class SystemService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取系统配置，返回键值对字典，缺失项使用默认值 */
  async getConfig() {
    const configs = await this.prisma.systemConfig.findMany();
    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.value;
    }
    // ===== 基本设置默认值 =====
    if (!result.logo) result.logo = '';
    if (!result.appName) result.appName = '车行综合管理系统';
    if (!result.description) result.description = '数字化管理 · 智能化运营 · 一体化服务';
    if (!result.contactPhone) result.contactPhone = '';
    if (!result.address) result.address = '';
    if (!result.businessHours) result.businessHours = '周一至周六 8:00-18:00';

    // ===== 业务规则默认值 =====
    if (!result.hourlyRate) result.hourlyRate = '80';
    if (!result.maxDiscount) result.maxDiscount = '20';
    if (!result.minRecharge) result.minRecharge = '500';
    if (!result.safetyStock) result.safetyStock = '10';
    if (!result.maxStock) result.maxStock = '100';

    // ===== 系统开关默认值 =====
    if (!result.smsEnabled) result.smsEnabled = 'false';
    if (!result.autoGenerateOrderNo) result.autoGenerateOrderNo = 'true';
    if (!result.requireCheckPhoto) result.requireCheckPhoto = 'true';

    return result;
  }

  /** 批量更新系统配置（upsert 模式） */
  async updateConfig(dto: UpdateSystemConfigDto) {
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && value !== null) {
        const cleaned = String(value).trim();
        await this.prisma.systemConfig.upsert({
          where: { key },
          update: { value: cleaned },
          create: { key, value: cleaned },
        });
      }
    }
    return this.getConfig();
  }
}
