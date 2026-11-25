const express = require("express");
const router = express.Router();

const {
    predictAthlete
} = require("../controllers/predictionController");

router.post("/", predictAthlete);
router.post("/predict", predictAthlete);
router.post("/manual", predictAthlete);

module.exports = router;
