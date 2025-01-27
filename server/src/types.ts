export interface FileMetadata {
  fileId: string;
  filename: string;
  size: number;
  uploadedAt: Date;
  contentType: string;
}

export interface UploadedFile {
  metadata: FileMetadata;
  path: string;
}

export interface FileStorage {
  files: Map<string, UploadedFile>;
  getFile(fileId: string): UploadedFile | undefined;
  saveFile(file: UploadedFile): void;
  deleteFile(fileId: string): boolean;
  listFiles(): FileMetadata[];
}

export class InMemoryFileStorage implements FileStorage {
  files: Map<string, UploadedFile> = new Map();

  getFile(fileId: string): UploadedFile | undefined {
    return this.files.get(fileId);
  }

  saveFile(file: UploadedFile): void {
    this.files.set(file.metadata.fileId, file);
  }

  deleteFile(fileId: string): boolean {
    return this.files.delete(fileId);
  }

  listFiles(): FileMetadata[] {
    return Array.from(this.files.values()).map(file => file.metadata);
  }
}
