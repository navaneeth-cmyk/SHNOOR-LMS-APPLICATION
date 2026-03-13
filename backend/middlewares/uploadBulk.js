import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Allow CSV
    if (file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel" || path.extname(file.originalname).toLowerCase() === ".csv") {
        return cb(null, true);
    }

    // Allow other resource types (Video, PDF, Text)
    const allowedTypes = [
        "video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/x-msvideo", "video/ogg",
        "application/pdf",
        "text/plain", "text/html"
    ];
    const allowedExts = [
        ".mp4", ".mkv", ".webm", ".mov", ".avi", ".ogg",
        ".pdf",
        ".txt", ".html"
    ];

    const ext = path.extname(file.originalname || "").toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
        return cb(null, true);
    }

    cb(new Error(`Invalid file type: ${file.originalname}`), false);
};

const upload = multer({
    storage,
    fileFilter: fileFilter,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// Expecting 'file' (CSV) and 'resources' (Multiple files)
export const uploadBulk = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'resources', maxCount: 20 }
]);