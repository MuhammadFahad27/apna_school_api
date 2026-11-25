import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SubjectStatus } from '../entities/subject.entity.js';

export class CreateSubjectDto {
  @IsNotEmpty({ message: 'Subject name is required.' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsNotEmpty({ message: 'Subject code is required.' })
  @IsString()
  @MaxLength(30)
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SubjectStatus, { message: 'Status must be active or inactive.' })
  status?: SubjectStatus;
}
