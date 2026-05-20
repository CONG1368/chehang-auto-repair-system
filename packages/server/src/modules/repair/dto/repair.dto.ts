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
  @IsInt()
  repairOrderId: number;

  @IsInt()
  checkerId: number;

  @IsOptional()
  @IsArray()
  itemsChecked?: string[];

  @IsOptional()
  @IsString()
  roadTest?: string;

  @IsInt()
  isPassed: number; // 1通过 0不通过

  @IsOptional()
  @IsString()
  remark?: string;
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
  plateNumber?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  orderNo?: string;
}
