import { IsString, IsInt, IsOptional, IsNumber, MaxLength, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

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
  @IsOptional() @IsArray() images?: string[];
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
  @IsOptional() @IsArray() images?: string[];
}
export class StockSearchDto extends PaginationDto {
  @IsOptional() @IsString() keyword?: string;
  @IsOptional() @IsInt() categoryId?: number;
  @IsOptional() @IsString() status?: string; // low, normal, over
}

export class StockRecordDto {
  @IsInt() partId: number;
  @IsOptional()
  @IsString()
  type?: string;
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

  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class UpdatePurchaseDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsArray()
  attachments?: string[];
}

export class PurchaseSearchDto extends PaginationDto {
  @IsOptional() @IsString() status?: string;
}

export class CreateCategoryDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class CreateSupplierDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsInt()
  status?: number;
}
