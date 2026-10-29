import { IsString, MinLength } from 'class-validator';

export class ArchiveFarmDto {
  @IsString()
  @MinLength(1, { message: 'Farm name confirmation is required.' })
  farmNameConfirmation!: string;
}
