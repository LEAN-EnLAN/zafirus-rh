import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitCandidateDto {
  @ApiPropertyOptional({ example: 'NIT' })
  @IsOptional()
  @IsString()
  taxIdType?: string;

  @ApiPropertyOptional({ example: '900123456-7' })
  @IsOptional()
  @IsString()
  taxIdValue?: string;

  @ApiPropertyOptional({ example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: '1234567890' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional({ example: '0xabc123...' })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  internationalBankData?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  references?: Record<string, unknown>[];

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  documents?: Record<string, unknown>[];
}
