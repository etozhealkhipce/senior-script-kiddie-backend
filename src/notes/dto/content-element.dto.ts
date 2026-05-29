// EditorJS block-forge-editor output types used in note content DTOs
import { IsString, IsOptional, IsObject } from 'class-validator';

export class EditorBlockDto {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsObject()
  data: Record<string, unknown>;
}

export class EditorDataDto {
  @IsOptional()
  time?: number;

  blocks: EditorBlockDto[];

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
