import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class WineVoucherRedeemItemDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  specType?: string;
}

export class CreateWineVoucherOptionDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  voucherPackageId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredVoucherCount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WineVoucherRedeemItemDto)
  items!: WineVoucherRedeemItemDto[];
}

export class UpdateWineVoucherOptionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  voucherPackageId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  requiredVoucherCount?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => WineVoucherRedeemItemDto)
  @IsOptional()
  items?: WineVoucherRedeemItemDto[];
}

export class RedeemWineVoucherDto {
  @IsString()
  memberId!: string;

  @IsString()
  tableId!: string;

  @IsString()
  @IsOptional()
  voucherBatchId?: string;
}

