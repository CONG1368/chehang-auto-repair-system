import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsInt,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== 车辆管理 DTO ====================

export class CreateVehicleDto {
  @IsString()
  brand: string;

  @IsString()
  series: string;

  @IsString()
  model: string;

  @IsOptional()
  @IsString()
  yearModel?: string;

  @IsOptional()
  @IsString()
  config?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  guidePrice: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsString()
  stockStatus?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  series?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  yearModel?: string;

  @IsOptional()
  @IsString()
  config?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  guidePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsString()
  stockStatus?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

// ==================== 销售线索 DTO ====================

export class CreateLeadDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  intent?: string;

  @IsOptional()
  @IsString()
  intentLevel?: string;

  @IsOptional()
  @IsString()
  intentModel?: string;

  @IsOptional()
  @IsString()
  intendedVehicle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  nextFollowAt?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class UpdateLeadDto {
  @IsOptional()
  @IsString()
  intent?: string;

  @IsOptional()
  @IsString()
  intentLevel?: string;

  @IsOptional()
  @IsString()
  intentModel?: string;

  @IsOptional()
  @IsString()
  intendedVehicle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budget?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  nextFollowAt?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

// ==================== 销售订单 DTO ====================

export class CreateSalesOrderDto {
  @Type(() => Number)
  @IsInt()
  customerId: number;

  @Type(() => Number)
  @IsInt()
  vehicleId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insurance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accessories?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  serviceFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deposit?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salesId?: number;
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vehicleId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  insurance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  accessories?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  serviceFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  deposit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  salesId?: number;
}

// ==================== 线索跟进记录 DTO ====================

export class CreateLeadFollowRecordDto {
  @IsString()
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsDateString()
  nextFollowAt?: string;
}

export class DeliveryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklist?: string[];

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}
