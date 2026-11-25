// ============================================================
// ADMIN ATHLETE MANAGEMENT SCRIPT
// ============================================================

let currentAthletes = [];

const searchInput = document.getElementById("searchAthlete");
const talentFilter = document.getElementById("talentFilter");
const sortSelect = document.getElementById("sortAthletes");
const athleteList = document.getElementById("athleteList");
const emptyState = document.getElementById("emptyState");

async function loadAthletes() {
    const token = getAuthToken();

    try {
        const response = await fetch("/api/admin/athletes", {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            // Fallback to public endpoint
            const fallbackRes = await fetch("/api/athletes");
            const fallbackData = await fallbackRes.json();
            currentAthletes = fallbackData.data || [];
        } else {
            const resData = await response.json();
            currentAthletes = resData.data || [];
        }

        renderAthletesList(currentAthletes);
        updateSummaryStats(currentAthletes);

    } catch (e) {
        console.error("Load Athletes Error:", e);
    }
}

function updateSummaryStats(athletes) {
    const totalElem = document.getElementById("totalAthletes");
    if (totalElem) totalElem.textContent = athletes.length;

    let highCount = 0;
    let totalBest = 0;
    let bestCount = 0;
    let absoluteBest = 0;

    athletes.forEach(a => {
        if (a.talentLevel && a.talentLevel.toLowerCase().includes("high")) highCount++;
        const j = parseFloat(a.bestJump);
        if (!isNaN(j)) {
            totalBest += j;
            bestCount++;
            if (j > absoluteBest) absoluteBest = j;
        }
    });

    const highPill = document.querySelector(".summary-card .green");
    if (highPill) highPill.textContent = highCount;

    const avgPill = document.querySelectorAll(".summary-card strong")[2];
    if (avgPill && bestCount > 0) avgPill.textContent = `${(totalBest / bestCount).toFixed(2)} m`;

    const bestPill = document.querySelectorAll(".summary-card strong")[3];
    if (bestPill && absoluteBest > 0) bestPill.textContent = `${absoluteBest.toFixed(2)} m`;
}

function renderAthletesList(athletes) {
    if (!athleteList) return;
    athleteList.innerHTML = "";

    if (athletes.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
    }
    if (emptyState) emptyState.style.display = "none";

    athletes.forEach(athlete => {
        const initials = athlete.name
            ? athlete.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
            : "AT";

        const talentKey = (athlete.talentLevel || athlete.talent || "Medium Potential").toLowerCase();
        const isHigh = talentKey.includes("high");
        const isDev = talentKey.includes("dev");

        const badgeClass = isHigh ? "high-badge" : (isDev ? "developing-badge" : "medium-badge");
        const textClass = isHigh ? "green" : (isDev ? "developing-text" : "medium-text");
        const talentLabel = isHigh ? "High Potential" : (isDev ? "Developing" : "Medium Potential");

        const jumpVal = athlete.bestJump && athlete.bestJump !== "--" ? `${athlete.bestJump} m` : "--";
        const isActive = athlete.status !== "inactive";

        const row = document.createElement("div");
        row.className = "athlete-row";
        row.dataset.name = (athlete.name || "").toLowerCase();
        row.dataset.talent = isHigh ? "high" : (isDev ? "developing" : "medium");
        row.dataset.jump = parseFloat(athlete.bestJump) || 0;
        row.dataset.status = athlete.status || "active";

        row.innerHTML = `
            <div class="athlete-cell-name">
                <div class="athlete-avatar">${initials}</div>
                <div>
                    <strong>${athlete.name || 'Athlete'}</strong>
                    <span>${athlete.age || '--'} yrs · ${athlete.gender || 'Athlete'} · @${athlete.username || 'user'}</span>
                </div>
            </div>
            <span>${athlete.submissionsCount != null ? athlete.submissionsCount + ' tests' : '--'}</span>
            <strong>${jumpVal}</strong>
            <strong class="${textClass}">${talentLabel}</strong>
            <span>
                <button type="button" class="badge" style="cursor: pointer; background: ${isActive ? 'rgba(56, 232, 165, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${isActive ? 'var(--primary)' : '#fca5a5'}; border: 1px solid ${isActive ? 'var(--primary)' : '#fca5a5'};" onclick="toggleStatus('${athlete.userId}', '${athlete.status || 'active'}')">
                    ${isActive ? 'Active' : 'Inactive'}
                </button>
            </span>
            <button class="view-button" onclick="viewAthleteSubmissions('${athlete.userId}')">Submissions →</button>
        `;

        athleteList.appendChild(row);
    });
}

async function toggleStatus(athleteId, currentStatus) {
    const token = getAuthToken();
    const newStatus = currentStatus === "inactive" ? "active" : "inactive";

    try {
        const response = await fetch(`/api/admin/athletes/${athleteId}/status`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error("Status update failed");

        // Reload list
        loadAthletes();

    } catch (e) {
        alert("Could not update athlete status: " + e.message);
    }
}

function viewAthleteSubmissions(athleteId) {
    window.location.href = `admin-submissions.html?athleteId=${athleteId}`;
}

// Live Filter & Search
function filterAthletes() {
    if (!searchInput || !talentFilter) return;

    const q = searchInput.value.toLowerCase().trim();
    const t = talentFilter.value.toLowerCase();

    const filtered = currentAthletes.filter(a => {
        const nameMatch = (a.name && a.name.toLowerCase().includes(q)) || (a.username && a.username.toLowerCase().includes(q));
        const tLevel = (a.talentLevel || "").toLowerCase();
        const talentMatch = t === "all" ||
            (t === "high" && tLevel.includes("high")) ||
            (t === "medium" && tLevel.includes("medium")) ||
            (t === "developing" && tLevel.includes("dev"));

        return nameMatch && talentMatch;
    });

    renderAthletesList(filtered);
}

if (searchInput) searchInput.addEventListener("input", filterAthletes);
if (talentFilter) talentFilter.addEventListener("change", filterAthletes);
if (sortSelect) {
    sortSelect.addEventListener("change", () => {
        const val = sortSelect.value;
        if (val === "name") {
            currentAthletes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        } else if (val === "jump") {
            currentAthletes.sort((a, b) => (parseFloat(b.bestJump) || 0) - (parseFloat(a.bestJump) || 0));
        }
        filterAthletes();
    });
}

document.addEventListener("DOMContentLoaded", loadAthletes);