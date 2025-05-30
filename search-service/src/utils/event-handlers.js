import { Search } from "../models/search-model.js";
import { logger } from "./logger.js";

export const handlePostCreated = async (event) => {
  console.log("From create post event:", event);
  const { postId, userId, content, createdAt } = event;

  try {
    const newSearch = new Search({
      postId,
      userId,
      content,
      createdAt,
    });

    await newSearch.save();

    logger.info(`Search created for post ${postId}`);
  } catch (error) {
    logger.error("Error occured while creating search index", error);
  }
};

export const handlePostDeleted = async (event) => {
  console.log("From delete post event:", event);
  const { postId, userId } = event;

  try {
    const search = await Search.findOneAndDelete({ postId, userId });

    logger.info(`Search post deleted: ${search.postId}`);
  } catch (error) {
    logger.error("Error occured while deleting search", error);
  }
};
