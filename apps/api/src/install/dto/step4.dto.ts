import { IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstallStep4Dto {
  @ApiProperty({
    description: 'Array of plugin slugs to activate',
    required: false,
    example: ['seo', 'analytics', 'comments'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plugins?: string[];
}
