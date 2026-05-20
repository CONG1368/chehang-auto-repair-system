import { IsString, IsInt, IsOptional, IsNumber, IsArray, MaxLength } from 'class-validator';

export class CreateServiceDto {
  @IsString() @MaxLength(100) name: string;
  @IsString() category: string;
  @IsNumber() price: number;
  @IsOptional() @IsInt() duration?: number;
}

export class CreatePackageDto {
  @IsString() @MaxLength(100) name: string;
  @IsNumber() originalPrice: number;
  @IsNumber() packagePrice: number;
  @IsOptional() @IsArray() items?: string[];
}

export class CreateAppointmentDto {
  @IsInt() customerId: number;
  @IsOptional() @IsInt() vehicleId?: number;
  @IsString() serviceType: string;
  @IsOptional() @IsArray() items?: any[];
  @IsOptional() @IsNumber() totalAmount?: number;
  @IsOptional() @IsInt() assignedTo?: number;
  @IsOptional() @IsString() startTime?: string;
}
