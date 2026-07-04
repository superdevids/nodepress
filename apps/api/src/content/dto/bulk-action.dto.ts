import {
  IsString,
  IsArray,
  IsIn,
  IsOptional,
  MinLength,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkActionDto {
  @ApiProperty({
    enum: ['publish', 'unpublish', 'draft', 'trash', 'delete', 'restore', 'archive'],
    description: 'Action to perform on the selected entries',
  })
  @IsString()
  @IsIn(['publish', 'unpublish', 'draft', 'trash', 'delete', 'restore', 'archive'])
  action: string;

  @ApiProperty({
    type: [String],
    description: 'Array of content entry IDs to process',
    example: ['clx...', 'cly...'],
  })
  @IsArray()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  ids: string[];

  @ApiPropertyOptional({
    description: 'Optional parameters for certain actions (e.g. assign_taxonomy)',
    example: { taxonomyId: 'txn_abc', termId: 'term_xyz' },
  })
  @IsOptional()
  @IsObject()
  options?: {
    taxonomyId?: string;
    termId?: string;
  };
}
