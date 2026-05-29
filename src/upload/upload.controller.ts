import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, readdirSync, unlinkSync } from 'fs';
import { randomBytes } from 'crypto';
import { AdminTokenGuard } from '../common/guards/admin-token.guard';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Controller('uploads')
@UseGuards(AdminTokenGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOADS_DIR,
        filename: (_req, file, cb) => {
          const unique = randomBytes(8).toString('hex');
          cb(null, `${unique}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (_req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i;
        cb(null, allowed.test(file.originalname));
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File): { url: string; name: string } {
    return { url: `/uploads/${file.filename}`, name: file.filename };
  }

  @Get()
  list(): { files: { name: string; url: string }[] } {
    if (!existsSync(UPLOADS_DIR)) return { files: [] };
    const files = readdirSync(UPLOADS_DIR)
      .filter((f) => /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(f))
      .map((name) => ({ name, url: `/uploads/${name}` }));
    return { files };
  }

  @Delete(':filename')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('filename') filename: string): void {
    const filePath = join(UPLOADS_DIR, filename);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`File ${filename} not found`);
    }
    unlinkSync(filePath);
  }
}
