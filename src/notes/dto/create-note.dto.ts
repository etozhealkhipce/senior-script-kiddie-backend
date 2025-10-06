import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { NoteContent } from '../types/content.types';
import { NoteContentDto } from './content-element.dto';

export class CreateNoteDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsString()
  preview: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NoteContentDto)
  content: NoteContent;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
