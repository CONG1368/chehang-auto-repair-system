import { IsString, IsInt, IsOptional, IsNumber, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePartDto {
  @IsString() @MaxLength(50) code: string;
  @IsString() @MaxLength(100) name: string;
  @IsOptional() @IsString() spec?: string;
  @IsInt() categoryId: number;
  @IsOptional() @IsInt() supplierId?: number;
  @IsNumber() price: number;
  @IsNumber() cost: number;
  @IsOptional() @IsInt() @Min(0) safetyStock?: number;
  @IsOptional() @IsInt() @Min(0) maxStock?: number;
  @IsOptional() @IsString() shelfLocation?: string;
}

export class UpdatePartDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() spec?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsInt() supplierId?: number;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsInt() @Min(0) safetyStock?: number;
  @IsOptional() @IsInt() @Min(0) maxStock?: number;
}

export class StockSearchDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsString() status?: string; // low, normal, over
}

export class StockRecordDto {
  @IsInt() partId: number;
  @IsString() type: string;
  @IsInt() quantity: number;
  @IsOptional() @IsString() remark?: string;
}

export class PurchaseItemDto {
  @IsInt() partId: number;
  @IsInt() @Min(1) quantity: number;
  @IsNumber() @Min(0) unitPrice: number;
}

export class CreatePurchaseDto {
  @IsInt() supplierId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}

export class PurchaseSearchDto {
  @IsOptional() @IsString() status?: string;
}
