import { createHttpServer } from './http-server';
import { createGrpcServer } from './grpc-server';
import { InMemoryFileStorage } from './types';
import * as grpc from '@grpc/grpc-js';
import fs from 'fs';
import path from 'path';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create shared file storage
const fileStorage = new InMemoryFileStorage();

// Initialize HTTP server
const httpServer = createHttpServer(fileStorage);
const HTTP_PORT = process.env.HTTP_PORT || 3005;

httpServer.listen(HTTP_PORT, () => {
  console.log(`HTTP server running on port ${HTTP_PORT}`);
  console.log(`WebSocket server running on ws://localhost:${HTTP_PORT}`);
});

// Initialize gRPC server
const grpcServer = createGrpcServer(fileStorage);
const GRPC_PORT = process.env.GRPC_PORT || 50051;

grpcServer.bindAsync(
  `0.0.0.0:${GRPC_PORT}`,
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    if (error) {
      console.error('Failed to start gRPC server:', error);
      return;
    }
    grpcServer.start();
    console.log(`gRPC server running on port ${port}`);
  }
);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  httpServer.close(() => {
    console.log('HTTP server closed');
  });
  grpcServer.tryShutdown(() => {
    console.log('gRPC server closed');
    process.exit(0);
  });
});
