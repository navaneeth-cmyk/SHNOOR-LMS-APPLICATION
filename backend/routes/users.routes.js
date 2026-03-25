import express from "express";
import {
  getMyProfile,
  getAllUsers,
  addInstructor,
  updateUserStatus,
  updateMyProfile,
  uploadProfilePicture,
  addStudent,
  addManager,
  bulkUploadInstructors,
  bulkUploadStudents,
  bulkUploadManagers,
} from "../controllers/user.controller.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import firebaseAuth from "../middlewares/firebaseAuth.js";
import attachUser from "../middlewares/attachUser.js";
import roleGuard from "../middlewares/roleGuard.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const profilePicsDir = path.join(__dirname, "..", "uploads", "profile_pictures");
if (!fs.existsSync(profilePicsDir)) fs.mkdirSync(profilePicsDir, { recursive: true });

const router = express.Router();
const uploadProfilePictureFile = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, profilePicsDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, unique + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if ((file.mimetype || "").startsWith("image/")) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"), false);
  },
});
const uploadCsv = multer({ storage: multer.memoryStorage() });

router.get(
  "/me",
  firebaseAuth,
  attachUser,
  getMyProfile
);

router.get(
  "/",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  getAllUsers
);

router.post(
  "/instructors",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  addInstructor
);

router.post(
  "/students",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  addStudent
);

router.post(
  "/managers",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  addManager
);

router.post(
  "/instructors/bulk",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  uploadCsv.single("csv"),
  bulkUploadInstructors
);

router.post(
  "/students/bulk",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  uploadCsv.single("csv"),
  bulkUploadStudents
);

router.post(
  "/managers/bulk",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  uploadCsv.single("csv"),
  bulkUploadManagers
);

router.patch(
  "/:userId/status",
  firebaseAuth,
  attachUser,
  roleGuard("admin"),
  updateUserStatus
);

router.put(
  "/me",
  firebaseAuth,
  attachUser,
  updateMyProfile
);

router.post(
  "/upload-profile-picture",
  firebaseAuth,
  attachUser,
  (req, res, next) => {
    uploadProfilePictureFile.single("file")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  uploadProfilePicture
);
export default router;