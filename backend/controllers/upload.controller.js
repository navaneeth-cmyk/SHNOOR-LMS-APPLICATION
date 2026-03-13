import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsRoot = path.join(__dirname, "..", "uploads");

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        let subFolder;
        if (file.mimetype.startsWith("video/") || [".mp4", ".mkv", ".webm", ".mov", ".avi", ".ogg"].includes(ext)) {
            subFolder = "videos";
        } else if (file.mimetype === "application/pdf" || ext === ".pdf") {
            subFolder = "pdfs";
        } else {
            subFolder = "docs";
        }
        const dir = path.join(uploadsRoot, subFolder);
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
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

    const subFolder = path.basename(req.file.destination);
    const fileUrl = `${process.env.BACKEND_URL || ""}/uploads/${subFolder}/${req.file.filename}`;

    res.status(200).json({
        message: "File uploaded successfully",
        url: fileUrl,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
    });
};