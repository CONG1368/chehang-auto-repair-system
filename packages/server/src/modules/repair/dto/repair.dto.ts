import { IsString, IsInt, IsOptional, IsNumber, IsArray, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class RepairItemDto {
  @IsString()
  type: string; // labor / part

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  laborFee?: number;

  @IsOptional()
  @IsNumber()
  partFee?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class CreateRepairOrderDto {
  @IsInt()
  customerId: number;

  @IsOptional()
  @IsInt()
  vehicleId?: number;

  @IsString()
  plateNumber: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsInt()
  mileage?: number;

  @IsOptional()
  @IsString()
  faultDesc?: string;

  @IsOptional()
  @IsString()
  checkResult?: string;

  @IsInt()
  advisorId: number;

  @IsOptional()
  @IsString()
  estCompleteTime?: string;

  @IsArray()
  @Type(() => RepairItemDto)
  items: RepairItemDto[];

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class UpdateRepairOrderDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  faultDesc?: string;

  @IsOptional()
  @IsString()
  checkResult?: string;

  @IsOptional()
  @IsArray()
  @Type(() => RepairItemDto)
  items?: RepairItemDto[];

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsOptional()
  @IsArray()
  checkImages?: string[];
}

export class DispatchDto {
  @IsInt()
  repairOrderId: number;

  @IsInt()
  technicianId: number;

  @IsOptional()
  @IsNumber()
  standardHours?: number;
}

export class QualityCheckDto {
  @IsOptional()
  @IsInt()
  repairOrderId?: number;

  @IsOptional()
  @IsInt()
  orderId?: number;

  @IsOptional()
  @IsInt()
  checkerId?: number;

  @IsOptional()
  @IsArray()
  itemsChecked?: string[];

  @IsOptional()
  @IsArray()
  checkItems?: string[];

  @IsOptional()
  @IsString()
  roadTest?: string;

  @IsOptional()
  @IsString()
  testDriveResult?: string;

  @IsOptional()
  @IsInt()
  isPassed?: number; // 1通过 0不通过（前端可能发送 conclusion 替代）

  @IsOptional()
  @IsString()
  conclusion?: string; // 前端发送 'pass' / 'fail'

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class PartPickDto {
  @IsInt()
  partId: number;

  @IsInt()
  quantity: number;
}

export class RepairQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  orderNo?: string;
}
