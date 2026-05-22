import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateSystemConfigDto {
  // ===== 基本设置 =====
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  appName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessHours?: string;

  // ===== 业务规则 =====
  @IsOptional()
  @IsString()
  @MaxLength(10)
  hourlyRate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  maxDiscount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  minRecharge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  safetyStock?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  maxStock?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  smsEnabled?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  autoGenerateOrderNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  requireCheckPhoto?: string;
}
