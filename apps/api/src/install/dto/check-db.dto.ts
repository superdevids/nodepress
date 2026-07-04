import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckDbDto {
  @ApiProperty({ description: 'Database host', default: 'localhost' })
  @IsString()
  host: string;

  @ApiProperty({ description: 'Database port', default: 5432 })
  @IsNumber()
  port: number;

  @ApiProperty({ description: 'Database name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Database user' })
  @IsString()
  user: string;

  @ApiProperty({ description: 'Database password' })
  @IsString()
  password: string;
}

export class AdminDto {
  @ApiProperty({ description: 'Admin first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Admin last name' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Admin email address' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Admin username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Admin password' })
  @IsString()
  password: string;

  @ApiProperty({ description: 'Admin profile picture URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class SiteDto {
  @ApiProperty({ description: 'Site title/name' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Site tagline/description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Site URL' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'Site language', default: 'en-US' })
  @IsString()
  language: string;

  @ApiProperty({ description: 'Site timezone', default: 'UTC' })
  @IsString()
  timezone: string;

  @ApiProperty({ description: 'Permalink structure', default: '/%year%/%monthnum%/%postname%/' })
  @IsString()
  permalink: string;
}
