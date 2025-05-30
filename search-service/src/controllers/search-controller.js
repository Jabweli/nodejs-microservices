import { Search } from "../models/search-model.js";
import { logger } from "../utils/logger.js";


export const searchPostController = async (req, res) => {
  logger.info("Search endpoint hit...");
  try {
    const { query } = req.query;

    // implement search cache
    const cacheSearchKey = `search:query:${query}`
    const cachedSearchResults = await req.redisClient.get(cacheSearchKey);

    if (cachedSearchResults) {
      return res.json(JSON.parse(cachedSearchResults));
    }

    // incase no cache available - get from database
    const results = await Search.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    ).sort({ score: { $meta: "textScore" } }).limit(10);

    // then save to cache
    await req.redisClient.setex(cacheSearchKey, 120, JSON.stringify(results))

    res.json(results)
  } catch (e) {
    logger.error("Error while searching post..");
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
