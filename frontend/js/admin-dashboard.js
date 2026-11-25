// ============================================================
// ADMIN DASHBOARD SCRIPT
// ============================================================

async function loadAdminDashboard() {
    const token = getAuthToken();
    const role = getAuthRole();

    if (!token || role !== "admin") {
        window.location.href = "login.html";
        return;
    }

    try {
        const response = await fetch("/api/admin/dashboard-stats", {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Failed to load admin stats (HTTP ${response.status})`);
        }

        const resData = await response.json();
        const stats = resData.stats || {};
        const talent = resData.talentDistribution || {};
        const recent = resData.recentSubmissions || [];

        // 1. Stats Counters
        setText("totalAthletesCount", stats.totalAthletes ?? 0);
        setText("totalSubmissionsCount", stats.totalSubmissions ?? 0);
        setText("completedAssessmentsCount", stats.completedAssessments ?? 0);
        setText("failedAssessmentsCount", stats.failedAssessments ?? 0);

        // 2. Talent Distribution
        const high = talent.high || 0;
        const med = talent.medium || 0;
        const dev = talent.developing || 0;
        const totalTalent = Math.max(high + med + dev, 1);

        setText("talentHighCount", high);
        setText("talentMedCount", med);
        setText("talentDevCount", dev);

        setBarWidth("barHigh", (high / totalTalent) * 100);
        setBarWidth("barMed", (med / totalTalent) * 100);
        setBarWidth("barDev", (dev / totalTalent) * 100);

        // 3. Recent Submissions Table
        renderRecentSubmissions(recent);

    } catch (e) {
        console.error("Admin Dashboard Error:", e);
    }
}

function renderRecentSubmissions(list) {
    const tbody = document.getElementById("recentSubmissionsBody");
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-light); padding: 20px;">No recent submissions.</td></tr>`;
        return;
    }

    tbody.innerHTML = "";

    list.forEach(item => {
        const tr = document.createElement("tr");

        const perf = item.result?.performance || {};
        const pred = item.result?.prediction || {};

        const angle = perf.takeoff_angle_deg != null ? `${Number(perf.takeoff_angle_deg).toFixed(1)}°` : "--";
        const dist = pred.predicted_distance != null ? `${Number(pred.predicted_distance).toFixed(2)} m` : "--";
        const dateStr = item.timestamp ? item.timestamp.split("T")[0] : "--";

        const statusClass = item.status === "completed" ? "style='color: var(--primary);'" : (item.status === "failed" ? "style='color: #fca5a5;'" : "style='color: #fbbf24;'");

        tr.innerHTML = `
            <td><strong>${item.athleteName || 'Athlete'}</strong></td>
            <td><small style="color: var(--text-light);">${item.testTitle || item.videoOriginalName || 'Test'}</small></td>
            <td><span ${statusClass}>● ${item.status}</span></td>
            <td>${angle}</td>
            <td><strong>${dist}</strong></td>
            <td><small style="color: var(--text-light);">${dateStr}</small></td>
        `;

        tbody.appendChild(tr);
    });
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setBarWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.min(Math.max(pct, 5), 100)}%`;
}

document.addEventListener("DOMContentLoaded", loadAdminDashboard);
