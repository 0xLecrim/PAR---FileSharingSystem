import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { FileStorage } from './types';
import { Readable } from 'stream';
import fs from 'fs';
import crypto from 'crypto';

const PROTO_PATH = path.join(__dirname, '../proto/file_service.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;
const fileService = protoDescriptor.fileservice;

interface FileInfo {
  filename: string;
  content_type: string;
}

export function createGrpcServer(fileStorage: FileStorage): grpc.Server {
  const server = new grpc.Server();

  server.addService(fileService.FileService.service, {
    uploadFile: (call: grpc.ServerReadableStream<any, any>, callback: grpc.sendUnaryData<any>) => {
      let fileInfo: FileInfo | null = null;
      const chunks: Buffer[] = [];

      call.on('data', (chunk) => {
        if (chunk.info) {
          fileInfo = chunk.info;
        } else if (chunk.chunk) {
          chunks.push(Buffer.from(chunk.chunk));
        }
      });

      call.on('end', () => {
        if (!fileInfo) {
          callback({
            code: grpc.status.INVALID_ARGUMENT,
            message: 'No file info provided',
          });
          return;
        }

        const fileId = crypto.randomBytes(16).toString('hex');
        const filePath = path.join('uploads', fileId + (fileInfo ? path.extname(fileInfo.filename) : ''));

        fs.writeFile(filePath, Buffer.concat(chunks), (err) => {
          if (err) {
            callback({
              code: grpc.status.INTERNAL,
              message: 'Failed to save file',
            });
            return;
          }

          const file = {
            metadata: {
              fileId,
              filename: fileInfo ? fileInfo.filename : 'unknown',
              size: chunks.reduce((acc, chunk) => acc + chunk.length, 0),
              uploadedAt: new Date(),
              contentType: fileInfo ? fileInfo.content_type : 'application/octet-stream',
            },
            path: filePath,
          };

          fileStorage.saveFile(file);
          callback(null, {
            message: 'File uploaded successfully',
            success: true,
            file_id: fileId,
          });
        });
      });
    },

    downloadFile: (call: grpc.ServerWritableStream<any, any>) => {
      const fileId = call.request.file_id;
      const file = fileStorage.getFile(fileId);

      if (!file) {
        call.emit('error', {
          code: grpc.status.NOT_FOUND,
          message: 'File not found',
        });
        return;
      }

      const readStream = fs.createReadStream(file.path);
      readStream.on('data', (chunk) => {
        call.write({ chunk });
      });

      readStream.on('end', () => {
        call.end();
      });

      readStream.on('error', (err) => {
        call.emit('error', {
          code: grpc.status.INTERNAL,
          message: 'Error reading file',
        });
      });
    },

    listFiles: (_call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
      const files = fileStorage.listFiles().map((file) => ({
        file_id: file.fileId,
        filename: file.filename,
        size: file.size.toString(),
        uploaded_at: file.uploadedAt.toISOString(),
      }));

      callback(null, { files });
    },

    deleteFile: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
      const fileId = call.request.file_id;
      const success = fileStorage.deleteFile(fileId);

      if (!success) {
        callback({
          code: grpc.status.NOT_FOUND,
          message: 'File not found',
        });
        return;
      }

      callback(null, {
        success: true,
        message: 'File deleted successfully',
      });
    },
  });

  return server;
}
