import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteEntity } from './entities/note.entity';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(NoteEntity)
    private readonly noteRepository: Repository<NoteEntity>,
  ) {}

  async create(createNoteDto: CreateNoteDto): Promise<NoteEntity> {
    const note = this.noteRepository.create(createNoteDto);
    return await this.noteRepository.save(note);
  }

  async findAll(contentType?: string): Promise<NoteEntity[]> {
    return await this.noteRepository.find({
      where: contentType ? { contentType } : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  async findOneBySlug(slug: string): Promise<NoteEntity> {
    const note = await this.noteRepository.findOneBy({ slug });
    if (!note) {
      throw new NotFoundException(`Note with slug "${slug}" not found`);
    }
    return note;
  }

  async update(id: number, updateNoteDto: UpdateNoteDto): Promise<NoteEntity> {
    const note = await this.noteRepository.findOneBy({ id });
    if (!note) {
      throw new NotFoundException(`Note #${id} not found`);
    }
    Object.assign(note, updateNoteDto);
    return await this.noteRepository.save(note);
  }

  async remove(id: number): Promise<void> {
    const result = await this.noteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Note #${id} not found`);
    }
  }
}
