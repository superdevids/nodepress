import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstallStep1Dto {
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
