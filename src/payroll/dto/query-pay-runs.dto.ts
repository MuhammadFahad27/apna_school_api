import { IsOptional, IsString } from 'class-validator';

export class QueryPayRunsDto {
  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  month?: string;

  @IsOptional()
  year?: number;
}
