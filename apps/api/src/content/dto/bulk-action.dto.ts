import { IsString, IsArray, IsIn, IsOptional } from 'class-validator';

export class BulkActionDto {
  @IsString()
  @IsIn(['publish', 'unpublish', 'draft', 'trash', 'delete', 'restore'])
  action: string;

  @IsArray()
  @IsString({ each: true })
  ids: string[];

  @IsOptional()
  @IsString()
  contentType?: string;
}
