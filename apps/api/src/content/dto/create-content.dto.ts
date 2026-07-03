import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateContentDto {
  @ApiProperty({ example: 'Hello World' })
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: '<p>My first post!</p>' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ example: 'hello-world' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  slug?: string;

  @ApiPropertyOptional({ example: 'A brief excerpt' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: 'draft' | 'publish' | 'pending' | 'private';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
