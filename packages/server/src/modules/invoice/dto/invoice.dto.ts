import { IsString, IsInt, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInvoiceDto {
  @IsString()
  invoiceNo: string;

  @IsString()
  type: string; // vat=增值税普票, special=增值税专票, electronic=电子发票

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsInt()
  @Type(() => Number)
  customerId: number;

  @IsString()
  relatedNo: string; // 关联的维修工单号/销售订单号

  @IsOptional()
  @IsString()
  status?: string; // issued, cancelled
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsString()
  invoiceNo?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxRate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsString()
  relatedNo?: string;
}

export class InvoiceQueryDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

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

  get skip(): number { return (this.page! - 1) * this.pageSize!; }
  get take(): number { return this.pageSize!; }
}
