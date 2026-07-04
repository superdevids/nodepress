import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InstallStep5Dto {
  @ApiProperty({
    description: 'Theme slug to install and activate',
    example: 'web-starter',
  })
  @IsString()
  theme: string;
}
