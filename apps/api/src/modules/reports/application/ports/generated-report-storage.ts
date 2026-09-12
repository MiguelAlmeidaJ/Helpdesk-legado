export abstract class GeneratedReportStorage {
  abstract authorize(userId: number): Promise<void>;
  abstract list(): Promise<Array<{ name: string; size: number; modifiedAt: string; expiresAt: string }>>;
  abstract read(name: string): Promise<Buffer>;
  abstract remove(name: string): Promise<void>;
  abstract removeExpired(before: Date): Promise<number>;
  abstract save(clientId: number, start: string, end: string, pdf: Buffer): Promise<string>;
}
