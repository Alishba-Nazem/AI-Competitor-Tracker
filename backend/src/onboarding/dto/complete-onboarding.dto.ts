import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class OnboardingCompetitorDto {
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}

export class CompleteOnboardingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country: string;

  @IsOptional()
  @IsUrl()
  storeUrl?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OnboardingCompetitorDto)
  competitors: OnboardingCompetitorDto[];
}
