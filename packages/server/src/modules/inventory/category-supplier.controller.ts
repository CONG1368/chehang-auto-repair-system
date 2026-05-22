import { Controller, Get, Post, Put, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateCategoryDto, UpdateCategoryDto, CreateSupplierDto, UpdateSupplierDto } from './dto/inventory.dto';

// 配件分类
@Controller('part-categories')
@UseGuards(JwtAuthGuard)
export class PartCategoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll() {
    return this.inventoryService.getCategories();
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    return this.inventoryService.createCategory(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.inventoryService.updateCategory(+id, dto);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.inventoryService.updateCategory(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.inventoryService.deleteCategory(+id);
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

  @Post()
  async create(@Body() dto: CreateSupplierDto) {
    return this.inventoryService.createSupplier(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.inventoryService.updateSupplier(+id, dto);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.inventoryService.updateSupplier(+id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.inventoryService.deleteSupplier(+id);
  }
}
