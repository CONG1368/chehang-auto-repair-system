import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WsGateway } from '../ws/ws.gateway';
import { PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import { CreatePartDto, UpdatePartDto, StockSearchDto, StockRecordDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private wsGateway?: WsGateway,
  ) {}

  async findAll(query: PaginationDto & StockSearchDto) {
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

    if (query.status) {
      if (query.status === 'low') {
        where.stock = { quantity: { lte: where.safetyStock || 0 } };
        // 需要在查询后再做过滤
      }
    }

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

    // 如果 status 参数为 low/normal/over，做后置过滤
    let filteredList = list;
    if (query.status === 'low') {
      filteredList = list.filter(
        (p) => p.stock && p.stock.quantity <= p.safetyStock,
      );
    } else if (query.status === 'normal') {
      filteredList = list.filter(
        (p) =>
          p.stock &&
          p.stock.quantity > p.safetyStock &&
          p.stock.quantity <= p.maxStock,
      );
    } else if (query.status === 'over') {
      filteredList = list.filter(
        (p) => p.stock && p.stock.quantity > p.maxStock,
      );
    }

    return new PaginatedResult(
      filteredList,
      query.status ? filteredList.length : total,
      query.page!,
      query.pageSize!,
    );
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
    const part = await this.prisma.part.create({
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
      },
    });

    // 同时创建初始库存记录
    await this.prisma.partStock.create({
      data: {
        partId: part.id,
        quantity: 0,
        lockedQty: 0,
      },
    });

    return this.findOne(part.id);
  }

  async update(id: number, data: UpdatePartDto) {
    await this.prisma.part.update({ where: { id }, data });
    return this.findOne(id);
  }

  async remove(id: number) {
    // 先删除库存记录和流水
    await this.prisma.stockRecord.deleteMany({ where: { partId: id } });
    await this.prisma.partStock.deleteMany({ where: { partId: id } });
    return this.prisma.part.delete({ where: { id } });
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

  async addStockRecord(
    partId: number,
    type: string,
    quantity: number,
    remark?: string,
  ) {
    const stock = await this.prisma.partStock.findUnique({
      where: { partId },
    });

    const beforeQty = stock?.quantity ?? 0;
    const afterQty =
      type === 'in' || type === 'stock_in'
        ? beforeQty + quantity
        : beforeQty - quantity;

    return this.prisma.stockRecord.create({
      data: {
        partId,
        type,
        quantity,
        beforeQty,
        afterQty,
        remark: remark || '',
      },
    });
  }

  // ============ 入库操作 ============

  async stockIn(partId: number, quantity: number, remark?: string) {
    // 确保 PartStock 存在，不存在则创建
    let stock = await this.prisma.partStock.findUnique({
      where: { partId },
    });

    if (!stock) {
      stock = await this.prisma.partStock.create({
        data: { partId, quantity: 0, lockedQty: 0 },
      });
    }

    // 更新库存数量
    await this.prisma.partStock.update({
      where: { partId },
      data: { quantity: stock.quantity + quantity },
    });

    // 记录流水
    return this.addStockRecord(partId, 'in', quantity, remark);
  }

  // ============ 出库操作 ============

  async stockOut(partId: number, quantity: number, remark?: string) {
    let stock = await this.prisma.partStock.findUnique({
      where: { partId },
    });

    if (!stock) {
      stock = await this.prisma.partStock.create({
        data: { partId, quantity: 0, lockedQty: 0 },
      });
    }

    if (stock.quantity < quantity) {
      throw new Error(
        `库存不足: 当前库存 ${stock.quantity}, 需要 ${quantity}`,
      );
    }

    // 更新库存数量
    const newQuantity = stock.quantity - quantity;
    await this.prisma.partStock.update({
      where: { partId },
      data: { quantity: newQuantity },
    });

    // 检查库存是否低于安全库存，推送预警
    const part = await this.prisma.part.findUnique({ where: { id: partId } });
    if (part && newQuantity <= part.safetyStock) {
      this.wsGateway?.notifyLowStock({
        partId: part.id,
        partName: part.name,
        quantity: newQuantity,
        safetyStock: part.safetyStock,
      });
    }

    // 记录流水
    return this.addStockRecord(partId, 'out', quantity, remark);
  }

  // ============ 配件分类 ============

  async getCategories() {
    return this.prisma.partCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async getSuppliers() {
    return this.prisma.supplier.findMany({ where: { status: 1 } });
  }
}
