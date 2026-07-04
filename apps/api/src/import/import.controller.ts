import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ImportService } from './import.service';
import { Roles } from '../common/decorators/roles.decorator';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('Import')
@Controller('import')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class ImportController {
  private readonly logger = new Logger(ImportController.name);
  private readonly uploadDir: string;

  constructor(private readonly importService: ImportService) {
    this.uploadDir = path.join(process.cwd(), 'uploads', 'import-temp');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Preview a WXR file before import
   */
  @Post('preview')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'import-temp');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname) || '.xml';
          cb(null, `wxr-preview-${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.xml' || ext === '.wxr' || ext === '.zip') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only XML (WXR) files are accepted'), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Preview a WordPress WXR import file' })
  async preview(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const filePath = file.path;
    this.logger.log(`Preview WXR file: ${filePath} (${file.size} bytes)`);

    try {
      const result = await this.importService.previewWxr(filePath);
      return {
        success: true,
        data: result,
      };
    } catch (err: any) {
      // Clean up on error
      try {
        fs.unlinkSync(filePath);
      } catch {}
      throw err;
    }
  }

  /**
   * Execute a WXR import
   */
  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute WordPress WXR import' })
  async import(
    @Body()
    body: {
      filePath: string;
      importMedia?: boolean;
      importUsers?: boolean;
      downloadMedia?: boolean;
      baseSiteUrl?: string;
    },
  ) {
    if (!body.filePath) {
      throw new BadRequestException('filePath is required');
    }

    const absolutePath = path.resolve(body.filePath);

    if (!fs.existsSync(absolutePath)) {
      throw new BadRequestException(`File not found: ${absolutePath}`);
    }

    this.logger.log(`Starting WXR import: ${absolutePath}`);

    try {
      const result = await this.importService.importWxr(absolutePath, {
        importMedia: body.importMedia !== false,
        importUsers: body.importUsers !== false,
        downloadMedia: body.downloadMedia === true,
        baseSiteUrl: body.baseSiteUrl,
      });

      // Clean up temp file
      try {
        fs.unlinkSync(absolutePath);
      } catch {}

      return {
        success: result.success,
        data: {
          sessionId: result.sessionId,
          stats: result.stats,
          errors: result.errors.slice(0, 50), // Limit errors in response
          totalErrors: result.errors.length,
        },
      };
    } catch (err: any) {
      try {
        fs.unlinkSync(absolutePath);
      } catch {}
      throw err;
    }
  }

  /**
   * Upload WXR file (returns file path for subsequent import)
   */
  @Post('upload')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dir = path.join(process.cwd(), 'uploads', 'import-temp');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname) || '.xml';
          cb(null, `wxr-import-${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: 500 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a WXR file for import' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return {
      success: true,
      data: {
        filePath: file.path,
        fileName: file.originalname,
        fileSize: file.size,
      },
    };
  }

  /**
   * Rollback the last import
   */
  @Post('rollback')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rollback the last WordPress import' })
  async rollback() {
    return this.importService.rollback();
  }
}
