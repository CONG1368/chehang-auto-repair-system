import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  realName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  avatar?: string;
}
