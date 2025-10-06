import {
  IsString,
  IsEnum,
  IsBoolean,
  IsUrl,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TextElementDto {
  @IsEnum(['text'])
  type: 'text';

  @IsString()
  content: string;
}

export class LinkElementDto {
  @IsEnum(['link'])
  type: 'link';

  @IsUrl()
  url: string;

  @IsBoolean()
  external: boolean;
}

export class ContentParagraphDto {
  @IsString()
  id: string;

  @IsArray()
  elements: (TextElementDto | LinkElementDto)[];
}

export class NoteContentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentParagraphDto)
  paragraphs: ContentParagraphDto[];
}
