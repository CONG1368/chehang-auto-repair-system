import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number = 10;

  get skip(): number {
    return (this.page! - 1) * this.pageSize!;
  }

  get take(): number {
    return this.pageSize!;
  }
}

export class PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  constructor(list: T[], total: number, page: number, pageSize: number) {
    this.list = list;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(total / pageSize);
  }
}
