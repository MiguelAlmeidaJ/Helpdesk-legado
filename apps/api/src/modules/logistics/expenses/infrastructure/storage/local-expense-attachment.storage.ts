import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  ExpenseAttachmentStorage,
  type ExpenseAttachmentFileReference,
  type StoredExpenseAttachmentFile,
} from '../../application/ports/expense-attachment.storage';

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
    for (const physical of this.physicalPaths(reference)) {
      try {
        return await readFile(physical);
      } catch {
        // Try the legacy location before treating the attachment as missing.
      }
    }

    return null;
  }

  async remove(reference: ExpenseAttachmentFileReference): Promise<void> {
    for (const physical of this.physicalPaths(reference)) {
      await unlink(physical).catch(() => undefined);
    }
  }

  private uploadRoot(): string {
    return path.resolve(
      process.env.RD_UPLOAD_DIR?.trim() ||
        path.join(process.cwd(), 'storage', 'uploads', 'rd'),
    );
  }

  private legacyUploadRoot(): string {
    return path.resolve(process.cwd(), 'uploads_rd');
  }

  private safeStoragePath(
    relative: string,
    root = this.uploadRoot(),
  ): string | null {
    const candidate = path.resolve(root, relative);
    return candidate !== root && candidate.startsWith(`${root}${path.sep}`)
      ? candidate
      : null;
  }

  private physicalPaths(reference: ExpenseAttachmentFileReference): string[] {
    const relative = this.relativePath(reference);
    if (!relative) return [];
    const roots = [this.uploadRoot(), this.legacyUploadRoot()];

    return [...new Set(roots)]
      .map((root) => this.safeStoragePath(relative, root))
      .filter((candidate): candidate is string => candidate !== null);
  }

  private relativePath(reference: ExpenseAttachmentFileReference): string | null {
    if (reference.storagePath) {
      return reference.storagePath;
    }
    if (!reference.url) return null;

    try {
      const pathname = new URL(reference.url, 'http://legacy.local').pathname;
      const marker = '/uploads_rd/';
      const index = pathname.toLowerCase().indexOf(marker);
      if (index < 0) return null;

      return decodeURIComponent(pathname.slice(index + marker.length));
    } catch {
      return null;
    }
  }

  private safeOriginalName(value: string): string {
    const name = path.basename(value.replace(/\\/g, '/')).trim();
    return (name || 'comprovante.pdf').slice(0, 255);
  }
}
