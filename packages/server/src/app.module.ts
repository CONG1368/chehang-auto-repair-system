import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CustomerModule } from './modules/customer/customer.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RepairModule } from './modules/repair/repair.module';
import { SalesModule } from './modules/sales/sales.module';
import { BeautyModule } from './modules/beauty/beauty.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportModule } from './modules/report/report.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { WsModule } from './modules/ws/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    CustomerModule,
    InventoryModule,
    RepairModule,
    SalesModule,
    BeautyModule,
    FinanceModule,
    ReportModule,
    WsModule,
  ],
})
export class AppModule {}
