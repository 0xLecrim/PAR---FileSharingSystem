#!/usr/bin/env node
import { Command } from 'commander';
import inquirer from 'inquirer';
import { FileServiceClient } from './grpc-client';
import cliProgress from 'cli-progress';
import path from 'path';
import ora from 'ora';

const program = new Command();
const client = new FileServiceClient();

program
  .name('file-client')
  .description('CLI client for distributed file sharing system')
  .version('1.0.0');

program
  .command('upload <file>')
  .description('Upload a file to the server')
  .action(async (filePath: string) => {
    try {
      const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      progress.start(100, 0);

      const fileId = await client.uploadFile(filePath, (percent) => {
        progress.update(percent);
      });

      progress.stop();
      console.log(`File uploaded successfully! File ID: ${fileId}`);
    } catch (error: any) {
      console.error('Failed to upload file:', error?.message || 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('download <fileId>')
  .description('Download a file from the server')
  .option('-o, --output <path>', 'Output path')
  .action(async (fileId: string, options: { output?: string }) => {
    try {
      const spinner = ora('Getting file list').start();
      const files = await client.listFiles();
      spinner.stop();

      const file = files.find(f => f.file_id === fileId);
      if (!file) {
        console.error('File not found');
        process.exit(1);
      }

      const outputPath = options.output || file.filename;
      const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      progress.start(100, 0);

      await client.downloadFile(fileId, outputPath, (percent) => {
        progress.update(percent);
      });

      progress.stop();
      console.log(`File downloaded successfully to: ${outputPath}`);
    } catch (error: any) {
      console.error('Failed to download file:', error?.message || 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all files')
  .action(async () => {
    try {
      const spinner = ora('Getting file list').start();
      const files = await client.listFiles();
      spinner.stop();

      if (files.length === 0) {
        console.log('No files found');
        return;
      }

      console.log('\nFiles:');
      files.forEach(file => {
        console.log(`
  ID: ${file.file_id}
  Name: ${file.filename}
  Size: ${formatSize(parseInt(file.size))}
  Uploaded: ${new Date(file.uploaded_at).toLocaleString()}
  `);
      });
    } catch (error: any) {
      console.error('Failed to list files:', error?.message || 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete a file')
  .action(async () => {
    try {
      const spinner = ora('Getting file list').start();
      const files = await client.listFiles();
      spinner.stop();

      if (files.length === 0) {
        console.log('No files found');
        return;
      }

      const { fileId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'fileId',
          message: 'Select a file to delete:',
          choices: files.map(file => ({
            name: `${file.filename} (${formatSize(parseInt(file.size))})`,
            value: file.file_id
          }))
        }
      ]);

      const confirmSpinner = ora('Deleting file').start();
      const success = await client.deleteFile(fileId);
      confirmSpinner.stop();

      if (success) {
        console.log('File deleted successfully');
      } else {
        console.error('Failed to delete file');
        process.exit(1);
      }
    } catch (error: any) {
      console.error('Failed to delete file:', error?.message || 'Unknown error');
      process.exit(1);
    }
  });

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

program.parse();
