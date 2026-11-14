import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const STATION_PHOTOS_DIR = join('uploads', 'station-photos');
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class UploadsService {
  async saveStationPhoto(file: Express.Multer.File): Promise<{ path: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('A photo file is required');
    }

    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Photo must be 5 MB or smaller');
    }

    const mime = file.mimetype;
    if (!ALLOWED_MIME.has(mime)) {
      throw new BadRequestException('Photo must be a JPEG, PNG, WebP, or GIF image');
    }

    const ext = extname(file.originalname).toLowerCase() || EXT_BY_MIME[mime] || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : EXT_BY_MIME[mime];

    await mkdir(STATION_PHOTOS_DIR, { recursive: true });

    const filename = `${randomUUID()}${safeExt === '.jpeg' ? '.jpg' : safeExt}`;
    await writeFile(join(STATION_PHOTOS_DIR, filename), file.buffer);

    return { path: `/uploads/station-photos/${filename}` };
  }
}