// ============================================================
// TEST HISTORY & RESULTS MODAL SCRIPT
// ============================================================

let submissionsData = [];

async function loadTestHistory() {
    const token = typeof getAuthToken === "function" ? getAuthToken() : null;
    const role = typeof getAuthRole === "function" ? getAuthRole() : null;

    let items = [];

    // 1. Primary endpoint based on role
    const endpoint = role === "admin"
        ? "/api/admin/submissions"
        : "/api/tests/submissions/my-history";

    try {
        const response = await fetch(endpoint, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (response.ok) {
            const resData = await response.json();
            if (resData && Array.isArray(resData.data)) {
                items = resData.data;
            }
        }
    } catch (e) {
        console.warn("Primary endpoint failed, will attempt fallback:", e.message);
    }

    // 2. Fallback to /api/results or /api/video/history if empty or failed
    if (items.length === 0) {
        try {
            const resResults = await fetch("/api/results");
            if (resResults.ok) {
                const json = await resResults.json();
                const histItems = json.data || [];
                // Map history items into standard submission format
                histItems.forEach(h => {
                    items.push({
                        id: h.id,
                        testTitle: h.video_name || "Long Jump Video Analysis",
                        videoOriginalName: h.video_name,
                        videoStoredName: h.stored_filename,
                        videoUrl: h.output_video_url,
                        status: "completed",
                        timestamp: h.timestamp || new Date().toISOString(),
                        takeoff_angle: h.takeoff_angle,
                        predicted_distance: h.predicted_distance,
                        talent_level: h.talent_level,
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
                });
            }
        } catch (e) {
            console.warn("Fallback /api/results failed:", e.message);
        }
    }

    // 3. Merge in any localStorage predictions
    try {
        const localPreds = JSON.parse(localStorage.getItem("manual_predictions_history") || "[]");
        localPreds.forEach(lp => {
            if (lp && lp.id && !items.some(it => it.id === lp.id)) {
                items.push({
                    id: lp.id,
                    testTitle: lp.video_name || "Manual Prediction",
                    videoOriginalName: lp.video_name,
                    status: "completed",
                    timestamp: lp.timestamp,
                    takeoff_angle: lp.takeoff_angle,
                    predicted_distance: lp.predicted_distance,
                    talent_level: lp.talent_level,
                    result: {
                        performance: {
                            takeoff_angle_deg: lp.takeoff_angle,
                            takeoff_knee_angle_deg: lp.knee_angle || 165.0,
                            flight_time_sec: lp.flight_time || 0.72,
                            landing_stability_score: lp.stability_score || 92.0
                        },
                        prediction: {
                            predicted_distance: lp.predicted_distance,
                            talent_level: lp.talent_level
                        },
                        suggestions: lp.suggestions || []
                    }
                });
            }
        });
    } catch (e) {}

    submissionsData = items;
    renderHistory(submissionsData);
    updateHistoryStats(submissionsData);
}

function updateHistoryStats(data) {
    const total = data.length;
    const completed = data.filter(d => d.status === "completed");

    let bestDist = 0;
    let totalAngle = 0;
    let angleCount = 0;

    completed.forEach(d => {
        const dist = Number(d.result?.prediction?.predicted_distance || d.result?.performance?.jump_distance || d.predicted_distance);
        if (dist && dist > bestDist) bestDist = dist;

        const a = Number(d.result?.performance?.takeoff_angle_deg || d.takeoff_angle);
        if (a && !isNaN(a) && a > 0) {
            totalAngle += a;
            angleCount++;
        }
    });

    setText("statTotalSubs", total);
    setText("statCompletedSubs", completed.length);
    setText("statBestDist", bestDist ? `${bestDist.toFixed(2)} m` : "--");
    setText("statAvgTakeoff", angleCount > 0 ? `${(totalAngle / angleCount).toFixed(1)}°` : "--");
}

function renderHistory(list) {
    const tbody = document.getElementById("historyTableBody");
    const countEl = document.getElementById("visibleCount");
    if (!tbody) return;

    if (countEl) countEl.textContent = list.length;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-light); padding: 40px;">No test submissions found. Upload your first jump video or generate an AI prediction!</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    list.forEach(item => {
        const tr = document.createElement("tr");

        const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString() : "--";
        const titleStr = item.testTitle || item.videoOriginalName || item.video_name || "Long Jump Test";
        const status = item.status || "completed";

        const perf = item.result?.performance || {};
        const pred = item.result?.prediction || {};

        const angle = perf.takeoff_angle_deg ?? item.takeoff_angle ?? "--";
        const dist = pred.predicted_distance ?? item.predicted_distance ?? "--";
        const talent = pred.talent_level ?? item.talent_level ?? "Good";

        const statusClass = status === "completed" ? "status-completed" : (status === "processing" ? "status-processing" : "status-failed");

        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${escapeHtml(titleStr)}</strong><br><small style="color: var(--text-light);">${escapeHtml(item.videoOriginalName || item.video_name || '')}</small></td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td>${angle !== "--" && !isNaN(Number(angle)) ? Number(angle).toFixed(1) + "°" : "--"}</td>
            <td>${dist !== "--" && !isNaN(Number(dist)) ? "<strong>" + Number(dist).toFixed(2) + " m</strong>" : "--"}</td>
            <td><span style="color: var(--primary); font-weight: bold;">${escapeHtml(talent)}</span></td>
            <td>
                <button type="button" class="btn-view-result" onclick="openResultModal('${item.id}')">
                    Inspect AI Result →
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// Modal View
function openResultModal(submissionId) {
    const item = submissionsData.find(s => s.id === submissionId);
    if (!item) return;

    const modal = document.getElementById("resultModal");
    if (!modal) return;

    setText("modalTestTitle", item.testTitle || item.videoOriginalName || "Long Jump Assessment");
    setText("modalDate", `Submission ID: ${item.id} • ${item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Recent'}`);

    const res = item.result || {};
    const perf = res.performance || {};
    const phase = res.jump_phase || {};
    const pred = res.prediction || {};
    const feedback = res.feedback || {};

    const angle = perf.takeoff_angle_deg ?? item.takeoff_angle;
    const knee = perf.takeoff_knee_angle_deg ?? item.knee_angle;
    const hip = perf.takeoff_hip_angle_deg ?? item.hip_angle;
    const flight = perf.flight_time_sec ?? item.flight_time;
    const stability = perf.landing_stability_score ?? item.stability_score;
    const dist = pred.predicted_distance ?? item.predicted_distance;
    const talent = pred.talent_level ?? item.talent_level ?? "Good";

    setText("mAngle", angle != null && !isNaN(Number(angle)) ? `${Number(angle).toFixed(1)}°` : "--");
    setText("mKnee", knee != null && !isNaN(Number(knee)) ? `${Number(knee).toFixed(1)}°` : "--");
    setText("mHip", hip != null && !isNaN(Number(hip)) ? `${Number(hip).toFixed(1)}°` : "--");
    setText("mFlight", flight != null && !isNaN(Number(flight)) ? `${Number(flight).toFixed(2)} s` : "--");
    setText("mStability", stability != null && !isNaN(Number(stability)) ? `${Number(stability).toFixed(1)}%` : "--");
    setText("mDist", dist != null && !isNaN(Number(dist)) ? `${Number(dist).toFixed(2)} m` : "--");

    setText("mPhaseTakeoff", phase.takeoff_time_sec != null ? `${Number(phase.takeoff_time_sec).toFixed(2)} s` : "--");
    setText("mPhasePeak", phase.peak_time_sec != null ? `${Number(phase.peak_time_sec).toFixed(2)} s` : "--");
    setText("mPhaseLanding", phase.landing_time_sec != null ? `${Number(phase.landing_time_sec).toFixed(2)} s` : "--");
    setText("mTalent", talent);

    // Feedback
    setText("mFeedbackSummary", feedback.summary || `Performance assessed as ${talent} with ${dist ? Number(dist).toFixed(2) + 'm' : ''} forecasted distance.`);
    const recsList = document.getElementById("mRecommendationsList");
    if (recsList) {
        recsList.innerHTML = "";
        let items = feedback.recommendations || [];
        if (items.length === 0 && res.suggestions) {
            items = res.suggestions.map(s => s.tip || s.observation).filter(Boolean);
        }

        if (items.length > 0) {
            items.forEach(r => {
                const li = document.createElement("li");
                li.textContent = r;
                recsList.appendChild(li);
            });
        } else {
            recsList.innerHTML = "<li>Maintain current approach velocity rhythm and emphasize triple extension at the board.</li>";
        }
    }

    // Video Player
    const videoUrl = item.videoUrl || res.output_video_url;
    const videoBox = document.getElementById("modalVideoContainer");
    const player = document.getElementById("modalVideoPlayer");

    if (videoUrl && player && videoBox) {
        player.src = videoUrl;
        videoBox.classList.remove("hidden");
    } else if (videoBox) {
        videoBox.classList.add("hidden");
    }

    modal.classList.remove("hidden");
}

function closeResultModal() {
    const modal = document.getElementById("resultModal");
    const player = document.getElementById("modalVideoPlayer");
    if (player) {
        player.pause();
        player.src = "";
    }
    if (modal) modal.classList.add("hidden");
}

// Search Filter
const searchInput = document.getElementById("historySearch");
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = submissionsData.filter(s =>
            (s.testTitle && s.testTitle.toLowerCase().includes(q)) ||
            (s.videoOriginalName && s.videoOriginalName.toLowerCase().includes(q)) ||
            (s.video_name && s.video_name.toLowerCase().includes(q)) ||
            (s.status && s.status.toLowerCase().includes(q))
        );
        renderHistory(filtered);
    });
}

const closeBtn = document.getElementById("closeModalBtn");
if (closeBtn) closeBtn.addEventListener("click", closeResultModal);

document.addEventListener("DOMContentLoaded", loadTestHistory);

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
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
