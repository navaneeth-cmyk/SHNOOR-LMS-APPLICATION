import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
        const ext = path.extname(file.originalname).toLowerCase();

        if (file.mimetype.startsWith("video/") || [".mp4", ".mkv", ".webm", ".mov", ".avi", ".ogg"].includes(ext)) {
            return {
                folder: "uploads/videos",
                resource_type: "video",
            };
        }

        if (file.mimetype === "application/pdf" || ext === ".pdf") {
            return {
                folder: "uploads/pdfs",
                resource_type: "raw",
                format: "pdf",
            };
        }

        // HTML, TXT, MD files
        return {
            folder: "uploads/docs",
            resource_type: "raw",
        };
    },
});

// File filter (Video & PDF & Docs)
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "video/mp4", "video/webm", "video/quicktime",
        "video/x-matroska", "video/x-msvideo", "video/ogg",
        "application/pdf", "application/x-pdf",
        "text/html", "application/xhtml+xml", "text/plain",
    ];

    const ext = path.extname(file.originalname || "").toLowerCase();
    const allowedExts = [".mp4", ".mkv", ".webm", ".mov", ".avi", ".ogg", ".pdf", ".html", ".htm", ".txt", ".md"];

    const isAllowedMime = allowedTypes.includes(file.mimetype);
    const isAllowedByExt =
        (file.mimetype === "application/octet-stream" || !file.mimetype) &&
        allowedExts.includes(ext);

    console.log(`[Upload Debug] Filename: ${file.originalname}, Mimetype: ${file.mimetype}, Ext: ${ext}`);

    if (isAllowedMime || isAllowedByExt) {
        cb(null, true);
    } else {
        console.error(`[Upload Debug] Rejected file: ${file.originalname} (${file.mimetype})`);
        cb(new Error(`Invalid file type (${file.mimetype}). Only video, PDF, HTML, and Text files are allowed.`), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
});

export const uploadFile = upload.single("file");

export const handleUpload = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = req.file.path; // ✅ Permanent Cloudinary URL

    res.status(200).json({
        message: "File uploaded successfully",
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
    });
};