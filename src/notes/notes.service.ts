import { Injectable } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
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

  findAll() {
    return `This action returns all notes`;
  }

  findOne(id: number) {
    return `This action returns a #${id} note`;
  }

  async update(
    id: number,
    updateNoteDto: UpdateNoteDto,
  ): Promise<UpdateResult> {
    return await this.noteRepository.update(id, updateNoteDto);
  }

  remove(id: number) {
    return `This action removes a #${id} note`;
  }
}
