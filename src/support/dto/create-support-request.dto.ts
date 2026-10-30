import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { SupportPriority } from '../support-request.entity.js';

export class CreateSupportRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Subject is required.' })
  @MaxLength(150, { message: 'Subject cannot exceed 150 characters.' })
  subject!: string;

  @IsString()
  @IsNotEmpty({ message: 'Message describing the issue is required.' })
  @MaxLength(3000, { message: 'Message cannot exceed 3000 characters.' })
  message!: string;

  @IsOptional()
  @IsEnum(SupportPriority, { message: 'Priority must be low, medium, high, or urgent.' })
  priority?: SupportPriority;
}
