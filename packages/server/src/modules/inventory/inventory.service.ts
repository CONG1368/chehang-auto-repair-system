import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { WsGateway } from '../ws/ws.gateway';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreatePartDto, UpdatePartDto, StockSearchDto, StockRecordDto, CreatePurchaseDto, UpdatePurchaseDto, PurchaseSearchDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private wsGateway?: WsGateway,
    private readonly redis?: RedisService,
  ) {}

  async findAll(query: StockSearchDto) {
    const cacheKey = `parts:list:${JSON.stringify(query)}`;

    // 尝试从 Redis 缓存读取
    if (this.redis) {
      const cached = await this.redis.getJson(cacheKey);
      if (cached) return cached;
    }

    const where: any = {};

    if (query.keyword) {
      where.OR = [
        { code: { contains: query.keyword } },
        { name: { contains: query.keyword } },
        { spec: { contains: query.keyword } },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const needsPostFilter = query.status === 'low' || query.status === 'normal' || query.status === 'over';

    let result: PaginatedResult<any>;

    if (needsPostFilter) {
      // 库存级别筛选需要全量加载后内存过滤，确保分页和 total 正确
      const allList = await this.prisma.part.findMany({
        where,
        include: {
          category: true,
          supplier: true,
          stock: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      let filteredList = allList;
      if (query.status === 'low') {
        filteredList = allList.filter(
          (p) => p.stock && p.stock.quantity <= p.safetyStock,
        );
      } else if (query.status === 'normal') {
        filteredList = allList.filter(
          (p) =>
            p.stock &&
            p.stock.quantity > p.safetyStock &&
            p.stock.quantity <= p.maxStock,
        );
      } else if (query.status === 'over') {
        filteredList = allList.filter(
          (p) => p.stock && p.stock.quantity > p.maxStock,
        );
      }

      const total = filteredList.length;
      const paged = filteredList.slice(query.skip, query.skip + query.take);
      result = new PaginatedResult(paged, total, query.page!, query.pageSize!);
    } else {
      const [list, total] = await Promise.all([
        this.prisma.part.findMany({
          where,
          skip: query.skip,
          take: query.take,
          include: {
            category: true,
            supplier: true,
            stock: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.part.count({ where }),
      ]);

      result = new PaginatedResult(list, total, query.page!, query.pageSize!);
    }

    // 写入缓存，TTL 120 秒
    if (this.redis) {
      await this.redis.setJson(cacheKey, result, 120);
    }

    return result;
  }

  async findOne(id: number) {
    return this.prisma.part.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        stock: true,
        stockRecords: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  async create(data: CreatePartDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const part = await tx.part.create({
        data: {
          code: data.code,
          name: data.name,
          spec: data.spec,
          categoryId: data.categoryId,
          supplierId: data.supplierId,
          price: data.price,
          cost: data.cost,
          safetyStock: data.safetyStock ?? 10,
          maxStock: data.maxStock ?? 100,
          shelfLocation: data.shelfLocation,
          images: data.images ?? undefined,
        },
      });

      // 同时创建初始库存记录
      await tx.partStock.create({
        data: {
          partId: part.id,
          quantity: 0,
          lockedQty: 0,
        },
      });

      return tx.part.findUnique({
        where: { id: part.id },
        include: {
          category: true,
          supplier: true,
          stock: true,
          stockRecords: {
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });
    });

    // 清除配件列表缓存
    await this.clearPartCache();
    return result;
  }

  async update(id: number, data: UpdatePartDto) {
    await this.prisma.part.update({ where: { id }, data });
    // 清除配件列表缓存
    await this.clearPartCache();
    return this.findOne(id);
  }

  async remove(id: number) {
    // 先删除库存记录和流水
    await this.prisma.stockRecord.deleteMany({ where: { partId: id } });
    await this.prisma.partStock.deleteMany({ where: { partId: id } });
    const result = await this.prisma.part.delete({ where: { id } });
    // 清除配件列表缓存
    await this.clearPartCache();
    return result;
  }

  // ============ 库存预警 ============

  async getLowStock() {
    const parts = await this.prisma.part.findMany({
      where: {
        status: 1,
      },
      include: {
        category: true,
        supplier: true,
        stock: true,
      },
    });

    return parts.filter((p) => p.stock && p.stock.quantity <= p.safetyStock);
  }

  // ============ 库存流水 ============

  async findStockRecords(query: PaginationDto) {
    const [list, total] = await Promise.all([
      this.prisma.stockRecord.findMany({
        skip: query.skip,
        take: query.take,
        include: {
          part: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.stockRecord.count(),
    ]);
    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  // ============ 入库操作 ============

  async stockIn(partId: number, quantity: number, remark?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      // 确保 PartStock 存在，不存在则创建
      let stock = await tx.partStock.findUnique({
        where: { partId },
      });

      if (!stock) {
        stock = await tx.partStock.create({
          data: { partId, quantity: 0, lockedQty: 0 },
        });
      }

      const beforeQty = stock.quantity;
      const afterQty = beforeQty + quantity;

      // 更新库存数量
      await tx.partStock.update({
        where: { partId },
        data: { quantity: afterQty },
      });

      // 记录流水
      return tx.stockRecord.create({
        data: {
          partId,
          type: 'in',
          quantity,
          beforeQty,
          afterQty,
          remark: remark || '',
        },
      });
    });

    // 清除配件列表缓存
    await this.clearPartCache();
    return result;
  }

  // ============ 出库操作 ============

  async stockOut(partId: number, quantity: number, remark?: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      let stock = await tx.partStock.findUnique({
        where: { partId },
      });

      if (!stock) {
        stock = await tx.partStock.create({
          data: { partId, quantity: 0, lockedQty: 0 },
        });
      }

      if (stock.quantity < quantity) {
        throw new BadRequestException(
          `库存不足: 当前库存 ${stock.quantity}, 需要 ${quantity}`,
        );
      }

      // 更新库存数量
      const newQuantity = stock.quantity - quantity;
      const beforeQty = stock.quantity;

      await tx.partStock.update({
        where: { partId },
        data: { quantity: newQuantity },
      });

      // 记录流水
      const record = await tx.stockRecord.create({
        data: {
          partId,
          type: 'out',
          quantity,
          beforeQty,
          afterQty: newQuantity,
          remark: remark || '',
        },
      });

      return record;
    }).then(async (record) => {
      // 事务外部：检查库存是否低于安全库存，推送预警（避免推送影响事务）
      const part = await this.prisma.part.findUnique({ where: { id: partId } });
      if (part && record.afterQty <= part.safetyStock) {
        this.wsGateway?.notifyLowStock({
          partId: part.id,
          partName: part.name,
          quantity: record.afterQty,
          safetyStock: part.safetyStock,
        });
      }
      return record;
    });

    // 清除配件列表缓存
    await this.clearPartCache();
    return result;
  }

  // ==================== Redis 缓存辅助 ====================

  /** 清除配件相关缓存 */
  private async clearPartCache() {
    if (!this.redis) return;
    const keys = await this.redis.keys('parts:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // ============ 配件分类 ============

  async getCategories() {
    return this.prisma.partCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async getSuppliers() {
    return this.prisma.supplier.findMany({ where: { status: 1 } });
  }

  // ============ 采购管理 ============

  async findPurchaseOrders(query: PurchaseSearchDto) {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    const [list, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        skip: query.skip,
        take: query.take,
        where,
        include: {
          supplier: true,
          items: { include: { part: { select: { id: true, name: true, code: true, spec: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return new PaginatedResult(list, total, query.page!, query.pageSize!);
  }

  async findPurchaseOrder(id: number) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { part: true } },
      },
    });
    if (!order) throw new NotFoundException('采购单不存在');
    return order;
  }

  async updatePurchase(id: number, dto: UpdatePurchaseDto) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('采购单不存在');
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status,
        attachments: dto.attachments,
      },
      include: {
        supplier: true,
        items: { include: { part: { select: { id: true, name: true, code: true, spec: true } } } },
      },
    });
  }

  async removePurchaseOrder(id: number) {
    const order = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('采购单不存在');
    await this.prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }

  async createPurchaseOrder(body: CreatePurchaseDto, userId: number) {
    if (!body.items || body.items.length === 0) {
      throw new BadRequestException('采购明细不能为空');
    }

    return this.prisma.$transaction(async (tx) => {
      // 生成采购单号 PO年月日-序号（在事务内生成，避免并发竞态）
      const today = new Date();
      const prefix = `PO${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
      const todayOrder = await tx.purchaseOrder.count({
        where: { orderNo: { startsWith: prefix } },
      });
      const orderNo = `${prefix}-${String(todayOrder + 1).padStart(3, '0')}`;

      let totalAmount = 0;
      for (const item of body.items) {
        totalAmount += item.quantity * item.unitPrice;
      }

      return tx.purchaseOrder.create({
        data: {
          orderNo,
          supplierId: body.supplierId,
          totalAmount,
          applicantId: userId,
          attachments: body.attachments ?? undefined,
          items: {
            create: body.items.map((item) => ({
              partId: item.partId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.quantity * item.unitPrice,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { part: { select: { id: true, name: true, code: true, spec: true } } } },
        },
      });
    });
  }

  // ============ 分类管理 ============

  async createCategory(data: { name: string; parentId?: number; sortOrder?: number }) {
    return this.prisma.partCategory.create({
      data: {
        name: data.name,
        parentId: data.parentId ?? null,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateCategory(id: number, data: { name?: string; parentId?: number; sortOrder?: number }) {
    const category = await this.prisma.partCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('配件分类不存在');
    return this.prisma.partCategory.update({
      where: { id },
      data: {
        name: data.name,
        parentId: data.parentId,
        sortOrder: data.sortOrder,
      },
    });
  }

  async deleteCategory(id: number) {
    const category = await this.prisma.partCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('配件分类不存在');
    const hasParts = await this.prisma.part.findFirst({ where: { categoryId: id } });
    if (hasParts) throw new BadRequestException('该分类下存在配件，无法删除');
    return this.prisma.partCategory.delete({ where: { id } });
  }

  // ============ 供应商管理 ============

  async createSupplier(data: { name: string; contact?: string; phone?: string; address?: string; bankAccount?: string }) {
    return this.prisma.supplier.create({ data });
  }

  async updateSupplier(id: number, data: { name?: string; contact?: string; phone?: string; address?: string; bankAccount?: string; status?: number }) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('供应商不存在');
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async deleteSupplier(id: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('供应商不存在');
    const hasParts = await this.prisma.part.findFirst({ where: { supplierId: id } });
    if (hasParts) throw new BadRequestException('该供应商关联了配件，无法删除');
    return this.prisma.supplier.delete({ where: { id } });
  }
}
