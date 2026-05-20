import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @Type(() => Number)
  customerId: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  repairOrderId?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  salesOrderId?: number;

  @IsString()
  type: string; // repair, sales, beauty

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  paymentMethod: string; // cash, card, wechat, alipay, member_card, credit

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discount?: number;

  @IsInt()
  @Type(() => Number)
  operatorId: number;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateReceivableDto {
  @IsInt()
  @Type(() => Number)
  customerId: number;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsString()
  source: string; // repair, sales

  @IsString()
  sourceNo: string;
}

export class CreateExpenseDto {
  @IsString()
  category: string; // rent, salary, utility, marketing, other

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  description: string;

  @IsInt()
  @Type(() => Number)
  operatorId: number;
}

export class PaymentQueryDto {
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  get skip(): number {
    return (this.page! - 1) * this.pageSize!;
  }

  get take(): number {
    return this.pageSize!;
  }
}

export class ReceivableQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  get skip(): number {
    return (this.page! - 1) * this.pageSize!;
  }

  get take(): number {
    return this.pageSize!;
  }
}

export class ExpenseQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  get skip(): number {
    return (this.page! - 1) * this.pageSize!;
  }

  get take(): number {
    return this.pageSize!;
  }
}

export class ProfitSummaryQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
