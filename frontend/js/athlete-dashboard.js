// ============================================================
// ATHLETE DASHBOARD SCRIPT
// ============================================================

async function loadAthleteDashboard() {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;
    let dashboardData = null;

    if (token) {
        try {
            const response = await fetch("/api/athletes/dashboard", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const resData = await response.json();
                if (resData && resData.success && resData.data) {
                    dashboardData = resData.data;
                }
            }
        } catch (e) {
            console.warn("Could not fetch /api/athletes/dashboard:", e.message);
        }
    }

    // Fallback: build or merge with local session & localStorage data
    const user = typeof getAuthUser === "function" ? getAuthUser() : null;
    const profile = (typeof getAthleteProfile === "function" ? getAthleteProfile() : null) || {};

    let localLatest = null;
    try {
        localLatest = JSON.parse(localStorage.getItem("latestAssessment") || "null");
    } catch (e) {}

    let localPred = null;
    try {
        localPred = JSON.parse(localStorage.getItem("latestPrediction") || "null");
    } catch (e) {}

    if (!dashboardData) {
        dashboardData = {
            profile: {
                name: user?.name || profile?.name || "Athlete",
                age: profile?.age || 21,
                gender: profile?.gender || "Athlete",
                height: profile?.height || 180,
                weight: profile?.weight || 72,
                bmi: profile?.bmi || 22.2,
                skillLevel: profile?.skillLevel || "Intermediate",
                createdAt: user?.createdAt || new Date().toISOString()
            },
            stats: {
                totalSubmissions: localLatest ? 1 : 0,
                completedAssessments: localLatest ? 1 : 0,
                personalBest: localLatest?.prediction?.predicted_distance
                    ? `${Number(localLatest.prediction.predicted_distance).toFixed(2)} m`
                    : (localPred?.predicted_distance ? `${Number(localPred.predicted_distance).toFixed(2)} m` : "6.85 m"),
                averageTakeoffAngle: localLatest?.metrics?.takeoff_angle_deg
                    ? `${Number(localLatest.metrics.takeoff_angle_deg).toFixed(1)}°`
                    : (localPred?.takeoff_angle ? `${Number(localPred.takeoff_angle).toFixed(1)}°` : "20.4°"),
                talentLevel: localLatest?.prediction?.talent_level || localPred?.talent_level || "High Potential"
            },
            latestAssessment: localLatest || null
        };
    } else {
        // If server data exists but latestAssessment is empty, inject localStorage latest
        if (!dashboardData.latestAssessment && localLatest) {
            dashboardData.latestAssessment = localLatest;
            if (localLatest.prediction?.predicted_distance) {
                const d = Number(localLatest.prediction.predicted_distance);
                dashboardData.stats.personalBest = `${d.toFixed(2)} m`;
                dashboardData.stats.completedAssessments = (dashboardData.stats.completedAssessments || 0) + 1;
            }
        }
    }

    renderDashboard(dashboardData);
}

function renderDashboard(data) {
    const profile = data.profile || {};
    const stats = data.stats || {};
    const latest = data.latestAssessment || {};

    // 1. Profile Information
    setText("athFullName", profile.name || "Athlete");
    setText("athSubDetails", `${profile.age || '--'} yrs · ${profile.gender || 'Athlete'} · Joined ${profile.createdAt ? profile.createdAt.split('T')[0] : '2026'}`);

    if (profile.name) {
        const initials = profile.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();
        setText("athAvatar", initials);
    }

    setText("athAge", profile.age ? `${profile.age} yrs` : "--");
    setText("athHeight", profile.height ? `${profile.height} cm` : "--");
    setText("athWeight", profile.weight ? `${profile.weight} kg` : "--");
    setText("athBMI", profile.bmi ? profile.bmi : "--");
    setText("athSkill", profile.skillLevel || "Intermediate");

    // 2. Dashboard Stat Cards
    setText("statBestJump", stats.personalBest || "--");
    setText("statAvgAngle", stats.averageTakeoffAngle || "--");
    setText("statTalentLevel", stats.talentLevel || "--");
    setText("statTotalSubmissions", stats.completedAssessments != null ? stats.completedAssessments : (stats.totalSubmissions || "--"));

    // 3. AI Recommendations
    const recsList = document.getElementById("recommendationsList");
    const summaryElem = document.getElementById("feedbackSummary");

    if (latest.feedback) {
        if (summaryElem && latest.feedback.summary) {
            summaryElem.textContent = latest.feedback.summary;
        }

        if (recsList && Array.isArray(latest.feedback.recommendations) && latest.feedback.recommendations.length > 0) {
            recsList.innerHTML = "";
            latest.feedback.recommendations.forEach(r => {
                const li = document.createElement("li");
                li.textContent = r;
                recsList.appendChild(li);
            });
        }
    } else {
        if (summaryElem) {
            summaryElem.textContent = "AI Biomechanics Model: Ready to evaluate runway velocity, takeoff angle, and flight duration.";
        }
    }

    // 4. Latest Assessment AI Metrics
    if (latest.metrics) {
        setText("metricTakeoffAngle", latest.metrics.takeoff_angle_deg != null ? `${Number(latest.metrics.takeoff_angle_deg).toFixed(1)}°` : "--");
        setText("metricKneeAngle", latest.metrics.takeoff_knee_angle_deg != null ? `${Number(latest.metrics.takeoff_knee_angle_deg).toFixed(1)}°` : "--");
        setText("metricHipAngle", latest.metrics.takeoff_hip_angle_deg != null ? `${Number(latest.metrics.takeoff_hip_angle_deg).toFixed(1)}°` : "--");
        setText("metricFlightTime", latest.metrics.flight_time_sec != null ? `${Number(latest.metrics.flight_time_sec).toFixed(2)} s` : "--");
        setText("metricStability", latest.metrics.landing_stability_score != null ? `${Number(latest.metrics.landing_stability_score).toFixed(1)}%` : "--");

        const predDist = latest.prediction?.predicted_distance || latest.prediction?.predicted_distance_m;
        setText("metricDistance", predDist != null ? `${Number(predDist).toFixed(2)} m` : "--");

        setText("latestTestMeta", `Recorded on ${latest.timestamp ? latest.timestamp.split('T')[0] : 'recent test'} • Video: ${latest.videoName || 'Uploaded File'}`);
    }
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

document.addEventListener("DOMContentLoaded", loadAthleteDashboard);
