import { IsString, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstallStep3Dto {
  @ApiProperty({ description: 'Site name / title', example: 'My Blog' })
  @IsString()
  siteName: string;

  @ApiProperty({
    description: 'Site tagline / description',
    required: false,
    example: 'Just another NodePress site',
  })
  @IsOptional()
  @IsString()
  tagline?: string;

  @ApiProperty({ description: 'Site URL', example: 'http://localhost:3000' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Site language (BCP 47)', default: 'en-US', example: 'en-US' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: 'Site timezone (IANA)', default: 'UTC', example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;
}
