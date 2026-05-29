import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { EditorData, SubtitleItem } from '../types/content.types';

@Entity({ name: 'notes' })
export class NoteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  /** 'note' = blog post, 'work' = portfolio project */
  @Column({ default: 'note' })
  contentType: string;

  @Column()
  title: string;

  @Column()
  preview: string;

  @Column('jsonb', { nullable: true })
  content: EditorData | null;

  @Column('jsonb', { nullable: true })
  subtitle: SubtitleItem[] | null;

  @Column('text', { array: true, nullable: true })
  tags: string[] | null;

  /** Work entries: external link URL */
  @Column({ type: 'text', nullable: true })
  link: string | null;

  /** Work entries: link label, e.g. "view project >" */
  @Column({ type: 'text', nullable: true })
  linkText: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
