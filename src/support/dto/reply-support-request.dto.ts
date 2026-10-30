import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReplySupportRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Response message to the farm owner is required.' })
  @MaxLength(3000, { message: 'Response message cannot exceed 3000 characters.' })
  responseMessage!: string;
}
