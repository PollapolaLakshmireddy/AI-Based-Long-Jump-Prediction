// ============================================================
// ADMIN SUBMISSIONS MANAGEMENT SCRIPT
// ============================================================

let allSubmissions = [];

async function loadAllSubmissions() {
    const token = getAuthToken();
    const role = getAuthRole();

    if (!token || role !== "admin") {
        window.location.href = "login.html";
        return;
    }

    // Check if query parameter has athleteId filter
    const urlParams = new URLSearchParams(window.location.search);
    const athleteIdParam = urlParams.get("athleteId");

    let url = "/api/admin/submissions";
    if (athleteIdParam) {
        url += `?athleteId=${athleteIdParam}`;
    }

    try {
        const response = await fetch(url, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to load submissions");

        const resData = await response.json();
        allSubmissions = resData.data || [];

        renderSubmissions(allSubmissions);

        const countEl = document.getElementById("totalSubsCount");
        if (countEl) countEl.textContent = allSubmissions.length;

    } catch (e) {
        console.error("Submissions Load Error:", e);
    }
}

function renderSubmissions(list) {
    const tbody = document.getElementById("adminSubsTableBody");
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-light); padding: 30px;">No submissions found matching criteria.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    list.forEach(item => {
        const tr = document.createElement("tr");

        const dateStr = item.timestamp ? item.timestamp.split("T")[0] : "--";
        const athleteName = item.athleteName || "Athlete";
        const testTitle = item.testTitle || item.videoOriginalName || "Long Jump Test";
        const status = item.status || "completed";

        const perf = item.result?.performance || {};
        const pred = item.result?.prediction || {};

        const angle = perf.takeoff_angle_deg != null ? `${Number(perf.takeoff_angle_deg).toFixed(1)}°` : "--";
        const dist = pred.predicted_distance != null ? `<strong>${Number(pred.predicted_distance).toFixed(2)} m</strong>` : "--";
        const talent = pred.talent_level || "--";

        const statusClass = status === "completed" ? "status-completed" : (status === "processing" ? "status-processing" : "status-failed");

        tr.innerHTML = `
            <td><small style="color: var(--text-light);">${dateStr}</small></td>
            <td><strong>${athleteName}</strong></td>
            <td>${testTitle}</td>
            <td><span class="status-badge ${statusClass}">${status}</span></td>
            <td>${angle}</td>
            <td>${dist}</td>
            <td><span style="color: var(--primary);">${talent}</span></td>
            <td>
                <button type="button" class="btn-inspect" onclick="openAdminModal('${item.id}')">
                    Analyze AI Result →
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function openAdminModal(submissionId) {
    const item = allSubmissions.find(s => s.id === submissionId);
    if (!item) return;

    const modal = document.getElementById("adminModal");
    if (!modal) return;

    setText("admModalTitle", `${item.athleteName || 'Athlete'} — ${item.testTitle || 'Long Jump Test'}`);
    setText("admModalMeta", `ID: ${item.id} • Submitted: ${item.timestamp || '--'} • Status: ${item.status}`);

    const res = item.result || {};
    const perf = res.performance || {};
    const phase = res.jump_phase || {};
    const pred = res.prediction || {};
    const det = res.detection || {};
    const feedback = res.feedback || {};

    setText("admAngle", perf.takeoff_angle_deg != null ? `${Number(perf.takeoff_angle_deg).toFixed(1)}°` : "--");
    setText("admKnee", perf.takeoff_knee_angle_deg != null ? `${Number(perf.takeoff_knee_angle_deg).toFixed(1)}°` : "--");
    setText("admHip", perf.takeoff_hip_angle_deg != null ? `${Number(perf.takeoff_hip_angle_deg).toFixed(1)}°` : "--");
    setText("admFlight", perf.flight_time_sec != null ? `${Number(perf.flight_time_sec).toFixed(2)} s` : "--");
    setText("admStability", perf.landing_stability_score != null ? `${Number(perf.landing_stability_score).toFixed(1)}%` : "--");
    setText("admDist", pred.predicted_distance != null ? `${Number(pred.predicted_distance).toFixed(2)} m` : "--");

    setText("admTakeoffTime", phase.takeoff_time_sec != null ? `${Number(phase.takeoff_time_sec).toFixed(2)} s` : "--");
    setText("admLandingTime", phase.landing_time_sec != null ? `${Number(phase.landing_time_sec).toFixed(2)} s` : "--");
    setText("admPoseConfidence", det.pose_confidence_percent != null ? `${Number(det.pose_confidence_percent).toFixed(1)}%` : "--");
    setText("admTalent", pred.talent_level || "Under Review");

    setText("admFeedbackSummary", feedback.summary || (item.error ? `Error: ${item.error}` : "Analysis processed successfully."));

    const recsList = document.getElementById("admRecommendationsList");
    if (recsList) {
        recsList.innerHTML = "";
        const items = feedback.recommendations || [];
        if (items.length > 0) {
            items.forEach(r => {
                const li = document.createElement("li");
                li.textContent = r;
                recsList.appendChild(li);
            });
        } else {
            recsList.innerHTML = "<li>No specific adjustments flagged.</li>";
        }
    }

    // Video Player
    const videoUrl = item.videoUrl || res.output_video_url;
    const videoBox = document.getElementById("admVideoContainer");
    const player = document.getElementById("admVideoPlayer");

    if (videoUrl && player && videoBox) {
        player.src = videoUrl;
        videoBox.classList.remove("hidden");
    } else if (videoBox) {
        videoBox.classList.add("hidden");
    }

    modal.classList.remove("hidden");
}

function closeAdminModal() {
    const modal = document.getElementById("adminModal");
    const player = document.getElementById("admVideoPlayer");
    if (player) {
        player.pause();
        player.src = "";
    }
    if (modal) modal.classList.add("hidden");
}

// Search and Status Filters
const searchInput = document.getElementById("subSearch");
const statusFilter = document.getElementById("statusFilter");

function filterSubmissions() {
    const q = searchInput.value.toLowerCase().trim();
    const st = statusFilter.value;

    const filtered = allSubmissions.filter(s => {
        const textMatch = (s.athleteName && s.athleteName.toLowerCase().includes(q)) ||
            (s.testTitle && s.testTitle.toLowerCase().includes(q)) ||
            (s.videoOriginalName && s.videoOriginalName.toLowerCase().includes(q));

        const statusMatch = st === "all" || s.status === st;

        return textMatch && statusMatch;
    });

    renderSubmissions(filtered);
}

if (searchInput) searchInput.addEventListener("input", filterSubmissions);
if (statusFilter) statusFilter.addEventListener("change", filterSubmissions);

// Video Cleanup Button
const cleanupBtn = document.getElementById("btnCleanupVideos");
if (cleanupBtn) {
    cleanupBtn.addEventListener("click", async () => {
        if (!confirm("Run server cleanup for temporary video files?")) return;
        const token = getAuthToken();
        try {
            const res = await fetch("/api/admin/cleanup-videos?maxAgeHours=1", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` }
            });
            const d = await res.json();
            alert(`✅ ${d.message}`);
        } catch (e) {
            alert("Cleanup failed: " + e.message);
        }
    });
}

const closeBtn = document.getElementById("closeAdminModal");
if (closeBtn) closeBtn.addEventListener("click", closeAdminModal);

document.addEventListener("DOMContentLoaded", loadAllSubmissions);

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}
