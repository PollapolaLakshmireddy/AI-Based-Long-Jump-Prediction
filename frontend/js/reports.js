// ============================================================
// REPORTS GENERATION & EXPORT SCRIPT (CSV & PRINT/PDF)
// ============================================================

console.log("Reports page script initialized");

const reportSearch = document.getElementById("reportSearch");
const reportType = document.getElementById("reportType");
const reportSort = document.getElementById("reportSort");
const reportList = document.getElementById("reportList");
const reportEmpty = document.getElementById("reportEmpty");

let dynamicReports = [];

async function loadReports() {
    const token = getAuthToken();

    try {
        const response = await fetch("/api/admin/reports/summary", {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (response.ok) {
            const resData = await response.json();
            dynamicReports = resData.reports || [];
            if (dynamicReports.length > 0) {
                renderDynamicReports(dynamicReports);
                updateSummaryCounters(dynamicReports);
            }
        }
    } catch (e) {
        console.warn("Could not load backend reports, keeping existing cards:", e);
    }
}

function updateSummaryCounters(reports) {
    const totalEl = document.querySelectorAll(".report-summary-card strong")[0];
    if (totalEl) totalEl.textContent = reports.length;

    const highEl = document.querySelectorAll(".report-summary-card strong")[2];
    const highCount = reports.filter(r => (r.prediction?.talent_level || '').toLowerCase().includes('high')).length;
    if (highEl) highEl.textContent = highCount;
}

function renderDynamicReports(reports) {
    if (!reportList) return;
    reportList.innerHTML = "";

    reports.forEach(rep => {
        const row = document.createElement("div");
        row.className = "report-row";
        row.dataset.name = (rep.athleteName || "").toLowerCase();
        row.dataset.type = "prediction";

        const dist = rep.prediction?.predicted_distance ? `${Number(rep.prediction.predicted_distance).toFixed(2)} m` : "--";
        const talent = rep.prediction?.talent_level || "Developing";

        row.innerHTML = `
            <div class="report-icon">AI</div>
            <div class="report-main">
                <strong>${rep.athleteName} — Performance Assessment</strong>
                <span>Predicted Jump: ${dist} • Takeoff Angle: ${rep.metrics?.takeoff_angle_deg ? Number(rep.metrics.takeoff_angle_deg).toFixed(1) + '°' : '--'}</span>
            </div>
            <div class="report-type prediction-type">${talent}</div>
            <div class="report-date">${rep.date}</div>
            <div class="report-actions">
                <button class="view-report-button" onclick="openReportObj('${rep.id}')">View</button>
            </div>
        `;

        reportList.appendChild(row);
    });
}

function openReportObj(reportId) {
    const rep = dynamicReports.find(r => r.id === reportId);
    if (!rep) return;

    const preview = document.getElementById("reportPreview");
    if (!preview) return;

    setText("previewTitle", `${rep.athleteName} — Talent Assessment Report`);
    setText("previewAthlete", rep.athleteName);
    setText("previewDate", rep.date);

    const perf = rep.metrics || {};
    const pred = rep.prediction || {};
    const feed = rep.feedback || {};

    const values = preview.querySelectorAll(".preview-stat-card strong");
    if (values.length >= 4) {
        values[0].textContent = pred.predicted_distance ? `${Number(pred.predicted_distance).toFixed(2)} m` : "--";
        values[1].textContent = perf.takeoff_angle_deg ? `${Number(perf.takeoff_angle_deg).toFixed(1)}°` : "--";
        values[2].textContent = `${pred.confidence_percent ? Number(pred.confidence_percent).toFixed(0) : '90'}%`;
        values[3].textContent = pred.talent_level || "High Potential";
    }

    const recP = preview.querySelector(".preview-recommendation p:nth-child(2)");
    if (recP && feed.recommendations && feed.recommendations.length > 0) {
        recP.textContent = feed.recommendations.join(" ");
    }

    preview.classList.add("show");
    preview.scrollIntoView({ behavior: "smooth" });
}

// Filter Reports
function filterReports() {
    if (!reportSearch || !reportType || !reportList) return;

    const search = reportSearch.value.toLowerCase().trim();
    const type = reportType.value;
    const rows = Array.from(reportList.querySelectorAll(".report-row"));

    let visible = 0;

    rows.forEach(function (row) {
        const name = (row.dataset.name || "").toLowerCase();
        const rowType = row.dataset.type || "all";

        const searchMatch = name.includes(search);
        const typeMatch = type === "all" || rowType === type;

        if (searchMatch && typeMatch) {
            row.style.display = "grid";
            visible++;
        } else {
            row.style.display = "none";
        }
    });

    if (reportEmpty) {
        reportEmpty.style.display = visible === 0 ? "block" : "none";
    }
}

// Download CSV Report
const downloadBtn = document.getElementById("downloadReport");
if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
        const token = getAuthToken();
        const url = token ? `/api/admin/reports/csv?token=${token}` : `/api/admin/reports/csv`;

        // Direct browser download
        const a = document.createElement("a");
        a.href = url;
        a.download = `sports_talent_assessment_report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}

// Print / PDF Report
const printBtn = document.getElementById("printReport");
if (printBtn) {
    printBtn.addEventListener("click", () => {
        window.print();
    });
}

// Generate New Report button -> redirects to video analysis
const genBtn = document.getElementById("generateReport");
if (genBtn) {
    genBtn.addEventListener("click", () => {
        window.location.href = "video-analysis.html";
    });
}

// Close Preview
const closePrevBtn = document.getElementById("closePreview");
if (closePrevBtn) {
    closePrevBtn.addEventListener("click", () => {
        const preview = document.getElementById("reportPreview");
        if (preview) preview.classList.remove("show");
    });
}

if (reportSearch) reportSearch.addEventListener("input", filterReports);
if (reportType) reportType.addEventListener("change", filterReports);
if (reportSort) {
    reportSort.addEventListener("change", () => {
        const rows = Array.from(reportList.querySelectorAll(".report-row"));
        if (reportSort.value === "name") {
            rows.sort((a, b) => (a.dataset.name || "").localeCompare(b.dataset.name || ""));
            rows.forEach(r => reportList.appendChild(r));
        }
    });
}

document.addEventListener("DOMContentLoaded", loadReports);

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}