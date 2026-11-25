const express = require("express");
const router = express.Router();
const {
    getActiveTests,
    getInstructions,
    getMySubmissions,
    getSubmissionById
} = require("../controllers/testController");
const { authenticate, optionalAuthenticate } = require("../middleware/authMiddleware");

// Public/Authenticated Test & Instruction Access
router.get("/", getActiveTests);
router.get("/instructions", getInstructions);

// Athlete Submission History & Result Drilldown (Public/Hybrid fallback)
router.get("/submissions/my-history", optionalAuthenticate, getMySubmissions);
router.get("/submissions/:id", optionalAuthenticate, getSubmissionById);

module.exports = router;
