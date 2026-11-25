import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SubjectStatus } from '../entities/subject.entity.js';

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SubjectStatus, { message: 'Status must be active or inactive.' })
  status?: SubjectStatus;
}
