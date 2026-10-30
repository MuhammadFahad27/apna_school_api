import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResetEmployeePasswordDto {
  @IsOptional()
  @IsString({ message: 'Password must be a valid string.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password?: string;
}
