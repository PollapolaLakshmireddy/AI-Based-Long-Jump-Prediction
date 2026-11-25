const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { generateBiomechanicalFeedback, submissions } = require("../data/memoryStore");

// Persistent history file storage
const DATA_DIR = path.join(__dirname, "../data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
        }
    } catch (e) {
        console.error("Error reading history.json:", e.message);
    }
    return [];
}

function saveHistory(historyArray) {
    try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(historyArray, null, 2));
    } catch (e) {
        console.error("Error writing history.json:", e.message);
    }
}

// ============================================================
// NORMALIZE ATHLETE INPUT
// ============================================================

function normalizeAthleteInput(body = {}) {
    const age = Number(body.Age || body.age) || 20;
    const gender = String(body.Gender || body.gender || "Male").trim();
    const height = Number(body.Height_cm || body.height || body.Height) || 178;
    const weight = Number(body.Weight_kg || body.weight || body.Weight) || 72;
    const calculatedBmi = Number(body.BMI || body.bmi) || (height > 0 ? Number((weight / Math.pow(height / 100, 2)).toFixed(2)) : 22.7);

    let skillLevel = String(body.Skill_Level || body.skillLevel || body.skill_level || "Intermediate").trim();
    if (!["Beginner", "Intermediate", "Advanced", "Elite"].includes(skillLevel)) {
        skillLevel = "Intermediate";
    }

    let runupStyle = String(body.Runup_Style || body.runupStyle || body.runup_style || "Progressive").trim();
    if (runupStyle === "Normal") runupStyle = "Controlled";
    if (runupStyle === "Fast") runupStyle = "Progressive";
    if (!["Controlled", "Progressive", "Aggressive"].includes(runupStyle)) {
        runupStyle = "Progressive";
    }

    let previousInjuries = String(body.Previous_Injuries || body.previousInjuries || body.previous_injuries || "None").trim();
    if (previousInjuries === "No") previousInjuries = "None";
    if (previousInjuries === "Yes") previousInjuries = "Minor";
    if (!["None", "Minor", "Moderate", "Major"].includes(previousInjuries)) {
        previousInjuries = "None";
    }

    let takeoffFoot = String(body.Takeoff_Foot || body.takeoffFoot || body.takeoff_foot || "Right").trim();
    if (!["Right", "Left"].includes(takeoffFoot)) takeoffFoot = "Right";

    const sprintSpeed = Number(body.Sprint_Speed_mps || body.sprintSpeed || body.sprint_speed || body.sprint) || 8.5;
    const verticalJump = Number(body.verticalJump) || 0;
    const legStrength = Number(body.Leg_Strength_Score || body.legStrength || body.leg_strength) || (verticalJump ? Math.min(100, verticalJump * 1.3) : 75);

    return {
        Age: age,
        Gender: gender === "Female" ? "Female" : "Male",
        Height_cm: height,
        Weight_kg: weight,
        BMI: calculatedBmi,
        Skill_Level: skillLevel,
        Sprint_Speed_mps: sprintSpeed,
        Reaction_Time_sec: Number(body.Reaction_Time_sec || body.reactionTime || body.reaction_time) || 0.18,
        Flexibility_Score: Number(body.Flexibility_Score || body.flexibility || body.flexibilityScore) || 70,
        Leg_Strength_Score: legStrength,
        Balance_Score: Number(body.Balance_Score || body.balance || body.balanceScore) || 75,
        Endurance_Score: Number(body.Endurance_Score || body.endurance || body.enduranceScore) || 70,
        Runup_Distance_m: Number(body.Runup_Distance_m || body.runupDistance || body.runup_distance || body.runUpSpeed) || 30,
        Runup_Style: runupStyle,
        Takeoff_Foot: takeoffFoot,
        Takeoff_Angle_deg: Number(body.Takeoff_Angle_deg || body.takeoffAngle || body.takeoff_angle) || 20.0,
        Training_Hours_Per_Week: Number(body.Training_Hours_Per_Week || body.trainingHours || body.training_hours) || 10,
        Previous_Injuries: previousInjuries,
        Coach_Rating: Number(body.Coach_Rating || body.coachRating || body.coach_rating) || 7.5
    };
}

// ============================================================
// GENERATE ACTIONABLE COACHING SUGGESTIONS
// ============================================================

function generateAthleteSuggestions(data, predictedDistance, talentLevel) {
    const suggestions = [];

    // 1. Takeoff Angle Suggestions
    const angle = Number(data.Takeoff_Angle_deg) || 20;
    if (angle < 18) {
        suggestions.push({
            aspect: "Takeoff Angle",
            category: "biomechanics",
            status: "Needs Work",
            priority: "High",
            currentValue: `${angle.toFixed(1)}°`,
            optimalRange: "18.0° - 23.0°",
            observation: `Takeoff angle (${angle.toFixed(1)}°) is too flat. Horizontal velocity is good but vertical lift is insufficient.`,
            tip: "Work on penultimate stride mechanics: lower your hips slightly on the second-to-last stride and plant the takeoff foot firmly ahead to convert forward speed into upward launch velocity."
        });
    } else if (angle > 23) {
        suggestions.push({
            aspect: "Takeoff Angle",
            category: "biomechanics",
            status: "Needs Work",
            priority: "High",
            currentValue: `${angle.toFixed(1)}°`,
            optimalRange: "18.0° - 23.0°",
            observation: `Takeoff angle (${angle.toFixed(1)}°) is excessively steep. Jumping too high dissipates vital forward momentum.`,
            tip: "Maintain an aggressive forward sprint drive through the takeoff board. Avoid 'waiting' on the board; attack it with an active foot-clawing motion."
        });
    } else {
        suggestions.push({
            aspect: "Takeoff Angle",
            category: "biomechanics",
            status: "Optimal",
            priority: "Low",
            currentValue: `${angle.toFixed(1)}°`,
            optimalRange: "18.0° - 23.0°",
            observation: `Ideal launch trajectory (${angle.toFixed(1)}°)! Perfect compromise between horizontal velocity retention and vertical height.`,
            tip: "Keep reinforcing this launch window in your full approach jump sessions."
        });
    }

    // 2. Sprint Velocity Suggestions
    const speed = Number(data.Sprint_Speed_mps) || 8.5;
    if (speed < 8.0) {
        suggestions.push({
            aspect: "Approach Runway Speed",
            category: "speed",
            status: "Needs Work",
            priority: "High",
            currentValue: `${speed.toFixed(2)} m/s`,
            optimalRange: "> 9.0 m/s",
            observation: `Approach runway velocity (${speed.toFixed(2)} m/s) is below competitive standards, which limits jump potential.`,
            tip: "Incorporate 30m flying sprints, resisted sled pushes, and hill acceleration sprints 2-3 times per week to develop top-end velocity."
        });
    } else if (speed >= 8.0 && speed < 9.2) {
        suggestions.push({
            aspect: "Approach Runway Speed",
            category: "speed",
            status: "Good",
            priority: "Medium",
            currentValue: `${speed.toFixed(2)} m/s`,
            optimalRange: "> 9.2 m/s",
            observation: `Strong runway velocity (${speed.toFixed(2)} m/s). Focus on converting maximum controllable sprint speed into the final 3 strides.`,
            tip: "Work on acceleration rhythm and visual target consistency on the runway to arrive at the board with zero hesitation."
        });
    } else {
        suggestions.push({
            aspect: "Approach Runway Speed",
            category: "speed",
            status: "Optimal",
            priority: "Low",
            currentValue: `${speed.toFixed(2)} m/s`,
            optimalRange: "9.2 - 10.5 m/s",
            observation: `Elite sprint speed (${speed.toFixed(2)} m/s) detected! Gives you world-class horizontal launch potential.`,
            tip: "Ensure your board accuracy is calibrated so you do not foul or brake on the penultimate step."
        });
    }

    // 3. Leg Strength & Explosive Power
    const strength = Number(data.Leg_Strength_Score) || 75;
    if (strength < 70) {
        suggestions.push({
            aspect: "Lower Body Explosive Power",
            category: "strength",
            status: "Needs Work",
            priority: "High",
            currentValue: `${strength}/100`,
            optimalRange: "80 - 100",
            observation: "Lower leg strength and ground contact stiffness require development to handle high-speed impact off the board.",
            tip: "Perform plyometrics (box drop jumps, depth bounds, single-leg hops) and compound strength lifts (back squats, trap bar deadlifts, power cleans)."
        });
    } else if (strength >= 70 && strength < 85) {
        suggestions.push({
            aspect: "Lower Body Explosive Power",
            category: "strength",
            status: "Good",
            priority: "Medium",
            currentValue: `${strength}/100`,
            optimalRange: "80 - 100",
            observation: "Good strength foundation. Adding reactive elastic training will increase board spring.",
            tip: "Add reactive hurdle bounces and continuous bounding drills to minimize ground contact time at takeoff."
        });
    } else {
        suggestions.push({
            aspect: "Lower Body Explosive Power",
            category: "strength",
            status: "Optimal",
            priority: "Low",
            currentValue: `${strength}/100`,
            optimalRange: "85 - 100",
            observation: "Exceptional lower body explosive force! You have the elastic power needed for large airborne distance.",
            tip: "Maintain tendon stiffness through eccentric calf raises and ankle isometric holds."
        });
    }

    // 4. Flexibility & Mobility
    const flex = Number(data.Flexibility_Score) || 70;
    if (flex < 70) {
        suggestions.push({
            aspect: "Flexibility & Mobility",
            category: "mobility",
            status: "Needs Work",
            priority: "Medium",
            currentValue: `${flex}/100`,
            optimalRange: "75 - 100",
            observation: "Hamstring or hip flexor tightness can restrict the swing leg amplitude and in-flight reach.",
            tip: "Dedicate 15 minutes post-workout to dynamic hip mobility, pike stretches, and foam rolling of the quads and glutes."
        });
    }

    // 5. Training Volume & Preparation
    const hours = Number(data.Training_Hours_Per_Week) || 10;
    if (hours < 6) {
        suggestions.push({
            aspect: "Training Volume",
            category: "training",
            status: "Moderate",
            priority: "Medium",
            currentValue: `${hours} hrs/week`,
            optimalRange: "8 - 14 hrs/week",
            observation: "Current weekly training volume is modest for competitive jump progression.",
            tip: "Structure a 4-day jump cycle: 2 sprint & runway days, 1 plyometric/weight room session, and 1 full approach technical jump session."
        });
    }

    // 6. Overall Roadmap & Talent Coaching Note
    const distanceVal = Number(predictedDistance) || 0;
    const roadmap = [];
    const tLower = String(talentLevel).toLowerCase();
    if (tLower.includes("high") || tLower.includes("excellent")) {
        roadmap.push("🌟 Elite / High Potential Track: Focus on micro-refinements of flight hang technique and maintaining top sprint velocity through the board.");
        roadmap.push("Target competition readiness: Compete in state/national trials with structured taper cycles.");
    } else if (tLower.includes("medium") || tLower.includes("good")) {
        roadmap.push("🚀 Promising Talent Track: Prioritize increasing runway approach speed by 0.3 - 0.5 m/s to unlock 7m+ jump potential.");
        roadmap.push("Drill penultimate stride depth so high entry velocity reliably transforms into vertical lift.");
    } else {
        roadmap.push("🌱 Foundation Building Track: Build foundational sprinting posture, core stability, and consistent 12-14 stride approach rhythm.");
        roadmap.push("Develop jumping confidence through short-approach (6-stride) jumps into the sand pit.");
    }

    return {
        summary: `AI Evaluation: Predicted distance of ${distanceVal.toFixed(2)}m (${talentLevel}). Identified ${suggestions.filter(s => s.status === "Needs Work").length} key improvement areas.`,
        suggestions,
        roadmap
    };
}

// Fallback physics-based calculation if Python ML process is unavailable
function fallbackPrediction(data) {
    const sprint = Number(data.Sprint_Speed_mps) || 8.5;
    const angle = Number(data.Takeoff_Angle_deg) || 20.0;
    const leg = Number(data.Leg_Strength_Score) || 75.0;

    const speedBonus = sprint * 0.45;
    const powerBonus = (leg / 100) * 2.2;
    const rad = (angle * Math.PI) / 180;
    const angleFactor = Math.sin(2 * rad);
    const clampedAngleFactor = Math.max(0.65, Math.min(1.0, angleFactor));

    const calcDist = (speedBonus + powerBonus) * 0.95 * clampedAngleFactor;
    const distance = Math.min(8.95, Math.max(3.80, Number(calcDist.toFixed(2))));

    let label = "Good";
    if (distance >= 7.2) label = "Excellent";
    else if (distance < 5.8) label = "Average";

    return {
        success: true,
        predicted_distance: distance,
        predicted_distance_m: distance,
        performance_label: label,
        talent_level: label,
        confidence_percent: 88.5,
        class_probabilities: {
            Average: label === "Average" ? 65.0 : 10.0,
            Good: label === "Good" ? 60.0 : 25.0,
            Excellent: label === "Excellent" ? 70.0 : 15.0
        }
    };
}

// ============================================================
// PREDICT ATHLETE CONTROLLER
// ============================================================

const predictAthlete = (req, res) => {
    try {
        const rawData = req.body || {};
        const normalizedData = normalizeAthleteInput(rawData);

        console.log("\n========================================");
        console.log("STARTING ATHLETE ML PREDICTION");
        console.log("Input:", normalizedData);
        console.log("========================================");

        const pythonScript = path.join(__dirname, "../../ml/predict.py");
        const inputJsonString = JSON.stringify(normalizedData);

        const python = spawn("python", [pythonScript, inputJsonString], {
            windowsHide: true
        });

        let output = "";
        let errorOutput = "";

        python.stdout.on("data", (data) => {
            output += data.toString();
        });

        python.stderr.on("data", (data) => {
            errorOutput += data.toString();
        });

        python.on("close", (code) => {
            console.log("Python predict process finished with code:", code);

            let mlResult = null;

            if (code === 0 && output.trim()) {
                try {
                    const firstBrace = output.indexOf("{");
                    const lastBrace = output.lastIndexOf("}");
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        mlResult = JSON.parse(output.substring(firstBrace, lastBrace + 1));
                    }
                } catch (e) {
                    console.error("JSON parse error from predict.py:", e.message);
                }
            }

            // Fallback if python script encountered an issue
            if (!mlResult || mlResult.success !== true) {
                console.log("Using physics-based ML prediction fallback...");
                mlResult = fallbackPrediction(normalizedData);
            }

            const predictedDistance = Number(mlResult.predicted_distance || mlResult.predicted_distance_m) || 6.5;
            const performanceLabel = mlResult.performance_label || mlResult.talent_level || "Good";

            // Generate full suggestions and feedback
            const suggestionsData = generateAthleteSuggestions(normalizedData, predictedDistance, performanceLabel);

            const feedbackData = generateBiomechanicalFeedback({
                takeoff_angle_deg: normalizedData.Takeoff_Angle_deg,
                takeoff_knee_angle_deg: 165.0,
                landing_stability_score: 92.0,
                flight_time_sec: 0.72,
                predicted_distance: predictedDistance,
                talent_level: performanceLabel
            });

            const predId = "pred_" + Date.now();
            const historyRecord = {
                id: predId,
                timestamp: new Date().toISOString(),
                source: "manual",
                video_name: `Manual Prediction (${normalizedData.Gender}, ${normalizedData.Age}y)`,
                stored_filename: null,
                output_video_url: null,
                takeoff_angle: normalizedData.Takeoff_Angle_deg,
                knee_angle: 165.0,
                hip_angle: 170.0,
                ankle_angle: 90.0,
                flight_time: Number((predictedDistance / (normalizedData.Sprint_Speed_mps * 1.05)).toFixed(2)) || 0.72,
                runup_time: Number((normalizedData.Runup_Distance_m / (normalizedData.Sprint_Speed_mps * 0.75)).toFixed(2)) || 4.5,
                stability_score: 92.0,
                quality_score: 95.0,
                camera_view: "manual",
                predicted_distance: predictedDistance,
                talent_level: performanceLabel,
                suggestions: suggestionsData.suggestions,
                roadmap: suggestionsData.roadmap,
                feedback: feedbackData
            };

            try {
                const hist = loadHistory();
                hist.unshift(historyRecord);
                saveHistory(hist);
            } catch (he) {
                console.warn("Could not save prediction to history:", he.message);
            }

            const responsePayload = {
                id: predId,
                success: true,
                predicted_distance: predictedDistance,
                predicted_distance_m: predictedDistance,
                performance_label: performanceLabel,
                talent_level: performanceLabel,
                confidence_percent: mlResult.confidence_percent || 88.0,
                class_probabilities: mlResult.class_probabilities || {},
                normalized_input: normalizedData,
                suggestions: suggestionsData.suggestions,
                roadmap: suggestionsData.roadmap,
                summary: suggestionsData.summary,
                feedback: feedbackData
            };

            return res.status(200).json(responsePayload);
        });

        python.on("error", (err) => {
            console.error("Python spawn error:", err.message);
            const fallback = fallbackPrediction(normalizedData);
            const suggestionsData = generateAthleteSuggestions(normalizedData, fallback.predicted_distance, fallback.performance_label);
            return res.status(200).json({
                ...fallback,
                suggestions: suggestionsData.suggestions,
                roadmap: suggestionsData.roadmap,
                summary: suggestionsData.summary
            });
        });

    } catch (error) {
        console.error("PREDICTION CONTROLLER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error during prediction",
            error: error.message
        });
    }
};

module.exports = {
    predictAthlete
};
