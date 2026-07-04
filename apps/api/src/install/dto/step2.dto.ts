import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstallStep2Dto {
  @ApiProperty({ description: 'Admin email address', example: 'admin@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Admin password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty({ description: 'Admin display name', example: 'Admin' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;
}
