// middlewares/uploadPdf.js
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfsDir = path.join(__dirname, "..", "uploads", "pdfs");
if (!fs.existsSync(pdfsDir)) fs.mkdirSync(pdfsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pdfsDir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allowed MIME types for documents
  const allowedMimeTypes = [
    "application/pdf",                                          // PDF
    "text/plain",                                               // TXT
    "application/msword",                                       // DOC
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "application/vnd.ms-powerpoint",                            // PPT
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
    "application/vnd.ms-excel",                                 // XLS
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
    "text/csv",                                                 // CSV
    "text/html"                                                 // HTML
  ];

  // Allowed file extensions
  const allowedExtensions = [
    ".pdf", ".txt", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".html"
  ];

  const fileExt = path.extname(file.originalname || "").toLowerCase();
  const mimeType = file.mimetype || "";

  if (allowedMimeTypes.includes(mimeType) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.originalname}. Allowed types: PDF, TXT, DOCX, PPTX, XLS, XLSX, CSV, HTML`), false);
  }
};

const uploadPdf = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

export default uploadPdf;