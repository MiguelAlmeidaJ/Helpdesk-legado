export interface ExpenseAttachmentFileReference {
  storagePath?: string;
  url?: string;
}

export interface StoredExpenseAttachmentFile {
  name: string;
  mimeType: string;
  storagePath: string;
}

export abstract class ExpenseAttachmentStorage {
  abstract store(input: {
    key: string;
    originalName: string;
    mimeType: string;
    data: Buffer;
    now?: Date;
  }): Promise<StoredExpenseAttachmentFile>;

  abstract read(reference: ExpenseAttachmentFileReference): Promise<Buffer | null>;

  abstract remove(reference: ExpenseAttachmentFileReference): Promise<void>;
}
