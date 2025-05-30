import { Media } from "../models/media-model.js"
import { deleteMediaFromCloudinary } from "./cloudinary.js"
import { logger } from "./logger.js"

export const handlePostDeleted = async (event) => {
  console.log("Emitted event", event)
  const {postId, mediaIds} = event

  try {
    const mediaToDelete = await Media.find({_id: {$in: mediaIds}})

    for(const media of mediaToDelete){
      await deleteMediaFromCloudinary(media.publicId)
      await Media.findOneAndDelete(media._id)

      logger.info(`Deleted media ${media._id} associated with this post ${postId}`)
    }

    logger.info(`Processed deletion of media for post ${postId}`)
  } catch (error) {
    logger.error("Error occured while deleting media", error)
  }
}