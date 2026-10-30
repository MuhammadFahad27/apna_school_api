import { IsOptional, IsString } from 'class-validator';

export class DeactivateEmployeeDto {
  @IsOptional()
  @IsString({ message: 'Reason must be a valid string.' })
  reason?: string;
}
