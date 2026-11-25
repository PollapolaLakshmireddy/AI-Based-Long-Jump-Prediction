const express = require("express");

const router = express.Router();

const {
    saveResult
} = require("../controllers/resultController");


// ============================================================
// SAVE RESULT
// ============================================================

router.post(
    "/",
    saveResult
);


module.exports = router;