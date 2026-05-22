import { IsString, IsInt, IsOptional, IsNumber, IsArray, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() category: string;
  @IsNumber() price: number;
  @IsOptional() @IsInt() duration?: number;
}

export class UpdateServiceDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsInt() duration?: number;
}

export class CreatePackageDto {
  @IsString() @MaxLength(100) name: string;
  @IsNumber() originalPrice: number;
  @IsNumber() packagePrice: number;
  @IsOptional() @IsArray() items?: string[];
}

export class UpdatePackageDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsNumber() originalPrice?: number;
  @IsOptional() @IsNumber() packagePrice?: number;
  @IsOptional() @IsArray() items?: string[];
}

export class CreateAppointmentDto {
  @IsInt() customerId: number;
  @IsOptional() @IsInt() vehicleId?: number;
  @IsString() serviceType: string;
  @IsOptional() @IsArray() items?: { serviceId?: number; packageId?: number }[];
  @IsOptional() @IsNumber() totalAmount?: number;
  @IsOptional() @IsInt() assignedTo?: number;
  @IsOptional() @IsString() startTime?: string;
}

export class UpdateAppointmentDto {
  @IsOptional() @IsInt() customerId?: number;
  @IsOptional() @IsInt() vehicleId?: number;
  @IsOptional() @IsString() serviceType?: string;
  @IsOptional() @IsArray() items?: { serviceId?: number; packageId?: number }[];
  @IsOptional() @IsNumber() totalAmount?: number;
  @IsOptional() @IsInt() assignedTo?: number;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() status?: string;
}

export class CreateCardDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() cardNo: string;
  @IsInt() level: number;
  @IsNumber() discount: number;
  @IsOptional() @IsNumber() minRecharge?: number;
}

export class UpdateCardDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() cardNo?: string;
  @IsOptional() @IsInt() level?: number;
  @IsOptional() @IsNumber() discount?: number;
  @IsOptional() @IsNumber() minRecharge?: number;
  @IsOptional() @IsInt() status?: number;
}

// ==================== 充值记录 ====================

export class CreateRechargeDto {
  @IsInt()
  @Type(() => Number)
  customerId: number;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  paymentMethod: string;
}

export class RechargeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

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
