import { v2 as cloudinary } from "cloudinary";
import { logger } from "../utils/logger.js";
import dotenv from "dotenv";
dotenv.config();

// Configuration
cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret, // Click 'View API Keys' above to copy your API secret
});

// upload media
export const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "auto" },
      (error, result) => {
        if (error) {
          logger.error(
            "Error occured while uploading media to cloudinary",
            error
          );
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file.buffer)
  });
};

export const deleteMediaFromCloudinary = async (publicID) => {
  try {
    const result = await cloudinary.uploader.destroy(publicID)
    logger.info("Media deleted successfully from cloud storage", publicID)
    return result;
  } catch (error) {
    logger.error("Failed to delete media from cloudinary", error)
    throw error
  }
}