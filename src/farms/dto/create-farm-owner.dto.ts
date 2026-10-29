import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateFarmOwnerDto {
  @IsString({ message: 'Owner name must be a valid text string.' })
  @IsNotEmpty({ message: 'Owner full name is required.' })
  @MinLength(2, { message: 'Owner full name must be at least 2 characters.' })
  ownerName!: string;

  @IsString({ message: 'Phone number must be a valid text string.' })
  @IsNotEmpty({ message: 'Phone number is required.' })
  @MinLength(7, { message: 'Please enter a valid phone number (at least 7 digits).' })
  phone!: string;

  @IsNotEmpty({ message: 'Email address is required.' })
  @IsEmail({}, { message: 'Please provide a valid email address.' })
  email!: string;

  @IsString({ message: 'Farm name must be a valid text string.' })
  @IsNotEmpty({ message: 'Dairy farm name is required.' })
  @MinLength(2, { message: 'Dairy farm name must be at least 2 characters.' })
  farmName!: string;

  @IsString({ message: 'Location must be a valid text string.' })
  @IsNotEmpty({ message: 'Farm location is required.' })
  @MinLength(2, { message: 'Farm location must be at least 2 characters.' })
  location!: string;
}
