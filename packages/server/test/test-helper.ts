import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * 创建测试模块的工厂函数，自动提供 mock 后的 PrismaService
 */
export async function createTestingModule(providers: any[]) {
  const mockPrisma = {
    sysUser: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    customer: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    repairOrder: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    part: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    partStock: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
    paymentRecord: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    receivable: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    payable: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    expenseRecord: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    salesOrder: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    salesLead: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    beautyAppointment: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    memberCard: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    memberCardRecharge: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
    notification: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    auditLog: { findMany: jest.fn(), create: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockPrisma)),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      { provide: PrismaService, useValue: mockPrisma },
      ...providers,
    ],
  }).compile();

  return { module, mockPrisma };
}

/**
 * 模拟一个分页查询的返回结果
 */
export function mockPaginatedResult(list: any[], total: number, page: number, pageSize: number) {
  return { list, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}
