import express from "express"
import multer from "multer"
import { authenticateRequest } from "../middleware/auth-middleware.js";
import { uploadMedia } from "../controllers/media-controller.js";


const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).single("file") // file here is the name of the input field on the frontend

export const router = express.Router();

router.post("/upload", authenticateRequest, (req,res,next)=>{
  upload(req,res, function(err){
    if(err instanceof multer.MulterError){
      logger.error("Multer error while uploading", err)
      return res.status(400).json({
        success: false,
        message: "Multer error while uploading",
        error: err.message,
        stack: err.stack
      })
    }else if(err){
      logger.error("Unknown error occured while uploading", err)
      return res.status(400).json({
        success: false,
        message: "Unknown error occured while uploading",
        error: err.message,
        stack: err.stack
      })
    }

    if(!req.file){
      return res.status(400).json({
        success: false,
        message: "No file found",
      })
    }

    next()
  })
}, uploadMedia)