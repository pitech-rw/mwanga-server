import { Injectable } from '@nestjs/common';
import { apiBadRequest } from '../errors/api-error.js';
import { UploadsCodes } from '../errors/codes.js';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const STATION_PHOTOS_DIR = join('uploads', 'station-photos');
const INCIDENT_PHOTOS_DIR = join('uploads', 'incident-photos');
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
      apiBadRequest(UploadsCodes.photoRequired);
    }

    if (file.size > MAX_BYTES) {
      apiBadRequest(UploadsCodes.photoTooLarge);
    }

    const mime = file.mimetype;
    if (!ALLOWED_MIME.has(mime)) {
      apiBadRequest(UploadsCodes.photoInvalidType);
    }

    const ext = extname(file.originalname).toLowerCase() || EXT_BY_MIME[mime] || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : EXT_BY_MIME[mime];

    await mkdir(STATION_PHOTOS_DIR, { recursive: true });

    const filename = `${randomUUID()}${safeExt === '.jpeg' ? '.jpg' : safeExt}`;
    await writeFile(join(STATION_PHOTOS_DIR, filename), file.buffer);

    return { path: `/uploads/station-photos/${filename}` };
  }

  async saveIncidentPhoto(file: Express.Multer.File): Promise<{ path: string }> {
    if (!file?.buffer?.length) {
      apiBadRequest(UploadsCodes.photoRequired);
    }

    if (file.size > MAX_BYTES) {
      apiBadRequest(UploadsCodes.photoTooLarge);
    }

    const mime = file.mimetype;
    if (!ALLOWED_MIME.has(mime)) {
      apiBadRequest(UploadsCodes.photoInvalidType);
    }

    const ext = extname(file.originalname).toLowerCase() || EXT_BY_MIME[mime] || '.jpg';
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : EXT_BY_MIME[mime];

    await mkdir(INCIDENT_PHOTOS_DIR, { recursive: true });

    const filename = `${randomUUID()}${safeExt === '.jpeg' ? '.jpg' : safeExt}`;
    await writeFile(join(INCIDENT_PHOTOS_DIR, filename), file.buffer);

    return { path: `/uploads/incident-photos/${filename}` };
  }
}