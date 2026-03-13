import { v2 as cloudinary } from "cloudinary";
import path from "path";

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn(
    "[Cloudinary] Missing credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const makePublicId = (originalname = "file") => {
  const base = path.basename(originalname, path.extname(originalname));
  const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80) || "file";
  return `${safeBase}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
};

export const uploadLocalFileToCloudinary = (filePath, options = {}) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: "auto",
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "shnoor-lms",
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
  });

export const uploadBufferToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "shnoor-lms",
        public_id: makePublicId(options.originalname),
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });