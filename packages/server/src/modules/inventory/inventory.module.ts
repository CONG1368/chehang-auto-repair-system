import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { PartCategoryController, SupplierController } from './category-supplier.controller';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WsModule],
  controllers: [InventoryController, PartCategoryController, SupplierController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
