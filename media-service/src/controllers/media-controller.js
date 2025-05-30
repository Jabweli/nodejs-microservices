import { Media } from "../models/media-model.js";
import { uploadMediaToCloudinary } from "../utils/cloudinary.js";
import { logger } from "../utils/logger.js";

export const uploadMedia = async (req, res) => {
  logger.info("Starting media upload");

  try {
    // check if file is present
    if (!req.file) {
      logger.error("No file found. Please add a file and try again!");
      return res.status(400).json({
        success: false,
        message: "No file found. Please add a file and try again!"
      });
    }

    const {originalname, mimetype, buffer} = req.file
    const userId = req.user.userId;

    logger.info(`File details: name=${originalname}, type=${mimetype}`)
    logger.info("Uploading file to cloudinary starting...")

    const uploadResult = await uploadMediaToCloudinary(req.file)
    logger.info(`File upload successful. Public Id = ${uploadResult.public_id}`)

    const newMedia = new Media({
      publicId: uploadResult.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: uploadResult.secure_url,
      userId
    })

    await newMedia.save()
    res.status(201).json({
      success: true,
      mediaId: newMedia.publicId,
      url: newMedia.url,
      message: "File uploaded successfully!"
    });

  } catch (error) {
    logger.error("Error occured while upload file", error);
    res.status(500).json({
      success: false,
      message: "Internal server error!",
    });
  }
};
