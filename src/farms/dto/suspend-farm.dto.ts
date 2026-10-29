import { IsString, MinLength } from 'class-validator';

export class SuspendFarmDto {
  @IsString()
  @MinLength(3, {
    message: 'Suspension reason is required and must be at least 3 characters.',
  })
  reason!: string;
}
