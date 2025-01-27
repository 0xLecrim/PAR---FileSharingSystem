import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { Readable } from 'stream';
import fs from 'fs';

const PROTO_PATH = path.join(__dirname, '../../server/proto/file_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const fileService = protoDescriptor.fileservice;

export class FileServiceClient {
  private client: any;

  constructor(address: string = 'localhost:50051') {
    this.client = new fileService.FileService(
      address,
      grpc.credentials.createInsecure()
    );
  }

  async uploadFile(filePath: string, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const stream = this.client.uploadFile((error: any, response: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response.file_id);
      });

      const fileStream = fs.createReadStream(filePath);
      const fileStats = fs.statSync(filePath);
      let bytesUploaded = 0;

      // Send file info first
      stream.write({
        info: {
          filename: path.basename(filePath),
          content_type: 'application/octet-stream',
        },
      });

      fileStream.on('data', (chunk) => {
        stream.write({ chunk });
        bytesUploaded += chunk.length;
        if (onProgress) {
          onProgress((bytesUploaded / fileStats.size) * 100);
        }
      });

      fileStream.on('end', () => {
        stream.end();
      });

      fileStream.on('error', (error) => {
        stream.destroy();
        reject(error);
      });
    });
  }

  async downloadFile(fileId: string, outputPath: string, onProgress?: (progress: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const call = this.client.downloadFile({ file_id: fileId });
      const writeStream = fs.createWriteStream(outputPath);
      let totalSize = 0;
      let downloadedSize = 0;

      call.on('data', (chunk: any) => {
        const buffer = Buffer.from(chunk.chunk);
        writeStream.write(buffer);
        downloadedSize += buffer.length;
        if (onProgress) {
          onProgress((downloadedSize / totalSize) * 100);
        }
      });

      call.on('end', () => {
        writeStream.end();
        resolve();
      });

      call.on('error', (error: Error) => {
        writeStream.destroy();
        fs.unlink(outputPath, () => {});
        reject(error);
      });
    });
  }

  async listFiles(): Promise<Array<{
    file_id: string;
    filename: string;
    size: string;
    uploaded_at: string;
  }>> {
    return new Promise((resolve, reject) => {
      this.client.listFiles({}, (error: Error | null, response: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response.files);
      });
    });
  }

  async deleteFile(fileId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.client.deleteFile({ file_id: fileId }, (error: Error | null, response: any) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(response.success);
      });
    });
  }
}
