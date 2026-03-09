// middlewares/uploadPdf.js
import multer from "multer";

const storage = multer.memoryStorage();

const uploadPdf = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

export default uploadPdf;