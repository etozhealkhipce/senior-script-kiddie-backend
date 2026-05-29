import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import type { EditorData, SubtitleItem } from '../types/content.types';

export class CreateNoteDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be url-safe (lowercase letters, digits, and hyphens)',
  })
  slug: string;

  @IsOptional()
  @IsString()
  @IsIn(['note', 'work'])
  contentType?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  preview: string;

  @IsOptional()
  @IsObject()
  content?: EditorData;

  @IsOptional()
  @IsArray()
  subtitle?: SubtitleItem[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  linkText?: string;
}
