import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { MediaService } from './media.service';
import { ImageProcessorService } from './image-processor.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Media')
@Controller('media')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(
    private readonly mediaService: MediaService,
    private readonly imageProcessor: ImageProcessorService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all media items' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.mediaService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single media item' })
  async findOne(@Param('id') id: string) {
    return this.mediaService.findById(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a new media file' })
  async upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    // Multer saves the uploaded file to disk (configured in MediaModule).
    // Metadata is persisted to the database via mediaService.create().
    const media = await this.mediaService.create({
      filename: file.filename ?? file.originalname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      width: null,
      height: null,
      alt: '',
      caption: '',
      url: `/uploads/${file.filename ?? file.originalname}`,
      thumbnailUrl: null,
      uploadedBy: user.sub,
    });

    // Enqueue image processing asynchronously if the uploaded file is an image
    if (file.mimetype.startsWith('image/')) {
      this.imageProcessor.addToQueue(media.id).catch((err) => {
        this.logger.error(
          `Failed to enqueue image processing for media ${media.id}: ${err.message}`,
          err.stack,
        );
      });
    }

    return media;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media item' })
  async delete(@Param('id') id: string) {
    await this.mediaService.delete(id);
  }
}
