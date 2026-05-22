import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { CustomerModule } from './modules/customer/customer.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { RepairModule } from './modules/repair/repair.module';
import { SalesModule } from './modules/sales/sales.module';
import { BeautyModule } from './modules/beauty/beauty.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReportModule } from './modules/report/report.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ExportModule } from './modules/export/export.module';
import { SystemModule } from './modules/system/system.module';
import { UploadModule } from './modules/upload/upload.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { AuditModule } from './modules/audit/audit.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { WsModule } from './modules/ws/ws.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HealthModule,
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
    NotificationModule,
    ExportModule,
    SystemModule,
    UploadModule,
    InvoiceModule,
    AuditModule,
    WsModule,
  ],
})
export class AppModule {}
