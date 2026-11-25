const path = require("path");
const fs = require("fs");
const { hashPassword } = require("../utils/authUtils");

// ============================================================
// IN-MEMORY STORAGE USING JAVASCRIPT MAPS
// Clear on server restart. No database dependency.
// ============================================================

const users = new Map();
const athleteProfiles = new Map();
const tests = new Map();
const instructions = new Map();
const submissions = new Map();

// ============================================================
// SEED INITIAL DATA
// ============================================================

function seedInitialData() {
    console.log("[MemoryStore] Initializing in-memory data store with sample records...");

    // 1. Admin Account
    const adminId = "user_admin";
    users.set(adminId, {
        id: adminId,
        username: "admin",
        email: "admin@longjumpai.com",
        passwordHash: hashPassword("Admin@123"),
        role: "admin",
        name: "Head Coach Admin",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z"
    });

    // 2. Sample Athletes
    const sampleAthletes = [
        {
            id: "ath_arjun",
            username: "arjun",
            email: "arjun@example.com",
            password: "Arjun@123",
            name: "Arjun Reddy",
            age: 21,
            gender: "Male",
            height: 182,
            weight: 74,
            skillLevel: "Advanced",
            sprintSpeed: 9.8,
            verticalJump: 65,
            standingJump: 2.65,
            takeoffSpeed: 8.7,
            takeoffAngle: 20.4,
            trainingHours: 14,
            coachRating: 9,
            status: "active",
            createdAt: "2026-02-10T10:00:00.000Z"
        },
        {
            id: "ath_rahul",
            username: "rahul",
            email: "rahul@example.com",
            password: "Rahul@123",
            name: "Rahul Kumar",
            age: 19,
            gender: "Male",
            height: 176,
            weight: 68,
            skillLevel: "Intermediate",
            sprintSpeed: 8.9,
            verticalJump: 58,
            standingJump: 2.45,
            takeoffSpeed: 7.9,
            takeoffAngle: 18.5,
            trainingHours: 10,
            coachRating: 8,
            status: "active",
            createdAt: "2026-02-15T11:30:00.000Z"
        },
        {
            id: "ath_neha",
            username: "neha",
            email: "neha@example.com",
            password: "Neha@123",
            name: "Neha Sharma",
            age: 20,
            gender: "Female",
            height: 168,
            weight: 58,
            skillLevel: "Intermediate",
            sprintSpeed: 8.7,
            verticalJump: 54,
            standingJump: 2.38,
            takeoffSpeed: 7.8,
            takeoffAngle: 21.2,
            trainingHours: 12,
            coachRating: 8,
            status: "active",
            createdAt: "2026-02-20T09:15:00.000Z"
        },
        {
            id: "ath_vikram",
            username: "vikram",
            email: "vikram@example.com",
            password: "Vikram@123",
            name: "Vikram Singh",
            age: 20,
            gender: "Male",
            height: 180,
            weight: 72,
            skillLevel: "Advanced",
            sprintSpeed: 9.4,
            verticalJump: 62,
            standingJump: 2.58,
            takeoffSpeed: 8.3,
            takeoffAngle: 19.8,
            trainingHours: 15,
            coachRating: 9,
            status: "active",
            createdAt: "2026-03-01T14:20:00.000Z"
        }
    ];

    sampleAthletes.forEach(ath => {
        users.set(ath.id, {
            id: ath.id,
            username: ath.username,
            email: ath.email,
            passwordHash: hashPassword(ath.password),
            role: "athlete",
            name: ath.name,
            status: ath.status,
            createdAt: ath.createdAt
        });

        const bmi = ath.height && ath.weight ? (ath.weight / Math.pow(ath.height / 100, 2)).toFixed(2) : null;

        athleteProfiles.set(ath.id, {
            userId: ath.id,
            name: ath.name,
            age: ath.age,
            gender: ath.gender,
            height: ath.height,
            weight: ath.weight,
            bmi: bmi ? Number(bmi) : null,
            skillLevel: ath.skillLevel,
            sprintSpeed: ath.sprintSpeed,
            verticalJump: ath.verticalJump,
            standingJump: ath.standingJump,
            takeoffSpeed: ath.takeoffSpeed,
            takeoffAngle: ath.takeoffAngle,
            trainingHours: ath.trainingHours,
            coachRating: ath.coachRating,
            createdAt: ath.createdAt
        });
    });

    // 3. Tests Configuration
    const initialTests = [
        {
            id: "test_longjump_standard",
            title: "Standard Long Jump Biomechanics Test",
            category: "Video Pose Analysis",
            description: "High-precision AI computer vision assessment capturing approach runup, takeoff angle, knee/hip kinematics, and landing stability.",
            durationMinutes: 15,
            criteria: "Perpendicular lateral camera view (90°), full runway visible, takeoff board and sandpit in frame.",
            status: "active",
            createdAt: "2026-01-05T08:00:00.000Z"
        },
        {
            id: "test_takeoff_analysis",
            title: "Takeoff Velocity & Angle Evaluation",
            category: "Biomechanical Kinematics",
            description: "Focused evaluation of penultimate stride lowering, takeoff impulse angle, and vertical elevation dynamics.",
            durationMinutes: 10,
            criteria: "Close-up 60fps video centered on the 5-meter zone before and after the takeoff board.",
            status: "active",
            createdAt: "2026-01-10T09:00:00.000Z"
        },
        {
            id: "test_talent_prediction",
            title: "Jump Distance & Talent Potential Prediction",
            category: "Machine Learning Evaluation",
            description: "Combined ML assessment predicting competitive jump distance and national talent tier using physical parameters and video metrics.",
            durationMinutes: 20,
            criteria: "Verified athlete biometric profile combined with certified jump test video.",
            status: "active",
            createdAt: "2026-01-15T11:00:00.000Z"
        }
    ];

    initialTests.forEach(t => tests.set(t.id, t));

    // 4. Test Instructions
    const initialInstructions = [
        {
            id: "inst_1",
            testId: "test_longjump_standard",
            title: "Guidelines for Standard Long Jump Video Recording",
            summary: "Follow these standardized camera setup and athlete preparation guidelines to ensure maximum AI pose estimation accuracy.",
            steps: [
                "Position the camera directly perpendicular (90 degrees) to the runway at the takeoff board position.",
                "Mount the camera on a tripod at hip height (approximately 1.0 to 1.2 meters off the ground).",
                "Ensure the camera view captures at least 5 meters of approach runup, the takeoff board, the entire flight trajectory, and the landing pit.",
                "Record at 30 FPS minimum (60 FPS or 120 FPS high-speed mode strongly recommended for optimal frame capture).",
                "Wear form-fitting athletic attire with high contrast against the runway background for best skeletal landmark recognition.",
                "Ensure uniform daylight or well-diffused indoor track lighting without heavy backlighting or lens flares.",
                "Perform the jump cleanly without other individuals crossing through the camera frame."
            ],
            requirements: [
                "Supported video formats: MP4, MOV, WEBM, AVI",
                "Maximum file size: 100 MB",
                "Resolution: 720p or 1080p recommended",
                "Clear visibility of both legs, hips, and arms throughout the jump"
            ],
            tips: [
                "Avoid holding the camera by hand — use a stable tripod or solid surface.",
                "Do not zoom in or move the camera during the athlete's jump.",
                "Trim excess video footage before the runup and after landing to speed up AI processing."
            ],
            lastUpdated: "2026-03-01T12:00:00.000Z"
        },
        {
            id: "inst_2",
            testId: "test_takeoff_analysis",
            title: "Guidelines for Takeoff Angle & Velocity Evaluation",
            summary: "Precise instructions for recording the takeoff board zone for detailed joint angle measurements.",
            steps: [
                "Set camera 4 to 6 meters away from the runway, squarely aligned with the 20cm takeoff board.",
                "Keep the camera stationary with landscape orientation.",
                "Ensure the foot strike on the board is crisp and unobstructed.",
                "Review recorded footage to confirm the takeoff leg extension is clearly visible."
            ],
            requirements: [
                "Camera angle: 90° strictly lateral view",
                "High frame rate recommended (60 FPS+)"
            ],
            tips: [
                "Clean any dirt or debris from the takeoff board so the line is distinct.",
                "Mark the board boundary clearly with chalk if testing on an unpainted surface."
            ],
            lastUpdated: "2026-03-02T10:00:00.000Z"
        }
    ];

    initialInstructions.forEach(inst => instructions.set(inst.id, inst));

    // 5. Sample Submissions with Real AI Analysis Data
    const sampleSubmissions = [
        {
            id: "sub_101",
            athleteId: "ath_arjun",
            athleteName: "Arjun Reddy",
            testId: "test_longjump_standard",
            testTitle: "Standard Long Jump Biomechanics Test",
            videoOriginalName: "arjun_competition_jump1.mp4",
            videoStoredName: "1793079005375-sample_jump1.mp4",
            videoUrl: "/ml-video/outputs/sample_jump1_analyzed.mp4",
            status: "completed",
            timestamp: "2026-03-10T14:32:00.000Z",
            result: {
                performance: {
                    takeoff_angle_deg: 20.4,
                    takeoff_knee_angle_deg: 168.5,
                    takeoff_hip_angle_deg: 173.2,
                    takeoff_ankle_angle_deg: 94.2,
                    flight_time_sec: 0.82,
                    runup_time_sec: 5.12,
                    landing_stability_score: 95.5
                },
                detection: {
                    detected_frames: 180,
                    detection_ratio_percent: 98.2,
                    pose_confidence_percent: 92.4
                },
                quality: {
                    analysis_quality_percent: 94.0
                },
                jump_phase: {
                    takeoff_time_sec: 5.12,
                    peak_time_sec: 5.53,
                    landing_time_sec: 5.94,
                    landing_detected: true
                },
                prediction: {
                    predicted_distance: 7.42,
                    talent_level: "High Potential",
                    confidence_percent: 91.8
                },
                feedback: generateBiomechanicalFeedback({
                    takeoff_angle_deg: 20.4,
                    takeoff_knee_angle_deg: 168.5,
                    landing_stability_score: 95.5,
                    flight_time_sec: 0.82,
                    predicted_distance: 7.42,
                    talent_level: "High Potential"
                })
            }
        },
        {
            id: "sub_102",
            athleteId: "ath_arjun",
            athleteName: "Arjun Reddy",
            testId: "test_longjump_standard",
            videoOriginalName: "arjun_practice_jump2.mp4",
            videoStoredName: "1793079005376-sample_jump2.mp4",
            videoUrl: "/ml-video/outputs/sample_jump2_analyzed.mp4",
            status: "completed",
            timestamp: "2026-03-24T16:15:00.000Z",
            result: {
                performance: {
                    takeoff_angle_deg: 21.8,
                    takeoff_knee_angle_deg: 171.0,
                    takeoff_hip_angle_deg: 175.4,
                    takeoff_ankle_angle_deg: 96.0,
                    flight_time_sec: 0.85,
                    runup_time_sec: 5.08,
                    landing_stability_score: 97.2
                },
                detection: {
                    detected_frames: 195,
                    detection_ratio_percent: 99.0,
                    pose_confidence_percent: 94.1
                },
                quality: {
                    analysis_quality_percent: 96.5
                },
                jump_phase: {
                    takeoff_time_sec: 5.08,
                    peak_time_sec: 5.50,
                    landing_time_sec: 5.93,
                    landing_detected: true
                },
                prediction: {
                    predicted_distance: 7.58,
                    talent_level: "High Potential",
                    confidence_percent: 93.4
                },
                feedback: generateBiomechanicalFeedback({
                    takeoff_angle_deg: 21.8,
                    takeoff_knee_angle_deg: 171.0,
                    landing_stability_score: 97.2,
                    flight_time_sec: 0.85,
                    predicted_distance: 7.58,
                    talent_level: "High Potential"
                })
            }
        },
        {
            id: "sub_103",
            athleteId: "ath_rahul",
            athleteName: "Rahul Kumar",
            testId: "test_longjump_standard",
            testTitle: "Standard Long Jump Biomechanics Test",
            videoOriginalName: "rahul_trial1.mp4",
            videoStoredName: "1792737488357-rahul_trial1.mp4",
            videoUrl: "/ml-video/outputs/rahul_trial1_analyzed.mp4",
            status: "completed",
            timestamp: "2026-03-12T10:45:00.000Z",
            result: {
                performance: {
                    takeoff_angle_deg: 17.2,
                    takeoff_knee_angle_deg: 158.4,
                    takeoff_hip_angle_deg: 165.1,
                    takeoff_ankle_angle_deg: 88.5,
                    flight_time_sec: 0.74,
                    runup_time_sec: 5.35,
                    landing_stability_score: 88.0
                },
                detection: {
                    detected_frames: 165,
                    detection_ratio_percent: 94.0,
                    pose_confidence_percent: 88.5
                },
                quality: {
                    analysis_quality_percent: 89.2
                },
                jump_phase: {
                    takeoff_time_sec: 5.35,
                    peak_time_sec: 5.72,
                    landing_time_sec: 6.09,
                    landing_detected: true
                },
                prediction: {
                    predicted_distance: 6.78,
                    talent_level: "Medium Potential",
                    confidence_percent: 86.5
                },
                feedback: generateBiomechanicalFeedback({
                    takeoff_angle_deg: 17.2,
                    takeoff_knee_angle_deg: 158.4,
                    landing_stability_score: 88.0,
                    flight_time_sec: 0.74,
                    predicted_distance: 6.78,
                    talent_level: "Medium Potential"
                })
            }
        },
        {
            id: "sub_104",
            athleteId: "ath_neha",
            athleteName: "Neha Sharma",
            testId: "test_longjump_standard",
            testTitle: "Standard Long Jump Biomechanics Test",
            videoOriginalName: "neha_state_meet.mp4",
            videoStoredName: "1791525211281-neha_state_meet.mp4",
            videoUrl: "/ml-video/outputs/neha_state_meet_analyzed.mp4",
            status: "completed",
            timestamp: "2026-03-18T15:20:00.000Z",
            result: {
                performance: {
                    takeoff_angle_deg: 21.2,
                    takeoff_knee_angle_deg: 166.0,
                    takeoff_hip_angle_deg: 170.8,
                    takeoff_ankle_angle_deg: 92.0,
                    flight_time_sec: 0.76,
                    runup_time_sec: 5.20,
                    landing_stability_score: 91.5
                },
                detection: {
                    detected_frames: 170,
                    detection_ratio_percent: 96.5,
                    pose_confidence_percent: 90.2
                },
                quality: {
                    analysis_quality_percent: 91.8
                },
                jump_phase: {
                    takeoff_time_sec: 5.20,
                    peak_time_sec: 5.58,
                    landing_time_sec: 5.96,
                    landing_detected: true
                },
                prediction: {
                    predicted_distance: 6.67,
                    talent_level: "Medium Potential",
                    confidence_percent: 88.0
                },
                feedback: generateBiomechanicalFeedback({
                    takeoff_angle_deg: 21.2,
                    takeoff_knee_angle_deg: 166.0,
                    landing_stability_score: 91.5,
                    flight_time_sec: 0.76,
                    predicted_distance: 6.67,
                    talent_level: "Medium Potential"
                })
            }
        },
        {
            id: "sub_105",
            athleteId: "ath_vikram",
            athleteName: "Vikram Singh",
            testId: "test_longjump_standard",
            testTitle: "Standard Long Jump Biomechanics Test",
            videoOriginalName: "vikram_practice.mp4",
            videoStoredName: "1791525211299-vikram_practice.mp4",
            videoUrl: null,
            status: "failed",
            error: "Camera angle too tilted: Lateral plane deviated by > 25 degrees.",
            timestamp: "2026-03-20T11:00:00.000Z",
            result: null
        }
    ];

    sampleSubmissions.forEach(sub => submissions.set(sub.id, sub));

    console.log(`[MemoryStore] Successfully initialized: ${users.size} users, ${tests.size} tests, ${submissions.size} submissions.`);
}

// ============================================================
// DYNAMIC FEEDBACK AND RECOMMENDATIONS ENGINE
// Computes actionable coaching recommendations based on actual AI metrics
// ============================================================

function generateBiomechanicalFeedback(metrics) {
    const angle = Number(metrics.takeoff_angle_deg) || 0;
    const knee = Number(metrics.takeoff_knee_angle_deg) || 0;
    const stability = Number(metrics.landing_stability_score) || 0;
    const flight = Number(metrics.flight_time_sec) || 0;
    const distance = Number(metrics.predicted_distance) || 0;
    const talent = metrics.talent_level || "Developing";

    const feedbackItems = [];
    const recommendations = [];

    // 1. Takeoff Angle Evaluation (Optimal: 18° - 23°)
    if (angle < 18) {
        feedbackItems.push({
            aspect: "Takeoff Angle",
            status: "Needs Work",
            value: `${angle.toFixed(1)}°`,
            note: "Takeoff angle is too flat (< 18°). The jumper is rushing horizontal speed at the expense of vertical lift."
        });
        recommendations.push("Focus on the penultimate stride: lower hips slightly on the second-to-last stride to generate stronger vertical impulse off the board.");
    } else if (angle > 24) {
        feedbackItems.push({
            aspect: "Takeoff Angle",
            status: "Needs Work",
            value: `${angle.toFixed(1)}°`,
            note: "Takeoff angle is excessively steep (> 24°), dissipating vital forward horizontal velocity into the air."
        });
        recommendations.push("Maintain aggressive horizontal drive through the board; avoid 'jumping up' like a high jumper.");
    } else {
        feedbackItems.push({
            aspect: "Takeoff Angle",
            status: "Optimal",
            value: `${angle.toFixed(1)}°`,
            note: "Ideal takeoff trajectory! Balances horizontal velocity retention with sufficient vertical lift."
        });
        recommendations.push("Maintain your current takeoff impulse mechanics; continue fine-tuning speed conversion into the board.");
    }

    // 2. Takeoff Knee Extension (Optimal: 165° - 175°)
    if (knee > 0 && knee < 162) {
        feedbackItems.push({
            aspect: "Knee Extension",
            status: "Fair",
            value: `${knee.toFixed(1)}°`,
            note: "Incomplete knee extension off the takeoff board, indicating premature release or insufficient leg drive."
        });
        recommendations.push("Incorporate single-leg box bounds, plyometrics, and Romanian deadlifts to develop explosive triple extension (ankle-knee-hip).");
    } else if (knee >= 162) {
        feedbackItems.push({
            aspect: "Knee Extension",
            status: "Strong",
            value: `${knee.toFixed(1)}°`,
            note: "Full, powerful extension of the takeoff limb maximizing vertical force delivery."
        });
    }

    // 3. Landing Stability (Optimal: > 90%)
    if (stability > 0 && stability < 90) {
        feedbackItems.push({
            aspect: "Landing Stability",
            status: "Moderate",
            value: `${stability.toFixed(1)}%`,
            note: "Slight imbalance or early collapse upon landing pit contact, risking lost distance marks."
        });
        recommendations.push("Practice landing pit drills: maintain heels-first impact followed by forward knee sweep and arm drive to ensure you roll forward out of the mark.");
    } else if (stability >= 90) {
        feedbackItems.push({
            aspect: "Landing Stability",
            status: "Excellent",
            value: `${stability.toFixed(1)}%`,
            note: "Superb landing mechanics and torso stabilization, securing maximum legal measured distance."
        });
    }

    // 4. Overall Talent Conditioning Recommendation
    if (talent.toLowerCase().includes("high")) {
        recommendations.push("Elite Candidate: Recommended for advanced national academy coaching and international competition readiness training.");
    } else if (talent.toLowerCase().includes("medium")) {
        recommendations.push("Promising Talent: Focus on 30m fly sprint mechanics to raise top-end approach runway speed from current baseline.");
    } else {
        recommendations.push("Developing Athlete: Prioritize foundational speed-power training, sprint form consistency, and approach rhythm repeatability.");
    }

    return {
        summary: `Performance assessed as ${talent} with ${distance ? distance.toFixed(2) + 'm potential' : 'complete biomechanics evaluated'}.`,
        feedbackItems,
        recommendations
    };
}

// ============================================================
// TEMPORARY VIDEO CLEANUP POLICY
// ============================================================

function cleanupTemporaryVideos(maxAgeHours = 4) {
    try {
        const uploadDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadDir)) return { count: 0, freedBytes: 0 };

        const files = fs.readdirSync(uploadDir);
        const now = Date.now();
        const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
        let deletedCount = 0;
        let freedBytes = 0;

        files.forEach(file => {
            const filePath = path.join(uploadDir, file);
            try {
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > maxAgeMs) {
                    freedBytes += stat.size;
                    fs.unlinkSync(filePath);
                    deletedCount++;
                }
            } catch (err) {
                // Ignore busy files
            }
        });

        if (deletedCount > 0) {
            console.log(`[Cleanup Policy] Cleaned ${deletedCount} temporary video files (${(freedBytes / (1024 * 1024)).toFixed(2)} MB freed).`);
        }
        return { count: deletedCount, freedBytes };
    } catch (e) {
        console.error("[Cleanup Policy] Error during video cleanup:", e.message);
        return { count: 0, freedBytes: 0 };
    }
}

// Execute initial seeding
seedInitialData();

module.exports = {
    users,
    athleteProfiles,
    tests,
    instructions,
    submissions,
    generateBiomechanicalFeedback,
    cleanupTemporaryVideos,
    seedInitialData
};
