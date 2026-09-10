import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  ExpenseAttachmentStorage,
  type ExpenseAttachmentFileReference,
  type StoredExpenseAttachmentFile,
} from '../../expenses/application/ports/expense-attachment.storage';

@Injectable()
export class LocalExpenseAttachmentStorage extends ExpenseAttachmentStorage {
  async store(input: {
    key: string;
    originalName: string;
    mimeType: string;
    data: Buffer;
    now?: Date;
  }): Promise<StoredExpenseAttachmentFile> {
    const originalName = this.safeOriginalName(input.originalName);
    const date = input.now ?? new Date();
    const directory = path.posix.join(
      'native',
      `${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}`,
    );
    const relativePath = path.posix.join(directory, `${input.key}.pdf`);
    const physical = this.safeStoragePath(relativePath);
    if (!physical) {
      throw new Error('Caminho de armazenamento de RD inválido.');
    }

    await mkdir(path.dirname(physical), { recursive: true });
    await writeFile(physical, input.data);

    return {
      name: originalName,
      mimeType: input.mimeType || 'application/pdf',
      storagePath: relativePath,
    };
  }

  async read(reference: ExpenseAttachmentFileReference): Promise<Buffer | null> {
    const physical = this.physicalPath(reference);
    if (!physical) return null;

    try {
      return await readFile(physical);
    } catch {
      return null;
    }
  }

  async remove(reference: ExpenseAttachmentFileReference): Promise<void> {
    const physical = this.physicalPath(reference);
    if (physical) {
      await unlink(physical).catch(() => undefined);
    }
  }

  private uploadRoot(): string {
    return path.resolve(
      process.env.RD_UPLOAD_DIR?.trim() ||
        path.join(process.cwd(), 'uploads_rd'),
    );
  }

  private safeStoragePath(relative: string): string | null {
    const root = this.uploadRoot();
    const candidate = path.resolve(root, relative);
    return candidate !== root && candidate.startsWith(`${root}${path.sep}`)
      ? candidate
      : null;
  }

  private physicalPath(reference: ExpenseAttachmentFileReference): string | null {
    if (reference.storagePath) {
      return this.safeStoragePath(reference.storagePath);
    }
    if (!reference.url) return null;

    try {
      const pathname = new URL(reference.url, 'http://legacy.local').pathname;
      const marker = '/uploads_rd/';
      const index = pathname.toLowerCase().indexOf(marker);
      if (index < 0) return null;

      const relative = decodeURIComponent(pathname.slice(index + marker.length));
      return this.safeStoragePath(relative);
    } catch {
      return null;
    }
  }

  private safeOriginalName(value: string): string {
    const name = path.basename(value.replace(/\\/g, '/')).trim();
    return (name || 'comprovante.pdf').slice(0, 255);
  }
}
