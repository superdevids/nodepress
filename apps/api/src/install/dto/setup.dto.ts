import { IsString, IsNumber, IsArray, IsOptional, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SetupDbDto {
  @ApiProperty({ default: 'localhost' })
  @IsString()
  host: string;

  @ApiProperty({ default: 5432 })
  @IsNumber()
  port: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  user: string;

  @ApiProperty()
  @IsString()
  password: string;
}

class SetupAdminDto {
  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  email: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

class SetupSiteDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  url: string;

  @ApiProperty({ default: 'en-US' })
  @IsString()
  language: string;

  @ApiProperty({ default: 'UTC' })
  @IsString()
  timezone: string;

  @ApiProperty({ default: '/%year%/%monthnum%/%postname%/' })
  @IsString()
  permalink: string;
}

export class SetupDto {
  @ApiProperty({ type: SetupDbDto })
  @ValidateNested()
  @Type(() => SetupDbDto)
  db: SetupDbDto;

  @ApiProperty({ type: SetupAdminDto })
  @ValidateNested()
  @Type(() => SetupAdminDto)
  admin: SetupAdminDto;

  @ApiProperty({ type: SetupSiteDto })
  @ValidateNested()
  @Type(() => SetupSiteDto)
  site: SetupSiteDto;

  @ApiProperty({ description: 'Selected plugin slugs', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  plugins?: string[];

  @ApiProperty({ description: 'Selected theme slug', required: false })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiProperty({ description: 'Installation type', enum: ['fresh', 'import'], required: false })
  @IsOptional()
  @IsIn(['fresh', 'import'])
  installType?: 'fresh' | 'import';
}
