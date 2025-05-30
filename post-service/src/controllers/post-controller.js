import { Post } from "../models/post-model.js";
import { logger } from "../utils/logger.js";
import { publishEvent } from "../utils/rabbitmq.js";
import { validatePost } from "../utils/validations.js";


// invalidate the redis post cache
async function invalidatePostCache(req,input){
  const cacheKey = `post:${input}`
  await req.redisClient.del(cacheKey);

  const keys = await req.redisClient.keys("posts:*")
  if(keys.length > 0){
    await req.redisClient.del(keys)
  }
}

// create post
export const createPost = async (req, res) => {
  logger.info("Create post endpoint hit..");
  try {
    // validate schema
    const { error } = validatePost(req.body);
    if (error) {
      logger.warn("Validation error!", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIds } = req.body;

    const newPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newPost.save();
    await invalidatePostCache(req, newPost._id.toString()) // delete cached posts


    // publish post created method
    await publishEvent('post:created', {
      postId: newPost._id.toString(),
      userId: newPost.user.toString(),
      content: newPost.content,
      createdAt: newPost.createdAt
    })

    logger.info("Post created succesfully!", newPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully!",
    });
  } catch (e) {
    logger.error("Error creating post", e);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

// fetch all posts
export const getAllPosts = async (req, res) => {
  logger.info("Get all posts endpoint hit..");
  try {
    // pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // get posts from cache
    const cachedKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cachedKey);

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    // if not cached get from db
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments()
    const result = {
      posts,
      currentPage: page,
      totalPages: Math.ceil(totalPosts/limit),
      total: totalPosts
    }

    // save your posts to redis cache
    await req.redisClient.setex(cachedKey, 300, JSON.stringify(result))
    
    res.json(result)
  } catch (e) {
    logger.error("Error fetching all posts", e);
    res.status(500).json({
      success: false,
      message: "Error fetching all posts",
    });
  }
};

// fetch single post
export const getPost = async (req, res) => {
  logger.info("Fetch single post endpoint hit..");
  try {
    const postId = req.params.id

    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey)
    if(cachedPost){
      return res.json(JSON.parse(cachedPost))
    }

    const singlePost = await Post.findById(postId)
    if(!singlePost){
      logger.error(`Post with $${postId} was not found`)
      return res.status(404).json({
        success: false,
        message: "Post not found"
      })
    }

    // cache post
    await req.redisClient.setex(cacheKey, 3600, JSON.stringify(singlePost))

    res.json({
      success:true,
      post: singlePost
    })
  } catch (e) {
    logger.error("Error fetching post", e);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
    });
  }
};

// delete post
export const deletePost = async (req, res) => {
  logger.info("Delete post endpoint hit..");
  try {
    const postId = req.params.id;

    // delete from database
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user:req.user.userId
    })
    if(!post){
      return res.status(404).json({
        success: false,
        message: "Post not found"
      })
    }

    // publish post delete method
    await publishEvent('post:deleted', {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds
    })

    // delete from cache if present
    await invalidatePostCache(req, postId)

    res.json({
      success: true,
      message: "Post deleted successfully!"
    })
  } catch (e) {
    logger.error("Error deleting post", e);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};
