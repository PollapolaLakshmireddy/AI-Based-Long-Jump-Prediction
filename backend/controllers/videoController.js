const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const {
    submissions,
    athleteProfiles,
    users,
    tests,
    generateBiomechanicalFeedback
} = require("../data/memoryStore");

// Persistent file storage backup for legacy history compatibility
const DATA_DIR = path.join(__dirname, "../data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = fs.readFileSync(HISTORY_FILE, "utf8");
            return JSON.parse(data);
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
// HELPER: RUN PREDICTION SCRIPT (Existing ml/predict.py contract)
// ============================================================

function runMLPrediction(predictionInput) {
    return new Promise((resolve) => {
        try {
            const pythonScript = path.join(__dirname, "../../ml/predict.py");
            const pythonProcess = spawn("python", [pythonScript, JSON.stringify(predictionInput)], {
                windowsHide: true
            });

            let out = "";
            let err = "";

            pythonProcess.stdout.on("data", (d) => { out += d.toString(); });
            pythonProcess.stderr.on("data", (d) => { err += d.toString(); });

            pythonProcess.on("close", (code) => {
                if (code !== 0) {
                    console.log("Prediction stderr:", err);
                    return resolve(null);
                }
                try {
                    const firstBrace = out.indexOf("{");
                    const lastBrace = out.lastIndexOf("}");
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        const parsed = JSON.parse(out.substring(firstBrace, lastBrace + 1));
                        return resolve(parsed);
                    }
                } catch (e) {
                    console.log("Prediction parse error:", e.message);
                }
                return resolve(null);
            });

            pythonProcess.on("error", () => resolve(null));
        } catch (e) {
            resolve(null);
        }
    });
}

// ============================================================
// ANALYZE VIDEO CONTROLLER
// Preserves exact existing video analysis logic and interfaces
// ============================================================

const analyzeVideo = async (req, res) => {
    try {
        if (req.setTimeout) req.setTimeout(10 * 60 * 1000);
        if (res.setTimeout) res.setTimeout(10 * 60 * 1000);

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No video uploaded"
            });
        }

        const videoPath = req.file.path;
        const pythonScript = path.join(__dirname, "../../ml/analyze_video.py");

        // Identify submitting athlete and test
        const athleteId = req.user?.id || req.body.athleteId || "ath_arjun";
        const athleteUser = users.get(athleteId);
        const athleteProfile = athleteProfiles.get(athleteId) || {};
        const athleteName = athleteUser?.name || athleteProfile.name || req.body.athleteName || "Registered Athlete";
        const testId = req.body.testId || "test_longjump_standard";
        const testObj = tests.get(testId);
        const testTitle = testObj?.title || "Standard Long Jump Biomechanics Test";

        console.log("\n========================================");
        console.log("STARTING VIDEO ANALYSIS PIPELINE");
        console.log("Athlete:", athleteName, `(${athleteId})`);
        console.log("Test:", testTitle);
        console.log("Video:", videoPath);
        console.log("========================================");

        const submissionId = "sub_" + Date.now();

        // Initial submission record (status: processing)
        submissions.set(submissionId, {
            id: submissionId,
            athleteId,
            athleteName,
            testId,
            testTitle,
            videoOriginalName: req.file.originalname,
            videoStoredName: req.file.filename,
            videoUrl: null,
            status: "processing",
            timestamp: new Date().toISOString(),
            result: null
        });

        const pythonProcess = spawn("python", [pythonScript, videoPath]);

        let rawOutput = "";

        pythonProcess.stdout.on("data", (data) => {
            rawOutput += data.toString();
        });

        pythonProcess.stderr.on("data", (data) => {
            console.log("PYTHON STDERR:", data.toString().trim());
        });

        pythonProcess.on("close", async (code) => {
            console.log("========================================");
            console.log("PYTHON PROCESS FINISHED WITH CODE:", code);
            console.log("========================================");

            if (code !== 0) {
                // Update submission to failed
                const failedSub = submissions.get(submissionId);
                if (failedSub) {
                    failedSub.status = "failed";
                    failedSub.error = "Video analysis processing failed.";
                    submissions.set(submissionId, failedSub);
                }

                return res.status(500).json({
                    success: false,
                    message: "Python video processing failed",
                    rawOutput: rawOutput
                });
            }

            try {
                const firstBrace = rawOutput.indexOf("{");
                const lastBrace = rawOutput.lastIndexOf("}");

                if (firstBrace === -1 || lastBrace === -1) {
                    throw new Error("No valid JSON found in Python output");
                }

                const jsonString = rawOutput.substring(firstBrace, lastBrace + 1);
                const result = JSON.parse(jsonString);

                console.log("PYTHON JSON PARSED SUCCESSFULLY");

                // LONG JUMP VALIDATION CHECK
                if (result.success === false || result.is_long_jump === false) {
                    console.log("REJECTING VIDEO: Non-long-jump activity detected.");

                    const rejectedSub = submissions.get(submissionId);
                    if (rejectedSub) {
                        rejectedSub.status = "failed";
                        rejectedSub.error = result.error || "No long jump performance detected.";
                        submissions.set(submissionId, rejectedSub);
                    }

                    return res.status(400).json({
                        success: false,
                        is_long_jump: false,
                        message: result.error || "No long jump performance detected in this video. Please upload a valid long jump video.",
                        error: result.error || "Invalid long jump video"
                    });
                }

                // Format video path for frontend
                const outputVideoPath = typeof result.output_video === "string" ? result.output_video : "";
                const outputVideoFilename = outputVideoPath ? path.basename(outputVideoPath) : null;
                const output_video_url = outputVideoFilename ? `/ml-video/outputs/${outputVideoFilename}` : null;

                // Run ML Prediction using athlete biometrics + detected takeoff angle
                const detectedTakeoffAngle = result.performance?.takeoff_angle_deg || 20.0;
                let predictionResult = null;

                const predictionInput = {
                    Age: Number(req.body.age) || athleteProfile.age || 20,
                    Gender: req.body.gender || athleteProfile.gender || "Male",
                    Height_cm: Number(req.body.height) || athleteProfile.height || 178,
                    Weight_kg: Number(req.body.weight) || athleteProfile.weight || 72,
                    BMI: athleteProfile.bmi || 22.7,
                    Skill_Level: req.body.skillLevel || athleteProfile.skillLevel || "Intermediate",
                    Sprint_Speed_mps: Number(req.body.sprintSpeed) || athleteProfile.sprintSpeed || 9.2,
                    Reaction_Time_sec: Number(req.body.reactionTime) || 0.16,
                    Flexibility_Score: Number(req.body.flexibility) || 75,
                    Leg_Strength_Score: Number(req.body.legStrength) || 80,
                    Balance_Score: Number(req.body.balance) || 78,
                    Endurance_Score: Number(req.body.endurance) || 72,
                    Runup_Distance_m: Number(req.body.runupDistance) || 35,
                    Runup_Style: req.body.runupStyle || "Smooth Acceleration",
                    Takeoff_Foot: req.body.takeoffFoot || "Right",
                    Takeoff_Angle_deg: Number(detectedTakeoffAngle),
                    Training_Hours_Per_Week: Number(req.body.trainingHours) || athleteProfile.trainingHours || 12,
                    Previous_Injuries: req.body.previousInjuries || "None",
                    Coach_Rating: Number(req.body.coachRating) || athleteProfile.coachRating || 8
                };

                predictionResult = await runMLPrediction(predictionInput);

                // Generate dynamic coaching recommendations based on actual biomechanical metrics
                const feedbackData = generateBiomechanicalFeedback({
                    takeoff_angle_deg: detectedTakeoffAngle,
                    takeoff_knee_angle_deg: result.performance?.takeoff_knee_angle_deg,
                    landing_stability_score: result.performance?.landing_stability_score,
                    flight_time_sec: result.performance?.flight_time_sec,
                    predicted_distance: predictionResult?.predicted_distance,
                    talent_level: predictionResult?.performance_label || predictionResult?.talent_level || "High Potential"
                });

                // Completed result package
                const predictedDist = predictionResult ? (predictionResult.predicted_distance || predictionResult.predicted_distance_m) : null;
                const talentLabel = predictionResult ? (predictionResult.performance_label || predictionResult.talent_level || "High Potential") : "High Potential";

                const fullResult = {
                    ...result,
                    output_video_url,
                    prediction: predictionResult ? {
                        predicted_distance: predictedDist,
                        predicted_distance_m: predictedDist,
                        talent_level: talentLabel,
                        performance_label: talentLabel,
                        confidence_percent: predictionResult.confidence_percent || 90.0,
                        suggestions: predictionResult.suggestions || []
                    } : null,
                    suggestions: predictionResult?.suggestions || [],
                    feedback: feedbackData
                };

                // Store in In-Memory Submissions Map
                submissions.set(submissionId, {
                    id: submissionId,
                    athleteId,
                    athleteName,
                    testId,
                    testTitle,
                    videoOriginalName: req.file.originalname,
                    videoStoredName: req.file.filename,
                    videoUrl: output_video_url,
                    status: "completed",
                    timestamp: new Date().toISOString(),
                    result: fullResult
                });

                // Store in persistent history for backward compatibility & cross-dashboard access
                const historyRecord = {
                    id: submissionId,
                    timestamp: new Date().toISOString(),
                    athleteId,
                    athleteName,
                    source: "video",
                    video_name: req.file.originalname,
                    stored_filename: req.file.filename,
                    output_video_url: output_video_url,
                    takeoff_angle: result.performance ? result.performance.takeoff_angle_deg : null,
                    knee_angle: result.performance ? result.performance.takeoff_knee_angle_deg : null,
                    hip_angle: result.performance ? result.performance.takeoff_hip_angle_deg : null,
                    ankle_angle: result.performance ? result.performance.takeoff_ankle_angle_deg : null,
                    flight_time: result.performance ? result.performance.flight_time_sec : null,
                    runup_time: result.performance ? result.performance.runup_time_sec : null,
                    stability_score: result.performance ? result.performance.landing_stability_score : null,
                    quality_score: result.quality ? result.quality.analysis_quality_percent : null,
                    camera_view: result.camera_view || "front",
                    takeoff_time: result.jump_phase ? result.jump_phase.takeoff_time_sec : null,
                    landing_time: result.jump_phase ? result.jump_phase.landing_time_sec : null,
                    resolution: result.video ? `${result.video.width} × ${result.video.height}` : null,
                    fps: result.video ? result.video.fps : null,
                    duration: result.video ? result.video.duration_sec : null,
                    predicted_distance: predictedDist,
                    talent_level: talentLabel,
                    suggestions: predictionResult?.suggestions || [],
                    feedback: feedbackData
                };

                const history = loadHistory();
                history.unshift(historyRecord);
                saveHistory(history);

                console.log("[Video Analysis] Analysis completed and saved to in-memory store. ID:", submissionId);

                // Build response payload exactly matching the expected frontend structure
                const responsePayload = {
                    success: true,
                    is_long_jump: true,
                    submission_id: submissionId,
                    ...result,
                    output_video_url,
                    prediction: fullResult.prediction,
                    suggestions: predictionResult?.suggestions || [],
                    feedback: feedbackData,
                    original_file: {
                        filename: req.file.filename,
                        originalName: req.file.originalname,
                        size: req.file.size,
                        mimeType: req.file.mimetype
                    }
                };

                return res.status(200).json(responsePayload);

            } catch (error) {
                console.error("INVALID PYTHON JSON:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Invalid video analysis response format",
                    error: error.message
                });
            }
        });

    } catch (error) {
        console.error("VIDEO CONTROLLER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
};

// ============================================================
// HISTORY CONTROLLER FUNCTIONS
// ============================================================

const getHistory = (req, res) => {
    // Load persistent history
    let history = loadHistory();

    // Map existing IDs for quick deduplication
    const historyMap = new Map();
    history.forEach(item => {
        if (item && item.id) historyMap.set(item.id, item);
    });

    // Merge in any in-memory submissions that haven't been persisted yet
    Array.from(submissions.values()).forEach(s => {
        if (s && s.id && !historyMap.has(s.id)) {
            const predDist = s.result?.prediction?.predicted_distance || s.result?.prediction?.predicted_distance_m;
            const tLevel = s.result?.prediction?.talent_level || s.result?.prediction?.performance_label || "Good";
            const newRecord = {
                id: s.id,
                timestamp: s.timestamp || new Date().toISOString(),
                athleteId: s.athleteId,
                athleteName: s.athleteName,
                video_name: s.videoOriginalName || s.testTitle || "Video Jump Analysis",
                stored_filename: s.videoStoredName,
                output_video_url: s.videoUrl,
                takeoff_angle: s.result?.performance?.takeoff_angle_deg,
                knee_angle: s.result?.performance?.takeoff_knee_angle_deg,
                hip_angle: s.result?.performance?.takeoff_hip_angle_deg,
                flight_time: s.result?.performance?.flight_time_sec,
                stability_score: s.result?.performance?.landing_stability_score,
                predicted_distance: predDist,
                talent_level: tLevel,
                suggestions: s.result?.suggestions || s.result?.prediction?.suggestions || [],
                feedback: s.result?.feedback
            };
            historyMap.set(s.id, newRecord);
        }
    });

    let combined = Array.from(historyMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // If authenticated athlete, filter to their records if athleteId is recorded
    if (req.user && req.user.role === "athlete") {
        const filtered = combined.filter(item => !item.athleteId || item.athleteId === req.user.id);
        if (filtered.length > 0) {
            combined = filtered;
        }
    }

    return res.status(200).json({
        success: true,
        count: combined.length,
        data: combined
    });
};

const deleteHistoryItem = (req, res) => {
    const id = req.params.id;
    submissions.delete(id);

    let history = loadHistory();
    history = history.filter(item => item.id !== id);
    saveHistory(history);

    return res.status(200).json({
        success: true,
        message: "Analysis record deleted",
        data: history
    });
};

const clearHistory = (req, res) => {
    saveHistory([]);
    return res.status(200).json({
        success: true,
        message: "History cleared successfully"
    });
};

module.exports = {
    analyzeVideo,
    getHistory,
    deleteHistoryItem,
    clearHistory
};