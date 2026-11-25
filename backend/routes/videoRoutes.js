const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { optionalAuthenticate } = require("../middleware/authMiddleware");

const {
    analyzeVideo,
    getHistory,
    deleteHistoryItem,
    clearHistory
} = require("../controllers/videoController");

// Upload Directory
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const filename = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
        cb(null, filename);
    }
});

// File Filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
        "video/webm"
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp4|mov|avi|webm|mkv)$/i)) {
        cb(null, true);
    } else {
        cb(new Error("Only valid video files are allowed."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 }
});

// Video Analysis Route (attaches user if authenticated)
router.post("/analyze", optionalAuthenticate, upload.single("video"), analyzeVideo);

// Search History Routes
router.get("/history", optionalAuthenticate, getHistory);
router.delete("/history/:id", deleteHistoryItem);
router.delete("/history", clearHistory);

module.exports = router;