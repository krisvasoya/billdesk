// backend/src/services/cloudinary.service.ts
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

// Configure Cloudinary SDK
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export const cloudinaryService = {
  async uploadLogo(fileBuffer: Buffer): Promise<string> {
    if (!env.CLOUDINARY_CLOUD_NAME) {
      console.warn('Cloudinary not configured. Returning local mock logo URL.');
      return 'https://res.cloudinary.com/mock_cloudinary_cloud/image/upload/v1/logos/mock-logo.png';
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'billdesk/logos',
          resource_type: 'image',
          transformation: [{ width: 300, height: 300, crop: 'limit' }],
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      ).end(fileBuffer);
    });
  },

  async uploadInvoicePDF(fileBuffer: Buffer, fileName: string): Promise<string> {
    if (!env.CLOUDINARY_CLOUD_NAME) {
      console.warn('Cloudinary not configured. Returning local mock PDF URL.');
      return `https://res.cloudinary.com/mock_cloudinary_cloud/raw/upload/v1/invoices/${fileName}.pdf`;
    }

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'billdesk/invoices',
          resource_type: 'raw',
          public_id: fileName,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Upload failed'));
          }
          resolve(result.secure_url);
        }
      ).end(fileBuffer);
    });
  },
};
