// y-leveldb ships declarations its package.json "exports" don't expose; declare the part the server uses.
declare module "y-leveldb" {
  import type { Doc } from "yjs";

  export class LeveldbPersistence {
    constructor(
      location: string,
      options?: {
        level?: (location: string, options: object) => unknown;
        levelOptions?: object;
      },
    );
    /** Resolves with null when the transaction fails (the library logs and swallows the error). */
    getYDoc(docName: string): Promise<Doc | null>;
    /** Resolves with the update's clock, or null when the transaction fails. */
    storeUpdate(docName: string, update: Uint8Array): Promise<number | null>;
    destroy(): Promise<void>;
  }
}
