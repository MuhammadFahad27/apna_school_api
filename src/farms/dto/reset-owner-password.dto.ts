import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetOwnerPasswordDto {
  @IsNotEmpty({ message: 'New password is required.' })
  @IsString({ message: 'Password must be a valid string.' })
  @MinLength(6, { message: 'Password must be at least 6 characters long.' })
  password!: string;
}
