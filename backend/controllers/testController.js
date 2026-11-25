const fs = require("fs");
const path = require("path");
const { tests, instructions, submissions } = require("../data/memoryStore");

const HISTORY_FILE = path.join(__dirname, "../data/history.json");

function loadHistoryRecords() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const raw = fs.readFileSync(HISTORY_FILE, "utf8");
            return JSON.parse(raw);
        }
    } catch (e) {
        console.warn("Could not read history.json in testController:", e.message);
    }
    return [];
}

// ============================================================
// GET ACTIVE TESTS (For Athletes)
// ============================================================

const getActiveTests = (req, res) => {
    const activeTests = Array.from(tests.values()).filter(t => t.status === "active");
    return res.status(200).json({
        success: true,
        count: activeTests.length,
        data: activeTests
    });
};

// ============================================================
// GET ALL ACTIVE INSTRUCTIONS (For Athletes)
// ============================================================

const getInstructions = (req, res) => {
    const instList = Array.from(instructions.values());
    return res.status(200).json({
        success: true,
        count: instList.length,
        data: instList
    });
};

// ============================================================
// GET ATHLETE'S SUBMISSION HISTORY
// ============================================================

const getMySubmissions = (req, res) => {
    const athleteId = req.user?.id;
    const athleteName = req.user?.name;

    // Map by ID to deduplicate
    const subMap = new Map();

    // 1. In-memory submissions
    Array.from(submissions.values()).forEach(s => {
        if (s && s.id) {
            subMap.set(s.id, s);
        }
    });

    // 2. Persistent history.json records converted to submission format
    const historyList = loadHistoryRecords();
    historyList.forEach(h => {
        if (h && h.id && !subMap.has(h.id)) {
            subMap.set(h.id, {
                id: h.id,
                athleteId: h.athleteId || athleteId || "ath_arjun",
                athleteName: h.athleteName || athleteName || "Athlete",
                testId: "test_longjump_standard",
                testTitle: h.video_name || "Long Jump Video Assessment",
                videoOriginalName: h.video_name,
                videoStoredName: h.stored_filename,
                videoUrl: h.output_video_url,
                status: "completed",
                timestamp: h.timestamp || new Date().toISOString(),
                result: {
                    output_video_url: h.output_video_url,
                    performance: {
                        takeoff_angle_deg: h.takeoff_angle,
                        takeoff_knee_angle_deg: h.knee_angle,
                        takeoff_hip_angle_deg: h.hip_angle,
                        takeoff_ankle_angle_deg: h.ankle_angle,
                        flight_time_sec: h.flight_time,
                        runup_time_sec: h.runup_time,
                        landing_stability_score: h.stability_score
                    },
                    jump_phase: {
                        takeoff_time_sec: h.takeoff_time,
                        landing_time_sec: h.landing_time
                    },
                    prediction: {
                        predicted_distance: h.predicted_distance,
                        talent_level: h.talent_level
                    },
                    suggestions: h.suggestions || [],
                    feedback: h.feedback
                }
            });
        }
    });

    let allItems = Array.from(subMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // If athlete is authenticated, filter to their records if any match, otherwise return all
    if (athleteId) {
        const filtered = allItems.filter(s => s.athleteId === athleteId || s.athleteName === athleteName);
        if (filtered.length > 0) {
            allItems = filtered;
        }
    }

    return res.status(200).json({
        success: true,
        count: allItems.length,
        data: allItems
    });
};

// ============================================================
// GET SINGLE SUBMISSION DETAILS & AI RESULTS
// ============================================================

const getSubmissionById = (req, res) => {
    const { id } = req.params;
    const submission = submissions.get(id);

    if (!submission) {
        return res.status(404).json({
            success: false,
            message: "Submission not found."
        });
    }

    // Role check: athletes can only view their own submissions
    if (req.user.role === "athlete" && submission.athleteId !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: "Access denied. You can only view your own assessment submissions."
        });
    }

    return res.status(200).json({
        success: true,
        data: submission
    });
};

module.exports = {
    getActiveTests,
    getInstructions,
    getMySubmissions,
    getSubmissionById
};
