import { IsString, IsOptional, IsEmail, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCaseDto {
  @ApiProperty({ example: 'Ana' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'García' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'CC-123456' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ example: 'ana@example.com' })
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiProperty({ example: 'Frontend Developer' })
  @IsString()
  role: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  area: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: '2026-06-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: 'Carlos Pérez' })
  @IsOptional()
  @IsString()
  managerName?: string;
}
