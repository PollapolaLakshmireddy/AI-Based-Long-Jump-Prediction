// ============================================================
// PERFORMANCE FEEDBACK & RECOMMENDATIONS SCRIPT
// ============================================================

async function loadFeedbackPage() {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;
    let athleteName = "Athlete";
    let latestDate = "Recent Assessment";
    let feedbackItems = [];
    let recommendations = [];

    // 1. Try fetching from Athlete Dashboard API if token exists
    if (token) {
        try {
            const response = await fetch("/api/athletes/dashboard", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.ok) {
                const resData = await response.json();
                const data = resData.data || {};
                const profile = data.profile || {};
                const latest = data.latestAssessment || {};
                const fb = latest.feedback || {};

                if (profile.name) athleteName = profile.name;
                if (latest.timestamp) {
                    try {
                        latestDate = new Date(latest.timestamp).toLocaleDateString();
                    } catch (e) {}
                }

                if (Array.isArray(fb.feedbackItems) && fb.feedbackItems.length > 0) {
                    feedbackItems = fb.feedbackItems;
                }
                if (Array.isArray(fb.recommendations) && fb.recommendations.length > 0) {
                    recommendations = fb.recommendations;
                }
            }
        } catch (e) {
            console.warn("Could not fetch /api/athletes/dashboard:", e.message);
        }
    }

    // 2. If no feedback items found yet, check localStorage latestAssessment
    if (feedbackItems.length === 0) {
        try {
            const localLatest = JSON.parse(localStorage.getItem("latestAssessment") || "null");
            if (localLatest && localLatest.metrics) {
                const angle = Number(localLatest.metrics.takeoff_angle_deg) || 20.4;
                const knee = Number(localLatest.metrics.takeoff_knee_angle_deg) || 168.0;
                const stability = Number(localLatest.metrics.landing_stability_score) || 94.0;
                const dist = localLatest.prediction?.predicted_distance ? Number(localLatest.prediction.predicted_distance).toFixed(2) + "m" : "--";
                latestDate = localLatest.timestamp ? new Date(localLatest.timestamp).toLocaleDateString() : "Latest Upload";

                feedbackItems = buildFeedbackFromMetrics(angle, knee, stability, dist);
                if (localLatest.feedback && Array.isArray(localLatest.feedback.recommendations)) {
                    recommendations = localLatest.feedback.recommendations;
                }
            }
        } catch (e) {}
    }

    // 3. If still empty, try fetching latest item from /api/results or /api/video/history
    if (feedbackItems.length === 0) {
        try {
            const res = await fetch("/api/results");
            if (res.ok) {
                const json = await res.json();
                const items = json.data || [];
                if (items.length > 0) {
                    const topItem = items[0];
                    const angle = Number(topItem.takeoff_angle) || 20.4;
                    const knee = Number(topItem.knee_angle) || 168.0;
                    const stability = Number(topItem.stability_score) || 92.0;
                    const dist = topItem.predicted_distance ? Number(topItem.predicted_distance).toFixed(2) + "m" : "--";
                    if (topItem.athleteName) athleteName = topItem.athleteName;
                    if (topItem.timestamp) {
                        try { latestDate = new Date(topItem.timestamp).toLocaleDateString(); } catch (e) {}
                    }
                    feedbackItems = buildFeedbackFromMetrics(angle, knee, stability, dist);
                    if (topItem.suggestions && Array.isArray(topItem.suggestions)) {
                        recommendations = topItem.suggestions.map(s => s.tip || s.observation).filter(Boolean);
                    }
                }
            }
        } catch (e) {
            console.warn("Could not fetch /api/results:", e.message);
        }
    }

    // 4. Default standard fallback if no assessments are on record yet
    if (feedbackItems.length === 0) {
        feedbackItems = buildDefaultFeedback();
    }

    if (recommendations.length === 0) {
        recommendations = [
            "Maintain an upright torso posture during the final 4 approach strides to prevent forward pitch at the takeoff board.",
            "Practice the penultimate stride hip lowering drill on a flat runway: focus on flat foot placement without slowing stride frequency.",
            "Incorporate resisted sprint towing (sled or band) twice weekly to improve terminal approach runway velocity."
        ];
    }

    // Update Header Meta
    const metaEl = document.getElementById("feedbackAthleteMeta");
    if (metaEl) {
        metaEl.textContent = `Targeted technique insights for ${athleteName} based on assessment (${latestDate}).`;
    }

    // Render cards and drills
    renderAspects(feedbackItems);
    renderActionItems(recommendations);
}

function buildFeedbackFromMetrics(angle, knee, stability, dist) {
    const isAngleOptimal = angle >= 18 && angle <= 23;
    const isKneeOptimal = knee >= 160 && knee <= 175;
    const isStabilityOptimal = stability >= 88;

    return [
        {
            aspect: "Takeoff Launch Angle",
            status: isAngleOptimal ? "Optimal" : (angle < 18 ? "Too Flat" : "Too Steep"),
            value: `${angle.toFixed(1)}°`,
            note: isAngleOptimal
                ? "Your launch vector is within the golden 18°–23° window, maintaining horizontal speed while providing required airtime."
                : (angle < 18
                    ? "Angle is flat (<18°), reducing flight hang time. Lower center of gravity on the penultimate step to gain vertical lift."
                    : "Angle is too steep (>23°), causing aggressive horizontal deceleration at foot strike."),
            drill: "Box takeoffs and penultimate stride acceleration markers."
        },
        {
            aspect: "Takeoff Knee & Hip Extension",
            status: isKneeOptimal ? "Strong Extension" : "Fair / Needs Work",
            value: `${knee.toFixed(1)}°`,
            note: isKneeOptimal
                ? "Excellent triple extension. The takeoff leg pushes completely through the board without premature collapse."
                : "Knee flexion indicates slight absorption of ground force. Build eccentric quad strength to maintain a stiffer takeoff leg.",
            drill: "Single-leg bounds, Bulgarian split squats, and depth jumps."
        },
        {
            aspect: "Landing Stabilization Score",
            status: isStabilityOptimal ? "Excellent" : "Needs Work",
            value: `${stability.toFixed(0)}%`,
            note: isStabilityOptimal
                ? "Clean landing execution: heels enter first with active forward knee flexion to sweep hips through the mark."
                : "Premature feet dropping or backward leaning noted upon sand contact. Focus on in-flight core bracing.",
            drill: "Pit jackknife reach drills and seated pike leg lifts."
        },
        {
            aspect: "Predicted Distance Projection",
            status: "Forecasted",
            value: dist,
            note: "Projected legal long jump distance derived from pose tracking velocity and takeoff kinetics.",
            drill: "Runway consistency rhythm runs: 16–18 strides with checkmarks."
        }
    ];
}

function buildDefaultFeedback() {
    return [
        {
            aspect: "Takeoff Launch Angle Analysis",
            status: "Optimal Window: 18°–23°",
            value: "20.4° Benchmark",
            note: "Optimal long jump distance is achieved with an angle between 18° and 23°. Below 18° sacrifices trajectory; above 24° wastes sprint momentum.",
            drill: "Penultimate stride lowering & box takeoffs"
        },
        {
            aspect: "Takeoff Knee & Hip Triple Extension",
            status: "Target: 162°–175°",
            value: "168.0° Target",
            note: "Full ankle, knee, and hip extension generates the vertical impulse needed to project the body through the flight phase.",
            drill: "Single-leg bounds, power cleans & Bulgarian split squats"
        },
        {
            aspect: "Landing Stabilization & Sand Reach",
            status: "Target: > 90%",
            value: "92% Benchmark",
            note: "Feet should impact heels-first with knees compressing forward and arms sweeping vigorously forward to avoid falling back into the pit.",
            drill: "Sand pit extension drills, hanging leg raises & core stabilization"
        },
        {
            aspect: "Runway Sprint Velocity Conservation",
            status: "Target: > 9.5 m/s",
            value: "Approach Kinematics",
            note: "Runway velocity accounts for approximately 85% of total jump distance. Upright sprinting posture must be maintained into the takeoff board.",
            drill: "Flying 30m sprints and resisted sled accelerations"
        }
    ];
}

function renderAspects(items) {
    const grid = document.getElementById("aspectsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "feedback-card";

        const statusStr = (item.status || "").toLowerCase();
        let pillClass = "status-work";
        if (statusStr.includes("opt") || statusStr.includes("str") || statusStr.includes("exc")) {
            pillClass = "status-optimal";
        } else if (statusStr.includes("target") || statusStr.includes("bench") || statusStr.includes("fore")) {
            pillClass = "status-info";
        }

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <h3>${escapeHtml(item.aspect)}</h3>
                    <span class="status-pill ${pillClass}">${escapeHtml(item.status)}</span>
                </div>
                <div class="measured-val">${escapeHtml(item.value || '--')}</div>
                <p class="feedback-note">${escapeHtml(item.note)}</p>
            </div>
            ${item.drill ? `<div class="drill-box"><strong>Recommended Drill:</strong> ${escapeHtml(item.drill)}</div>` : ''}
        `;

        grid.appendChild(card);
    });
}

function renderActionItems(recs) {
    const list = document.getElementById("actionItemsList");
    if (!list) return;

    list.innerHTML = "";
    recs.forEach(r => {
        const li = document.createElement("li");
        li.textContent = r;
        list.appendChild(li);
    });
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", loadFeedbackPage);
