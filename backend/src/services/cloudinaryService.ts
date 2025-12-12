import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from "cloudinary";
import { env } from "../config/env.js";

const configuredCloudinary = (() => {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName(),
    api_key: env.cloudinaryApiKey(),
    api_secret: env.cloudinaryApiSecret(),
  });
  return cloudinary;
})();

interface UploadImageOptions {
  folder?: string;
  publicId?: string;
  overwrite?: boolean;
}

export interface UploadedImage {
  url: string;
  secureUrl: string;
  publicId: string;
}

export const uploadImageBuffer = async (buffer: Buffer, options: UploadImageOptions = {}): Promise<UploadedImage> => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder,
      public_id: options.publicId,
      overwrite: options.overwrite ?? true,
      resource_type: "image" as const,
    };

    const uploadStream = configuredCloudinary.uploader.upload_stream(uploadOptions, (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
      if (error || !result) {
        return reject(error ?? new Error("Cloudinary upload failed"));
      }

      return resolve({
        url: result.url,
        secureUrl: result.secure_url,
        publicId: result.public_id,
      });
    });

    uploadStream.end(buffer);
  });
};
