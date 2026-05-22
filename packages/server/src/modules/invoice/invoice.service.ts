import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from './dto/invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  /**
   * 分页查询发票列表
   * 支持类型、状态、关键词、日期范围筛选
   */
  async findAll(query: InvoiceQueryDto) {
    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate + ' 23:59:59');
      }
    }
    if (query.keyword) {
      where.OR = [
        { invoiceNo: { contains: query.keyword } },
        { relatedNo: { contains: query.keyword } },
        { customer: { name: { contains: query.keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.invoiceRecord.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.invoiceRecord.count({ where }),
    ]);

    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  /**
   * 查询单条发票详情
   */
  async findOne(id: number) {
    const invoice = await this.prisma.invoiceRecord.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException('发票记录不存在');
    }
    return invoice;
  }

  /**
   * 创建发票记录
   */
  async create(dto: CreateInvoiceDto) {
    // 检查发票号是否已存在
    const existing = await this.prisma.invoiceRecord.findUnique({
      where: { invoiceNo: dto.invoiceNo },
    });
    if (existing) {
      throw new BadRequestException(`发票号 ${dto.invoiceNo} 已存在`);
    }

    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    return this.prisma.invoiceRecord.create({
      data: {
        invoiceNo: dto.invoiceNo,
        type: dto.type,
        amount: dto.amount,
        customerId: dto.customerId,
        relatedNo: dto.relatedNo,
        status: dto.status || 'issued',
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * 编辑发票
   */
  async update(id: number, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoiceRecord.findUnique({ where: { id } });
    if (!invoice) {
      throw new NotFoundException('发票记录不存在');
    }
    // 如果修改了发票号，检查是否重复
    if (dto.invoiceNo && dto.invoiceNo !== invoice.invoiceNo) {
      const existing = await this.prisma.invoiceRecord.findUnique({
        where: { invoiceNo: dto.invoiceNo },
      });
      if (existing) {
        throw new BadRequestException(`发票号 ${dto.invoiceNo} 已存在`);
      }
    }
    return this.prisma.invoiceRecord.update({
      where: { id },
      data: {
        invoiceNo: dto.invoiceNo,
        type: dto.type,
        amount: dto.amount,
        customerId: dto.customerId,
        relatedNo: dto.relatedNo,
        status: dto.status,
      },
      include: {
        customer: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * 作废发票（状态改为 cancelled）
   */
  async cancel(id: number) {
    const invoice = await this.prisma.invoiceRecord.findUnique({
      where: { id },
    });
    if (!invoice) {
      throw new NotFoundException('发票记录不存在');
    }
    if (invoice.status === 'cancelled') {
      throw new BadRequestException('该发票已作废，无需重复操作');
    }

    return this.prisma.invoiceRecord.update({
      where: { id },
      data: { status: 'cancelled' },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });
  }

  /**
   * 发票统计信息
   * 返回总数、总金额、本月开票数、已作废数
   */
  async getStats() {
    // 本月起止时间
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 并行查询三项统计
    const [allInvoices, thisMonthCount, allCancelled] = await Promise.all([
      this.prisma.invoiceRecord.findMany(),
      this.prisma.invoiceRecord.count({
        where: {
          createdAt: { gte: monthStart },
          status: 'issued',
        },
      }),
      this.prisma.invoiceRecord.count({
        where: { status: 'cancelled' },
      }),
    ]);

    // 计算总金额（仅已开票状态）
    const totalAmount = allInvoices
      .filter((inv) => inv.status === 'issued')
      .reduce((sum, inv) => sum + Number(inv.amount), 0);

    return {
      totalCount: allInvoices.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      thisMonthCount,
      cancelledCount: allCancelled,
    };
  }
}
