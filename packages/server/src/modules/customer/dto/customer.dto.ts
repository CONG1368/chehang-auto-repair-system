import { IsString, IsInt, IsOptional, IsArray, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(20)
  phone: string;

  @IsOptional()
  @IsInt()
  gender?: number;

  @IsOptional()
  birthday?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsInt()
  gender?: number;

  @IsOptional()
  birthday?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsArray()
  images?: string[];
}

export class CreateVehicleDto {
  @IsString()
  @MaxLength(20)
  plateNumber: string;

  @IsString()
  @MaxLength(50)
  brand: string;

  @IsOptional()
  @IsString()
  series?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsInt()
  mileage?: number;
}

export class CustomerSearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  tag?: string;
}

export class RemindQueryDto {
  @IsOptional()
  @IsString()
  type?: string; // maintenance | insurance | inspection
}
