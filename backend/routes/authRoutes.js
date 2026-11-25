const express = require("express");
const router = express.Router();
const { registerAthlete, login, getMe, logout } = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

// Public Auth Routes
router.post("/register", registerAthlete);
router.post("/login", login);

// Authenticated Routes
router.get("/me", authenticate, getMe);
router.post("/logout", authenticate, logout);

module.exports = router;
