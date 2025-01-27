import express, { Request, Response } from 'express';
import cors from 'cors';
import multer, { FileFilterCallback } from 'multer';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { FileStorage } from './types';
import path from 'path';
import { createServer } from 'http';
import crypto from 'crypto';

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

export function createHttpServer(fileStorage: FileStorage) {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  app.use(cors());
  app.use(express.json());

  // Broadcast file list updates to all connected clients
  const broadcastFileList = () => {
    const files = fileStorage.listFiles();
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'fileList', data: files }));
      }
    });
  };

  // WebSocket connection handling
  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');
    ws.send(JSON.stringify({ 
      type: 'fileList', 
      data: fileStorage.listFiles() 
    }));

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  // File upload endpoint
  app.post('/api/files', upload.single('file'), (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileId = crypto.randomBytes(16).toString('hex');
    const file = {
      metadata: {
        fileId,
        filename: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date(),
        contentType: req.file.mimetype
      },
      path: req.file.path
    };

    fileStorage.saveFile(file);
    broadcastFileList(); // Broadcast to all WebSocket clients
    res.json({ 
      fileId, 
      message: 'File uploaded successfully',
      files: fileStorage.listFiles() // Include updated file list in response
    });
  });

  // File download endpoint
  app.get('/api/files/:fileId', (req: Request, res: Response) => {
    const file = fileStorage.getFile(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(file.path, file.metadata.filename);
  });

  // List files endpoint
  app.get('/api/files', (_req: Request, res: Response) => {
    res.json(fileStorage.listFiles());
  });

  // Delete file endpoint
  app.delete('/api/files/:fileId', (req: Request, res: Response) => {
    const success = fileStorage.deleteFile(req.params.fileId);
    if (!success) {
      return res.status(404).json({ error: 'File not found' });
    }

    broadcastFileList();
    res.json({ message: 'File deleted successfully' });
  });

  return httpServer;
}
