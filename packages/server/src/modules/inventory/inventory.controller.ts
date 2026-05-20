import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  CreatePartDto,
  UpdatePartDto,
  StockSearchDto,
  StockRecordDto,
  CreatePurchaseDto,
  PurchaseSearchDto,
} from './dto/inventory.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  async findAll(@Query() query: PaginationDto & StockSearchDto) {
    return this.inventoryService.findAll(query);
  }

  @Get('low-stock')
  async getLowStock() {
    return this.inventoryService.getLowStock();
  }

  @Get('categories')
  async getCategories() {
    return this.inventoryService.getCategories();
  }

  @Get('suppliers')
  async getSuppliers() {
    return this.inventoryService.getSuppliers();
  }

  @Get('stock-records')
  async findStockRecords(@Query() query: PaginationDto) {
    return this.inventoryService.findStockRecords(query);
  }

  // 采购管理（必须在 :id 之前）
  @Get('purchase')
  async findPurchaseOrders(@Query() query: PaginationDto & PurchaseSearchDto) {
    return this.inventoryService.findPurchaseOrders(query);
  }

  @Get('purchase/:id')
  async findPurchaseOrder(@Param('id') id: string) {
    return this.inventoryService.findPurchaseOrder(+id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(+id);
  }

  @Post()
  async create(@Body() body: CreatePartDto) {
    return this.inventoryService.create(body);
  }

  @Post('stock-in')
  async stockIn(@Body() body: StockRecordDto) {
    return this.inventoryService.stockIn(
      body.partId,
      body.quantity,
      body.remark,
    );
  }

  @Post('stock-out')
  async stockOut(@Body() body: StockRecordDto) {
    return this.inventoryService.stockOut(
      body.partId,
      body.quantity,
      body.remark,
    );
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: UpdatePartDto) {
    return this.inventoryService.update(+id, body);
  }

  @Post('purchase')
  async createPurchaseOrder(@Body() body: CreatePurchaseDto, @Request() req: any) {
    return this.inventoryService.createPurchaseOrder(body, req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.inventoryService.remove(+id);
  }
}
