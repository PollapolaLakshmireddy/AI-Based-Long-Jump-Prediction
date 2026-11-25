// ============================================================
// LONG JUMP AI - RESULTS DASHBOARD CONTROLLER
// ============================================================

const API_BASE_URL = (typeof window !== "undefined" && window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:"))
    ? window.location.origin
    : "http://localhost:5000";

let allResults = [];
let filteredResults = [];

// DOM References
const resultsGrid = document.getElementById("resultsGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const tierFilter = document.getElementById("tierFilter");
const sortFilter = document.getElementById("sortFilter");
const refreshBtn = document.getElementById("refreshBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

// KPI References
const kpiTotal = document.getElementById("kpiTotal");
const kpiBest = document.getElementById("kpiBest");
const kpiAvgAngle = document.getElementById("kpiAvgAngle");
const kpiPotential = document.getElementById("kpiPotential");
const kpiPotentialSub = document.getElementById("kpiPotentialSub");

// Video Modal
const videoModal = document.getElementById("videoModal");
const modalVideoPlayer = document.getElementById("modalVideoPlayer");
const videoModalTitle = document.getElementById("videoModalTitle");
const videoModalSub = document.getElementById("videoModalSub");
const videoModalDetails = document.getElementById("videoModalDetails");
const modalDownloadVideoBtn = document.getElementById("modalDownloadVideoBtn");
const closeVideoModal = document.getElementById("closeVideoModal");
const closeVideoModalAction = document.getElementById("closeVideoModalAction");

// Details Modal
const detailsModal = document.getElementById("detailsModal");
const detailsModalTitle = document.getElementById("detailsModalTitle");
const detailsModalSub = document.getElementById("detailsModalSub");
const modalKinematicsBody = document.getElementById("modalKinematicsBody");
const modalSuggestionsContainer = document.getElementById("modalSuggestionsContainer");
const modalRoadmapContainer = document.getElementById("modalRoadmapContainer");
const modalRoadmapList = document.getElementById("modalRoadmapList");
const closeDetailsModal = document.getElementById("closeDetailsModal");
const closeDetailsModalAction = document.getElementById("closeDetailsModalAction");

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    fetchResults();
    setupEventListeners();
});

function setupEventListeners() {
    if (searchInput) searchInput.addEventListener("input", applyFilters);
    if (typeFilter) typeFilter.addEventListener("change", applyFilters);
    if (tierFilter) tierFilter.addEventListener("change", applyFilters);
    if (sortFilter) sortFilter.addEventListener("change", applyFilters);

    if (refreshBtn) refreshBtn.addEventListener("click", () => {
        fetchResults(true);
    });

    if (clearAllBtn) clearAllBtn.addEventListener("click", handleClearAll);

    // Modal Close handlers
    if (closeVideoModal) closeVideoModal.addEventListener("click", closeVideoModalHandler);
    if (closeVideoModalAction) closeVideoModalAction.addEventListener("click", closeVideoModalHandler);
    if (closeDetailsModal) closeDetailsModal.addEventListener("click", () => detailsModal.classList.remove("active"));
    if (closeDetailsModalAction) closeDetailsModalAction.addEventListener("click", () => detailsModal.classList.remove("active"));

    // Backdrop clicks
    if (videoModal) {
        videoModal.addEventListener("click", (e) => {
            if (e.target === videoModal) closeVideoModalHandler();
        });
    }
    if (detailsModal) {
        detailsModal.addEventListener("click", (e) => {
            if (e.target === detailsModal) detailsModal.classList.remove("active");
        });
    }

    // Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeVideoModalHandler();
            if (detailsModal) detailsModal.classList.remove("active");
        }
    });
}

function closeVideoModalHandler() {
    if (modalVideoPlayer) {
        modalVideoPlayer.pause();
        modalVideoPlayer.removeAttribute("src");
        modalVideoPlayer.load();
    }
    if (videoModal) videoModal.classList.remove("active");
}

// ============================================================
// FETCH RESULTS FROM BACKEND & LOCALSTORAGE
// ============================================================

async function fetchResults(isUserTriggered = false) {
    if (refreshBtn && isUserTriggered) {
        refreshBtn.textContent = "⏳ Fetching...";
        refreshBtn.disabled = true;
    }

    try {
        const token = typeof getAuthToken === "function" ? getAuthToken() : null;
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        let backendItems = [];
        try {
            const res = await fetch(`${API_BASE_URL}/api/results`, { headers });
            if (res.ok) {
                const json = await res.json();
                if (json && Array.isArray(json.data)) {
                    backendItems = json.data;
                } else if (Array.isArray(json)) {
                    backendItems = json;
                }
            }
        } catch (e) {
            console.warn("Backend /api/results fetch failed, trying /api/video/history:", e.message);
            try {
                const resHist = await fetch(`${API_BASE_URL}/api/video/history`, { headers });
                if (resHist.ok) {
                    const jsonHist = await resHist.json();
                    backendItems = jsonHist.data || [];
                }
            } catch (err2) {
                console.warn("Fallback history also unavailable:", err2.message);
            }
        }

        // Also merge any local predictions recorded in localStorage
        let localManual = [];
        try {
            localManual = JSON.parse(localStorage.getItem("manual_predictions_history") || "[]");
        } catch (e) {}

        // Combine and deduplicate by id
        const map = new Map();
        backendItems.forEach(item => {
            if (item && item.id) map.set(item.id, item);
        });
        localManual.forEach(item => {
            if (item && item.id && !map.has(item.id)) map.set(item.id, item);
        });

        allResults = Array.from(map.values());
        applyFilters();

    } catch (error) {
        console.error("Error loading results:", error);
    } finally {
        if (refreshBtn) {
            refreshBtn.textContent = "🔄 Refresh";
            refreshBtn.disabled = false;
        }
    }
}

// ============================================================
// FILTERING & SORTING
// ============================================================

function applyFilters() {
    const query = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const type = typeFilter ? typeFilter.value : "all";
    const tier = tierFilter ? tierFilter.value : "all";
    const sort = sortFilter ? sortFilter.value : "newest";

    filteredResults = allResults.filter(item => {
        // Search query
        if (query) {
            const nameMatch = (item.video_name || "").toLowerCase().includes(query);
            const idMatch = (item.id || "").toLowerCase().includes(query);
            const athleteMatch = (item.athleteName || "").toLowerCase().includes(query);
            if (!nameMatch && !idMatch && !athleteMatch) return false;
        }

        // Type filter
        const isManual = item.source === "manual" || (item.video_name && item.video_name.startsWith("Manual Prediction")) || !item.stored_filename;
        if (type === "video" && isManual) return false;
        if (type === "manual" && !isManual) return false;

        // Tier filter
        const rawTier = (item.talent_level || item.performance_label || "").toLowerCase();
        if (tier === "high" && !rawTier.includes("high") && !rawTier.includes("excellent")) return false;
        if (tier === "good" && !rawTier.includes("good") && !rawTier.includes("medium")) return false;
        if (tier === "dev" && !rawTier.includes("dev") && !rawTier.includes("fair")) return false;

        return true;
    });

    // Sorting
    filteredResults.sort((a, b) => {
        const distA = Number(a.predicted_distance) || 0;
        const distB = Number(b.predicted_distance) || 0;
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();

        if (sort === "distance_desc") return distB - distA;
        if (sort === "distance_asc") return distA - distB;
        if (sort === "oldest") return dateA - dateB;
        return dateB - dateA; // default newest
    });

    renderKPIs();
    renderGrid();
}

// ============================================================
// RENDER KPI METRICS
// ============================================================

function renderKPIs() {
    if (!kpiTotal) return;

    const total = allResults.length;
    kpiTotal.textContent = total;

    if (total === 0) {
        if (kpiBest) kpiBest.textContent = "-- m";
        if (kpiAvgAngle) kpiAvgAngle.textContent = "--°";
        if (kpiPotential) kpiPotential.textContent = "0%";
        if (kpiPotentialSub) kpiPotentialSub.textContent = "0 of 0 athletes";
        return;
    }

    // Best Distance
    const validDistances = allResults
        .map(r => Number(r.predicted_distance))
        .filter(d => !isNaN(d) && d > 0);
    const bestDist = validDistances.length > 0 ? Math.max(...validDistances) : 0;
    if (kpiBest) kpiBest.textContent = bestDist > 0 ? `${bestDist.toFixed(2)} m` : "-- m";

    // Avg Takeoff Angle
    const validAngles = allResults
        .map(r => Number(r.takeoff_angle))
        .filter(a => !isNaN(a) && a > 0);
    const avgAngle = validAngles.length > 0
        ? (validAngles.reduce((sum, v) => sum + v, 0) / validAngles.length)
        : 0;
    if (kpiAvgAngle) kpiAvgAngle.textContent = avgAngle > 0 ? `${avgAngle.toFixed(1)}°` : "--°";

    // High Potential Count
    const highPotentialCount = allResults.filter(r => {
        const lvl = (r.talent_level || r.performance_label || "").toLowerCase();
        return lvl.includes("high") || lvl.includes("excellent");
    }).length;

    const pct = total > 0 ? Math.round((highPotentialCount / total) * 100) : 0;
    if (kpiPotential) kpiPotential.textContent = `${pct}%`;
    if (kpiPotentialSub) kpiPotentialSub.textContent = `${highPotentialCount} of ${total} assessments`;
}

// ============================================================
// RENDER RESULTS GRID
// ============================================================

function renderGrid() {
    if (!resultsGrid) return;
    resultsGrid.innerHTML = "";

    if (filteredResults.length === 0) {
        if (emptyState) emptyState.classList.remove("hidden");
        return;
    }

    if (emptyState) emptyState.classList.add("hidden");

    filteredResults.forEach(item => {
        const isManual = item.source === "manual" || (item.video_name && item.video_name.startsWith("Manual Prediction")) || !item.stored_filename;
        const typeBadgeHtml = isManual
            ? `<span class="type-badge type-manual">⚡ Manual Prediction</span>`
            : `<span class="type-badge type-video">📹 Video Analysis</span>`;

        const distanceVal = Number(item.predicted_distance) || 0;
        const distanceDisplay = distanceVal > 0 ? `${distanceVal.toFixed(2)} m` : "--";

        // Talent Tier Badge
        const talentRaw = item.talent_level || item.performance_label || "Developing";
        const talentLower = talentRaw.toLowerCase();
        let talentClass = "talent-dev";
        if (talentLower.includes("high") || talentLower.includes("excellent")) {
            talentClass = "talent-high";
        } else if (talentLower.includes("good") || talentLower.includes("medium")) {
            talentClass = "talent-good";
        }

        // Formatted Date
        let dateDisplay = "Recent";
        if (item.timestamp) {
            try {
                const d = new Date(item.timestamp);
                dateDisplay = d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });
            } catch (e) {}
        }

        // Metrics
        const angleVal = item.takeoff_angle ? `${Number(item.takeoff_angle).toFixed(1)}°` : "--";
        const kneeVal = item.knee_angle ? `${Number(item.knee_angle).toFixed(1)}°` : "--";
        const flightVal = item.flight_time ? `${Number(item.flight_time).toFixed(2)}s` : "--";
        const stabilityVal = item.stability_score ? `${Number(item.stability_score).toFixed(0)}%` : "--";

        // Title
        const titleText = item.athleteName || item.video_name || (isManual ? "Manual Assessment" : "Video Jump Analysis");

        // Action Buttons
        const hasVideo = !!item.output_video_url;
        const videoBtnHtml = hasVideo
            ? `<button class="btn-card btn-play-video" onclick="openVideoPlayer('${item.id}')">▶ Watch AI Video</button>`
            : `<button class="btn-card" style="background: rgba(255,255,255,0.03); color: #64748b; cursor: not-allowed;" disabled title="No video attached for manual prediction">No Video</button>`;

        const card = document.createElement("div");
        card.className = "result-card";
        card.innerHTML = `
            <div>
                <div class="card-top">
                    ${typeBadgeHtml}
                    <span class="result-date">${dateDisplay}</span>
                </div>

                <div class="result-title" title="${escapeHtml(titleText)}">${escapeHtml(titleText)}</div>

                <div class="distance-banner">
                    <div>
                        <div class="distance-label">Predicted Distance</div>
                        <div class="distance-num">${distanceDisplay}</div>
                    </div>
                    <span class="talent-tag ${talentClass}">${escapeHtml(talentRaw)}</span>
                </div>

                <div class="metrics-chips">
                    <div class="metric-chip">
                        <span>Takeoff Angle:</span>
                        <strong>${angleVal}</strong>
                    </div>
                    <div class="metric-chip">
                        <span>Knee Angle:</span>
                        <strong>${kneeVal}</strong>
                    </div>
                    <div class="metric-chip">
                        <span>Flight Time:</span>
                        <strong>${flightVal}</strong>
                    </div>
                    <div class="metric-chip">
                        <span>Stability:</span>
                        <strong>${stabilityVal}</strong>
                    </div>
                </div>
            </div>

            <div class="card-actions">
                ${videoBtnHtml}
                <button class="btn-card btn-details" onclick="openDetailsModal('${item.id}')">🔍 Biomechanics</button>
                <button class="btn-delete" onclick="deleteResult('${item.id}')" title="Delete record">🗑</button>
            </div>
        `;

        resultsGrid.appendChild(card);
    });
}

// ============================================================
// VIDEO OVERLAY MODAL
// ============================================================

window.openVideoPlayer = function(id) {
    const item = allResults.find(r => r.id === id);
    if (!item || !item.output_video_url) {
        alert("Analyzed overlay video not available for this record.");
        return;
    }

    const rawUrl = item.output_video_url;
    const fullVideoUrl = rawUrl.startsWith("http")
        ? rawUrl
        : `${API_BASE_URL}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

    if (videoModalTitle) videoModalTitle.textContent = item.video_name || "AI Analyzed Jump Video";
    if (videoModalSub) videoModalSub.textContent = `Predicted Distance: ${item.predicted_distance ? Number(item.predicted_distance).toFixed(2) + 'm' : '--'} | Talent Tier: ${item.talent_level || 'Good'}`;

    if (modalDownloadVideoBtn) {
        modalDownloadVideoBtn.href = fullVideoUrl;
        modalDownloadVideoBtn.download = item.stored_filename || "analyzed_jump.mp4";
    }

    if (videoModalDetails) {
        videoModalDetails.innerHTML = `
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 6px; font-size: 12px;">
                <span style="color: var(--text-light);">Takeoff Angle:</span>
                <strong style="color: var(--primary);">${item.takeoff_angle ? Number(item.takeoff_angle).toFixed(1) + '°' : '--'}</strong>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 6px; font-size: 12px;">
                <span style="color: var(--text-light);">Flight Airtime:</span>
                <strong style="color: #fff;">${item.flight_time ? Number(item.flight_time).toFixed(2) + 's' : '--'}</strong>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 6px; font-size: 12px;">
                <span style="color: var(--text-light);">Stability:</span>
                <strong style="color: #fff;">${item.stability_score ? Number(item.stability_score).toFixed(0) + '%' : '--'}</strong>
            </div>
            <div style="background: rgba(255,255,255,0.04); padding: 8px 12px; border-radius: 6px; font-size: 12px;">
                <span style="color: var(--text-light);">FPS / View:</span>
                <strong style="color: #fff;">${item.fps ? Number(item.fps).toFixed(1) + ' fps' : '30 fps'} (${item.camera_view || 'front'})</strong>
            </div>
        `;
    }

    if (modalVideoPlayer) {
        modalVideoPlayer.src = fullVideoUrl;
        modalVideoPlayer.load();
        modalVideoPlayer.play().catch(e => console.log("Autoplay notice:", e));
    }

    if (videoModal) videoModal.classList.add("active");
};

// ============================================================
// BIOMECHANICS & SUGGESTIONS MODAL
// ============================================================

window.openDetailsModal = function(id) {
    const item = allResults.find(r => r.id === id);
    if (!item) return;

    if (detailsModalTitle) detailsModalTitle.textContent = item.video_name || "Biomechanical Assessment";
    if (detailsModalSub) detailsModalSub.textContent = `Forecast: ${item.predicted_distance ? Number(item.predicted_distance).toFixed(2) + 'm' : '--'} | Status: ${item.talent_level || 'Good'}`;

    // Populate Kinematics Table
    if (modalKinematicsBody) {
        const rows = [
            {
                name: "Takeoff Launch Angle",
                val: item.takeoff_angle ? `${Number(item.takeoff_angle).toFixed(1)}°` : "--",
                target: "18.0° – 23.0°",
                desc: "Equilibrium between forward runway speed preservation and vertical projectile lift."
            },
            {
                name: "Takeoff Knee Angle",
                val: item.knee_angle ? `${Number(item.knee_angle).toFixed(1)}°` : "--",
                target: "160.0° – 175.0°",
                desc: "Extension of takeoff leg; prevents knee collapse under 3-5x bodyweight board impact."
            },
            {
                name: "Takeoff Hip Angle",
                val: item.hip_angle ? `${Number(item.hip_angle).toFixed(1)}°` : "--",
                target: "165.0° – 180.0°",
                desc: "Hip extension creates upward thoracic drive into the flight trajectory."
            },
            {
                name: "Ankle Dorsiflexion Angle",
                val: item.ankle_angle ? `${Number(item.ankle_angle).toFixed(1)}°` : "--",
                target: "85.0° – 95.0°",
                desc: "Ankle joint stiffness allows spring-mass elastic energy transfer."
            },
            {
                name: "Flight Airtime",
                val: item.flight_time ? `${Number(item.flight_time).toFixed(2)}s` : "--",
                target: "0.65s – 0.85s",
                desc: "Total parabolic flight hang-time directly determining distance at a given horizontal speed."
            },
            {
                name: "Runup Approach Duration",
                val: item.runup_time ? `${Number(item.runup_time).toFixed(2)}s` : "--",
                target: "3.8s – 5.2s",
                desc: "Duration to reach terminal controllable speed before the penultimate foot plant."
            },
            {
                name: "Landing Stability Score",
                val: item.stability_score ? `${Number(item.stability_score).toFixed(1)}%` : "--",
                target: "> 90.0%",
                desc: "Efficiency of landing posture without falling backward or premature drop."
            }
        ];

        modalKinematicsBody.innerHTML = rows.map(r => `
            <tr>
                <td><strong>${r.name}</strong></td>
                <td style="color: var(--primary); font-weight: bold;">${r.val}</td>
                <td style="color: var(--text-light);">${r.target}</td>
                <td style="color: var(--text-light); font-size: 12.5px;">${r.desc}</td>
            </tr>
        `).join("");
    }

    // Populate Suggestions
    if (modalSuggestionsContainer) {
        modalSuggestionsContainer.innerHTML = "";
        const suggestions = item.suggestions || (item.feedback && item.feedback.recommendations) || [];

        if (suggestions.length === 0) {
            // Generate standard biomechanical suggestions based on recorded takeoff angle
            const angle = Number(item.takeoff_angle) || 20;
            const fallbackSuggestions = [];

            if (angle < 18) {
                fallbackSuggestions.push({
                    aspect: "Takeoff Launch Angle",
                    status: "Needs Work",
                    observation: `Recorded angle of ${angle.toFixed(1)}° is below the optimal 18°–23° window, limiting flight airtime.`,
                    tip: "Lower your Center of Mass on the penultimate stride to create a more effective upward takeoff vector."
                });
            } else if (angle > 23) {
                fallbackSuggestions.push({
                    aspect: "Takeoff Launch Angle",
                    status: "Needs Work",
                    observation: `Recorded angle of ${angle.toFixed(1)}° is too steep, causing horizontal braking on the board.`,
                    tip: "Focus on running off the board without jumping up excessively. Maintain horizontal velocity through foot strike."
                });
            } else {
                fallbackSuggestions.push({
                    aspect: "Takeoff Launch Angle",
                    status: "Optimal",
                    observation: `Excellent launch angle of ${angle.toFixed(1)}° inside the golden biomechanical window.`,
                    tip: "Maintain this approach rhythm and emphasize aggressive lead knee drive at 90 degrees."
                });
            }

            fallbackSuggestions.push({
                aspect: "Sprint Velocity & Runway Acceleration",
                status: "Good",
                observation: "Approach velocity is the primary driver (~85%) of total long jump distance.",
                tip: "Incorporate flying 30m sprints and resisted sled pulls to increase top-end controllable speed by 0.2–0.4 m/s."
            });

            renderSuggestionsList(modalSuggestionsContainer, fallbackSuggestions);
        } else {
            renderSuggestionsList(modalSuggestionsContainer, suggestions);
        }
    }

    // Populate Roadmap
    const roadmap = item.roadmap || [];
    if (modalRoadmapContainer && modalRoadmapList) {
        if (roadmap.length > 0) {
            modalRoadmapList.innerHTML = roadmap.map(r => `<li style="margin-bottom: 6px;">${escapeHtml(r)}</li>`).join("");
            modalRoadmapContainer.style.display = "block";
        } else {
            modalRoadmapContainer.style.display = "none";
        }
    }

    if (detailsModal) detailsModal.classList.add("active");
};

function renderSuggestionsList(container, suggestions) {
    container.innerHTML = suggestions.map(s => {
        const isOptimal = (s.status || "").toLowerCase() === "optimal";
        const statusBadge = isOptimal
            ? `<span style="background: rgba(56,232,165,0.15); color: #38e8a5; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">OPTIMAL</span>`
            : `<span style="background: rgba(245,158,11,0.15); color: #fbbf24; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold;">NEEDS WORK</span>`;

        return `
            <div class="modal-sug-card">
                <div class="modal-sug-header">
                    <strong>${escapeHtml(s.aspect || s.area || "Kinematic Adjustment")}</strong>
                    ${statusBadge}
                </div>
                <div class="modal-sug-body">${escapeHtml(s.observation || s.note || s.message || "")}</div>
                ${s.tip ? `<div class="modal-sug-tip">💡 <strong>Coach Cue:</strong> ${escapeHtml(s.tip)}</div>` : ""}
            </div>
        `;
    }).join("");
}

// ============================================================
// DELETE SINGLE RESULT
// ============================================================

window.deleteResult = async function(id) {
    if (!confirm("Are you sure you want to delete this assessment record?")) return;

    try {
        const token = typeof getAuthToken === "function" ? getAuthToken() : null;
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        await fetch(`${API_BASE_URL}/api/video/history/${id}`, {
            method: "DELETE",
            headers
        });

        // Also remove from localStorage if present
        try {
            let local = JSON.parse(localStorage.getItem("manual_predictions_history") || "[]");
            local = local.filter(x => x.id !== id);
            localStorage.setItem("manual_predictions_history", JSON.stringify(local));
        } catch (e) {}

        allResults = allResults.filter(r => r.id !== id);
        applyFilters();

    } catch (e) {
        console.error("Delete error:", e);
        alert("Failed to delete record: " + e.message);
    }
};

// ============================================================
// CLEAR ALL RESULTS
// ============================================================

async function handleClearAll() {
    if (!confirm("Are you sure you want to clear all assessment history? This cannot be undone.")) return;

    try {
        const token = typeof getAuthToken === "function" ? getAuthToken() : null;
        const headers = token ? { "Authorization": `Bearer ${token}` } : {};

        await fetch(`${API_BASE_URL}/api/video/history`, {
            method: "DELETE",
            headers
        });

        localStorage.removeItem("manual_predictions_history");
        allResults = [];
        applyFilters();

    } catch (e) {
        console.error("Clear all error:", e);
        alert("Failed to clear records: " + e.message);
    }
}

// Helper: Escape HTML
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
