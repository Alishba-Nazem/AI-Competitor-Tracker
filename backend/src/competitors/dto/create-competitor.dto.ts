import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateCompetitorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
