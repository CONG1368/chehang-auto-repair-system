import { Controller, Get, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
export class CategorySupplierController {
  constructor(private readonly inventoryService: InventoryService) {}
}

// 配件分类
@Controller('part-categories')
@UseGuards(JwtAuthGuard)
export class PartCategoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll() {
    return this.inventoryService.getCategories();
  }
}

// 供应商
@Controller('suppliers')
@UseGuards(JwtAuthGuard)
export class SupplierController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll() {
    return this.inventoryService.getSuppliers();
  }
}
