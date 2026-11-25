const express = require("express");
const router = express.Router();
const athleteController = require("../controllers/athleteController");
const { authenticate, requireRole, requireSelfOrAdmin } = require("../middleware/authMiddleware");

// ========================================
// ATHLETE PROFILE & PERSONAL DASHBOARD
// ========================================

router.get("/profile", authenticate, requireRole("athlete"), athleteController.getMyProfile);
router.put("/profile", authenticate, requireRole("athlete"), athleteController.updateMyProfile);
router.get("/dashboard", authenticate, requireRole("athlete"), athleteController.getAthleteDashboard);
router.get("/analytics", authenticate, requireRole("athlete"), athleteController.getAthleteAnalytics);

// ========================================
// GENERAL ATHLETE ENDPOINTS
// ========================================

router.get("/", athleteController.getAllAthletes);
router.get("/:id", athleteController.getAthlete);
router.post("/", authenticate, requireRole("admin"), athleteController.createAthlete);
router.put("/:id", authenticate, requireSelfOrAdmin, athleteController.updateAthlete);
router.delete("/:id", authenticate, requireRole("admin"), athleteController.deleteAthlete);

module.exports = router;