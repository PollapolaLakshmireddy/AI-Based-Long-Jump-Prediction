const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { cleanupTemporaryVideos } = require("./data/memoryStore");

// ============================================================
// APP INITIALIZATION
// ============================================================

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ============================================================
// DIRECTORIES
// ============================================================

const backendDir = __dirname;
const uploadsDir = path.join(backendDir, "uploads");
const videoOutputsDir = path.join(backendDir, "..", "ml", "video", "outputs");
const mlVideoDir = path.join(backendDir, "..", "ml", "video");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(videoOutputsDir)) {
    fs.mkdirSync(videoOutputsDir, { recursive: true });
}

// ============================================================
// STATIC FILES & ASSETS
// ============================================================

// Redirect root to Login
app.get("/", (req, res) => {
    return res.redirect("/login.html");
});

// Serve Frontend web app
app.use(express.static(path.join(__dirname, "../frontend")));

// Handle favicon
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Uploaded original videos
const staticVideoOptions = {
    acceptRanges: true,
    setHeaders: (res, filePath) => {
        if (filePath.toLowerCase().endsWith(".mp4")) {
            res.setHeader("Content-Type", "video/mp4");
        }
    }
};

app.use("/uploads", express.static(uploadsDir, staticVideoOptions));

// Analyzed videos
app.use("/video/outputs", express.static(videoOutputsDir, staticVideoOptions));
app.use("/ml-video/outputs", express.static(videoOutputsDir, staticVideoOptions));
app.use("/ml-video", express.static(mlVideoDir, staticVideoOptions));

// ============================================================
// API ROUTES
// ============================================================

// 1. Authentication (Register, Login, Session, Logout)
const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);

// 2. Athlete Features & Profiles
const athleteRoutes = require("./routes/athleteRoutes");
app.use("/api/athletes", athleteRoutes);

// 3. Tests & Instructions (Athlete facing)
const testRoutes = require("./routes/testRoutes");
app.use("/api/tests", testRoutes);
app.use("/api/instructions", (req, res, next) => {
    req.url = "/instructions" + req.url;
    testRoutes(req, res, next);
});

// 4. Video Analysis (Computer Vision & Pose Estimation)
const videoRoutes = require("./routes/videoRoutes");
app.use("/api/video", videoRoutes);

// 5. ML Distance Prediction
const predictionRoutes = require("./routes/predictionRoutes");
app.use("/api/predictions", predictionRoutes);

// 6. Admin Portal Management & Analytics
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// 7. General Reports & Performance Compatibility endpoints
const reportRoutes = require("./routes/reportRoutes");
app.use("/api/reports", reportRoutes);
const performanceRoutes = require("./routes/performanceRoutes");
app.use("/api/performance", performanceRoutes);

// 8. Results Dashboard endpoint alias
app.use("/api/results", (req, res, next) => {
    req.url = "/history" + (req.url === "/" ? "" : req.url);
    videoRoutes(req, res, next);
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AI-Based Sports Talent Identification API is running.",
        storage: "In-Memory (JavaScript Maps)",
        status: "healthy",
        timestamp: new Date().toISOString()
    });
});

// Video Output Check
app.get("/api/video/outputs", (req, res) => {
    try {
        if (!fs.existsSync(videoOutputsDir)) {
            return res.json({ success: true, files: [] });
        }
        const files = fs.readdirSync(videoOutputsDir).filter(f => f.toLowerCase().endsWith(".mp4"));
        return res.json({ success: true, files });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found.",
        path: req.originalUrl
    });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
    console.error("SERVER ERROR:", error);
    if (res.headersSent) return next(error);
    res.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error."
    });
});

// ============================================================
// PERIODIC TEMPORARY VIDEO CLEANUP
// Runs every 30 minutes to clean files older than 4 hours
// ============================================================

const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
setInterval(() => {
    cleanupTemporaryVideos(4);
}, CLEANUP_INTERVAL_MS);

// ============================================================
// START SERVER
// ============================================================

let server = null;

if (require.main === module) {
    server = app.listen(PORT, () => {
        console.log("");
        console.log("============================================================");
        console.log("AI-BASED SPORTS TALENT IDENTIFICATION & ASSESSMENT PLATFORM");
        console.log("============================================================");
        console.log(`🚀 Server running on: http://localhost:${PORT}`);
        console.log(`📊 Health Check:      http://localhost:${PORT}/api/health`);
        console.log(`🔐 Admin Portal:      http://localhost:${PORT}/login.html`);
        console.log(`🏃 Athlete Portal:    http://localhost:${PORT}/athlete-dashboard.html`);
        console.log(`💾 Data Storage:      Node.js In-Memory Maps (No Database Needed)`);
        console.log("============================================================");
        console.log("");
    });

    // Configure generous server timeouts for long-running computer vision video analysis
    server.timeout = 10 * 60 * 1000;         // 10 minutes
    server.headersTimeout = 11 * 60 * 1000;  // 11 minutes
    server.requestTimeout = 10 * 60 * 1000;  // 10 minutes
    server.keepAliveTimeout = 10 * 60 * 1000;// 10 minutes

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.error(`ERROR: Port ${PORT} is already in use.`);
        } else {
            console.error("SERVER ERROR:", error);
        }
    });

    process.on("SIGINT", () => {
        console.log("\nStopping server...");
        cleanupTemporaryVideos(0); // Clean on exit
        server.close(() => process.exit(0));
    });
}

module.exports = app;
module.exports.server = server;