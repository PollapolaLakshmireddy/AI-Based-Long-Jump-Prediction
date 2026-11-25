const express = require("express");
const router = express.Router();
const {
    getDashboardStats,
    getAdminAthletes,
    updateAthleteStatus,
    getAllSubmissions,
    getPlatformAnalytics,
    exportReportCsv,
    getReportSummary,
    getAllTests,
    createTest,
    updateTest,
    getAllInstructions,
    updateInstruction,
    addInstruction,
    cleanupVideos
} = require("../controllers/adminController");
const { authenticate, requireRole } = require("../middleware/authMiddleware");

// All admin routes require admin role
router.use(authenticate);
router.use(requireRole("admin"));

// 1. Dashboard Statistics
router.get("/dashboard-stats", getDashboardStats);

// 2. Manage Athletes
router.get("/athletes", getAdminAthletes);
router.put("/athletes/:id/status", updateAthleteStatus);

// 3. View Test Submissions
router.get("/submissions", getAllSubmissions);

// 4. Performance Analytics
router.get("/analytics", getPlatformAnalytics);

// 5. Generate Reports
router.get("/reports/csv", exportReportCsv);
router.get("/reports/summary", getReportSummary);

// 6. Manage Tests
router.get("/tests", getAllTests);
router.post("/tests", createTest);
router.put("/tests/:id", updateTest);

// 7. Manage Instructions
router.get("/instructions", getAllInstructions);
router.post("/instructions", addInstruction);
router.put("/instructions/:id", updateInstruction);

// 8. Cleanup Temporary Videos
router.post("/cleanup-videos", cleanupVideos);

module.exports = router;
