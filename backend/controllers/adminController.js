const {
    users,
    athleteProfiles,
    tests,
    instructions,
    submissions,
    cleanupTemporaryVideos
} = require("../data/memoryStore");

// ============================================================
// 1. DASHBOARD STATISTICS
// ============================================================

const getDashboardStats = (req, res) => {
    const allUsers = Array.from(users.values());
    const totalAthletes = allUsers.filter(u => u.role === "athlete").length;

    const allSubmissions = Array.from(submissions.values());
    const totalSubmissions = allSubmissions.length;
    const completedAssessments = allSubmissions.filter(s => s.status === "completed").length;
    const failedAssessments = allSubmissions.filter(s => s.status === "failed").length;

    // Recent 5 submissions
    const recentSubmissions = [...allSubmissions]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    // Talent distribution breakdown
    let high = 0, medium = 0, developing = 0;
    allSubmissions.forEach(sub => {
        const talent = sub.result?.prediction?.talent_level || "";
        if (talent.toLowerCase().includes("high")) high++;
        else if (talent.toLowerCase().includes("medium")) medium++;
        else if (sub.status === "completed") developing++;
    });

    return res.status(200).json({
        success: true,
        stats: {
            totalAthletes,
            totalSubmissions,
            completedAssessments,
            failedAssessments,
            activeTests: Array.from(tests.values()).filter(t => t.status === "active").length
        },
        talentDistribution: {
            high,
            medium,
            developing
        },
        recentSubmissions
    });
};

// ============================================================
// 2. MANAGE ATHLETES (Search, Filter, Status Update)
// ============================================================

const getAdminAthletes = (req, res) => {
    const { search, talent, status } = req.query;
    let athletes = [];

    for (const [userId, profile] of athleteProfiles.entries()) {
        const user = users.get(userId);
        if (!user || user.role !== "athlete") continue;

        const athleteSubs = Array.from(submissions.values()).filter(s => s.athleteId === userId);
        let bestJump = 0;
        let latestTalent = "Developing";

        athleteSubs.forEach(s => {
            const dist = s.result?.prediction?.predicted_distance || s.result?.performance?.jump_distance;
            if (dist && dist > bestJump) bestJump = dist;
            if (s.result?.prediction?.talent_level) latestTalent = s.result.prediction.talent_level;
        });

        athletes.push({
            ...profile,
            username: user.username,
            email: user.email,
            status: user.status,
            submissionsCount: athleteSubs.length,
            bestJump: bestJump ? Number(bestJump).toFixed(2) : "--",
            talentLevel: latestTalent
        });
    }

    // Filter by search
    if (search) {
        const q = search.toLowerCase().trim();
        athletes = athletes.filter(a =>
            a.name.toLowerCase().includes(q) ||
            a.username.toLowerCase().includes(q) ||
            (a.email && a.email.toLowerCase().includes(q))
        );
    }

    // Filter by talent
    if (talent && talent !== "all") {
        athletes = athletes.filter(a =>
            a.talentLevel.toLowerCase().includes(talent.toLowerCase())
        );
    }

    // Filter by account status
    if (status && status !== "all") {
        athletes = athletes.filter(a => a.status === status);
    }

    return res.status(200).json({
        success: true,
        count: athletes.length,
        data: athletes
    });
};

const updateAthleteStatus = (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!users.has(id)) {
        return res.status(404).json({ success: false, message: "Athlete account not found." });
    }

    const user = users.get(id);
    user.status = status === "inactive" ? "inactive" : "active";
    users.set(id, user);

    return res.status(200).json({
        success: true,
        message: `Athlete account status updated to ${user.status}.`,
        user: {
            id: user.id,
            username: user.username,
            status: user.status
        }
    });
};

// ============================================================
// 3. VIEW TEST SUBMISSIONS
// ============================================================

const getAllSubmissions = (req, res) => {
    const { status, athleteId } = req.query;

    let subList = Array.from(submissions.values());

    if (status && status !== "all") {
        subList = subList.filter(s => s.status === status);
    }

    if (athleteId) {
        subList = subList.filter(s => s.athleteId === athleteId);
    }

    subList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.status(200).json({
        success: true,
        count: subList.length,
        data: subList
    });
};

// ============================================================
// 4. PERFORMANCE ANALYTICS (Platform-level)
// ============================================================

const getPlatformAnalytics = (req, res) => {
    const completedSubs = Array.from(submissions.values()).filter(s => s.status === "completed");

    let totalJump = 0;
    let jumpCount = 0;
    let totalAngle = 0;
    let angleCount = 0;
    let totalStability = 0;
    let stabilityCount = 0;

    const angleBuckets = { "< 18°": 0, "18° - 23°": 0, "> 23°": 0 };
    const distanceTimeline = [];

    completedSubs.forEach(sub => {
        const perf = sub.result?.performance;
        const pred = sub.result?.prediction;

        if (pred?.predicted_distance) {
            totalJump += pred.predicted_distance;
            jumpCount++;
            distanceTimeline.push({
                date: sub.timestamp.split("T")[0],
                athleteName: sub.athleteName,
                distance: pred.predicted_distance,
                talentLevel: pred.talent_level
            });
        }

        if (perf?.takeoff_angle_deg) {
            const a = Number(perf.takeoff_angle_deg);
            totalAngle += a;
            angleCount++;
            if (a < 18) angleBuckets["< 18°"]++;
            else if (a <= 23) angleBuckets["18° - 23°"]++;
            else angleBuckets["> 23°"]++;
        }

        if (perf?.landing_stability_score) {
            totalStability += Number(perf.landing_stability_score);
            stabilityCount++;
        }
    });

    return res.status(200).json({
        success: true,
        analytics: {
            totalAssessed: completedSubs.length,
            averageJumpDistance: jumpCount > 0 ? (totalJump / jumpCount).toFixed(2) : 0,
            averageTakeoffAngle: angleCount > 0 ? (totalAngle / angleCount).toFixed(1) : 0,
            averageLandingStability: stabilityCount > 0 ? (totalStability / stabilityCount).toFixed(1) : 0,
            angleDistribution: angleBuckets,
            timeline: distanceTimeline.sort((a, b) => new Date(a.date) - new Date(b.date))
        }
    });
};

// ============================================================
// 5. GENERATE REPORTS (CSV & Summary)
// ============================================================

const exportReportCsv = (req, res) => {
    try {
        const completedSubs = Array.from(submissions.values());

        const headers = [
            "Submission ID",
            "Athlete ID",
            "Athlete Name",
            "Test Title",
            "Date",
            "Status",
            "Takeoff Angle (deg)",
            "Knee Angle (deg)",
            "Hip Angle (deg)",
            "Flight Time (sec)",
            "Landing Stability (%)",
            "Predicted Distance (m)",
            "Talent Level",
            "Confidence (%)"
        ];

        const rows = completedSubs.map(s => {
            const perf = s.result?.performance || {};
            const pred = s.result?.prediction || {};

            return [
                s.id,
                s.athleteId,
                `"${(s.athleteName || "").replace(/"/g, '""')}"`,
                `"${(s.testTitle || "").replace(/"/g, '""')}"`,
                s.timestamp,
                s.status,
                perf.takeoff_angle_deg ?? "--",
                perf.takeoff_knee_angle_deg ?? "--",
                perf.takeoff_hip_angle_deg ?? "--",
                perf.flight_time_sec ?? "--",
                perf.landing_stability_score ?? "--",
                pred.predicted_distance ?? "--",
                `"${(pred.talent_level || "--").replace(/"/g, '""')}"`,
                pred.confidence_percent ?? "--"
            ].join(",");
        });

        const csvContent = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=sports_talent_assessment_report_${Date.now()}.csv`);
        return res.status(200).send(csvContent);

    } catch (e) {
        console.error("CSV Export Error:", e);
        return res.status(500).json({ success: false, message: "Failed to generate CSV report." });
    }
};

const getReportSummary = (req, res) => {
    const completedSubs = Array.from(submissions.values()).filter(s => s.status === "completed");

    const reportsData = completedSubs.map(sub => {
        const athlete = athleteProfiles.get(sub.athleteId) || {};
        return {
            id: sub.id,
            athleteName: sub.athleteName,
            age: athlete.age || "--",
            gender: athlete.gender || "--",
            testTitle: sub.testTitle || "Standard Long Jump Test",
            date: sub.timestamp.split("T")[0],
            metrics: sub.result?.performance || {},
            prediction: sub.result?.prediction || {},
            feedback: sub.result?.feedback || {}
        };
    });

    return res.status(200).json({
        success: true,
        count: reportsData.length,
        reports: reportsData
    });
};

// ============================================================
// 6. MANAGE TESTS (Create, Update, Activate, Deactivate)
// ============================================================

const getAllTests = (req, res) => {
    return res.status(200).json({
        success: true,
        count: tests.size,
        data: Array.from(tests.values())
    });
};

const createTest = (req, res) => {
    const { title, category, description, durationMinutes, criteria } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, message: "Test title is required." });
    }

    const testId = "test_" + Date.now();
    const newTest = {
        id: testId,
        title: title.trim(),
        category: category || "Video Analysis",
        description: description || "",
        durationMinutes: Number(durationMinutes) || 15,
        criteria: criteria || "",
        status: "active",
        createdAt: new Date().toISOString()
    };

    tests.set(testId, newTest);

    return res.status(201).json({
        success: true,
        message: "Test created successfully.",
        data: newTest
    });
};

const updateTest = (req, res) => {
    const { id } = req.params;

    if (!tests.has(id)) {
        return res.status(404).json({ success: false, message: "Test not found." });
    }

    const existing = tests.get(id);
    const updated = {
        ...existing,
        ...req.body,
        id,
        updatedAt: new Date().toISOString()
    };

    tests.set(id, updated);

    return res.status(200).json({
        success: true,
        message: "Test updated successfully.",
        data: updated
    });
};

// ============================================================
// 7. MANAGE INSTRUCTIONS
// ============================================================

const getAllInstructions = (req, res) => {
    return res.status(200).json({
        success: true,
        count: instructions.size,
        data: Array.from(instructions.values())
    });
};

const updateInstruction = (req, res) => {
    const { id } = req.params;

    if (!instructions.has(id)) {
        return res.status(404).json({ success: false, message: "Instruction set not found." });
    }

    const existing = instructions.get(id);
    const updated = {
        ...existing,
        ...req.body,
        id,
        lastUpdated: new Date().toISOString()
    };

    instructions.set(id, updated);

    return res.status(200).json({
        success: true,
        message: "Instructions updated successfully.",
        data: updated
    });
};

const addInstruction = (req, res) => {
    const { testId, title, summary, steps, requirements, tips } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, message: "Instruction title is required." });
    }

    const id = "inst_" + Date.now();
    const newInst = {
        id,
        testId: testId || "general",
        title: title.trim(),
        summary: summary || "",
        steps: Array.isArray(steps) ? steps : [steps].filter(Boolean),
        requirements: Array.isArray(requirements) ? requirements : [requirements].filter(Boolean),
        tips: Array.isArray(tips) ? tips : [tips].filter(Boolean),
        lastUpdated: new Date().toISOString()
    };

    instructions.set(id, newInst);

    return res.status(201).json({
        success: true,
        message: "Instructions added successfully.",
        data: newInst
    });
};

// ============================================================
// 8. TEMPORARY VIDEO CLEANUP
// ============================================================

const cleanupVideos = (req, res) => {
    const maxAgeHours = Number(req.query.maxAgeHours) || 2;
    const result = cleanupTemporaryVideos(maxAgeHours);

    return res.status(200).json({
        success: true,
        message: `Video cleanup completed: ${result.count} files removed.`,
        data: result
    });
};

module.exports = {
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
};
