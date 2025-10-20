import sharp from 'sharp';
import { S3 } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.utils';

const s3 = new S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const bucketName = process.env.S3_BUCKET_NAME || 'ecommerce-product-images';
const bucketUrl = process.env.S3_BUCKET_URL || `https://${bucketName}.s3.amazonaws.com`;
const cdnEnabled = process.env.CDN_ENABLED === 'true';
const cdnUrl = process.env.CDN_URL;

// Image size configurations
const IMAGE_SIZES = {
  thumbnail: parseInt(process.env.IMAGE_THUMBNAIL_WIDTH || '150'),
  small: parseInt(process.env.IMAGE_SMALL_WIDTH || '300'),
  medium: parseInt(process.env.IMAGE_MEDIUM_WIDTH || '600'),
  large: parseInt(process.env.IMAGE_LARGE_WIDTH || '1200'),
};

const IMAGE_QUALITY = parseInt(process.env.IMAGE_QUALITY || '80');

export interface ProcessedImage {
  original: string;
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export class ImageService {
  /**
   * Process and upload an image
   */
  async processAndUpload(
    file: Express.Multer.File,
    folder: string = 'products'
  ): Promise<ProcessedImage> {
    try {
      const imageId = uuidv4();
      const fileExtension = 'jpg'; // Always convert to JPEG for consistency

      // Get image metadata
      const metadata = await sharp(file.buffer).metadata();
      const originalWidth = metadata.width || 0;
      const originalHeight = metadata.height || 0;

      // Generate all sizes
      const sizes = await Promise.all([
        this.resizeAndOptimize(file.buffer, 'original', null),
        this.resizeAndOptimize(file.buffer, 'thumbnail', IMAGE_SIZES.thumbnail),
        this.resizeAndOptimize(file.buffer, 'small', IMAGE_SIZES.small),
        this.resizeAndOptimize(file.buffer, 'medium', IMAGE_SIZES.medium),
        this.resizeAndOptimize(file.buffer, 'large', IMAGE_SIZES.large),
      ]);

      // Upload all sizes to S3
      const uploadPromises = sizes.map((size) =>
        this.uploadToS3(
          size.buffer,
          `${folder}/${imageId}_${size.name}.${fileExtension}`,
          'image/jpeg'
        )
      );

      const urls = await Promise.all(uploadPromises);

      const baseUrl = cdnEnabled && cdnUrl ? cdnUrl : bucketUrl;

      return {
        original: `${baseUrl}/${urls[0]}`,
        thumbnail: `${baseUrl}/${urls[1]}`,
        small: `${baseUrl}/${urls[2]}`,
        medium: `${baseUrl}/${urls[3]}`,
        large: `${baseUrl}/${urls[4]}`,
        width: originalWidth,
        height: originalHeight,
        size: file.size,
        format: fileExtension,
      };
    } catch (error) {
      logger.error('Error processing and uploading image:', error);
      throw error;
    }
  }

  /**
   * Resize and optimize an image
   */
  private async resizeAndOptimize(
    buffer: Buffer,
    name: string,
    width: number | null
  ): Promise<{ name: string; buffer: Buffer }> {
    let processor = sharp(buffer).jpeg({ quality: IMAGE_QUALITY });

    if (width) {
      processor = processor.resize(width, null, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const optimized = await processor.toBuffer();

    return {
      name,
      buffer: optimized,
    };
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<string> {
    try {
      await s3
        .putObject({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
          CacheControl: 'max-age=31536000', // 1 year
        })
        .promise();

      return key;
    } catch (error) {
      logger.error('Error uploading to S3:', error);
      throw error;
    }
  }

  /**
   * Delete an image and all its sizes from S3
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const url = new URL(imageUrl);
      const key = url.pathname.substring(1); // Remove leading slash

      // Get base key (without size suffix)
      const baseKey = key.replace(/_original\.|_thumbnail\.|_small\.|_medium\.|_large\./, '_');

      // Delete all sizes
      const sizes = ['original', 'thumbnail', 'small', 'medium', 'large'];
      const deletePromises = sizes.map((size) => {
        const sizeKey = baseKey.replace('_', `_${size}.`);
        return s3.deleteObject({ Bucket: bucketName, Key: sizeKey }).promise();
      });

      await Promise.all(deletePromises);
      logger.debug(`Deleted image: ${baseKey}`);
    } catch (error) {
      logger.error('Error deleting image from S3:', error);
      throw error;
    }
  }

  /**
   * Generate a signed URL for private images (future use)
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const url = await s3.getSignedUrlPromise('getObject', {
        Bucket: bucketName,
        Key: key,
        Expires: expiresIn,
      });

      return url;
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Validate image file
   */
  validateImage(file: Express.Multer.File): { valid: boolean; error?: string } {
    const maxSize = parseInt(process.env.IMAGE_UPLOAD_MAX_SIZE || '5242880'); // 5MB default
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB.`,
      };
    }

    return { valid: true };
  }
}

export default new ImageService();
