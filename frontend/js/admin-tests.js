// ============================================================
// ADMIN TESTS & INSTRUCTIONS SCRIPT
// ============================================================

let currentTests = [];
let currentInstructions = [];

const tabTests = document.getElementById("tabManageTests");
const tabInstructions = document.getElementById("tabManageInstructions");
const secTests = document.getElementById("sectionTests");
const secInstructions = document.getElementById("sectionInstructions");

tabTests.addEventListener("click", () => {
    tabTests.classList.add("active");
    tabInstructions.classList.remove("active");
    secTests.classList.remove("hidden");
    secInstructions.classList.add("hidden");
});

tabInstructions.addEventListener("click", () => {
    tabInstructions.classList.add("active");
    tabTests.classList.remove("active");
    secInstructions.classList.remove("hidden");
    secTests.classList.add("hidden");
});

async function loadTestsAndInstructions() {
    const token = getAuthToken();
    const role = getAuthRole();

    if (!token || role !== "admin") {
        window.location.href = "login.html";
        return;
    }

    try {
        // Load Tests
        const resTests = await fetch("/api/admin/tests", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const dTests = await resTests.json();
        currentTests = dTests.data || [];
        renderTests(currentTests);
        populateTestSelect(currentTests);

        // Load Instructions
        const resInst = await fetch("/api/admin/instructions", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const dInst = await resInst.json();
        currentInstructions = dInst.data || [];
        renderInstructions(currentInstructions);

    } catch (e) {
        console.error("Load Error:", e);
    }
}

function renderTests(tests) {
    const grid = document.getElementById("testsGrid");
    if (!grid) return;

    if (tests.length === 0) {
        grid.innerHTML = `<div style="color: var(--text-light); padding: 30px;">No tests created yet.</div>`;
        return;
    }

    grid.innerHTML = "";

    tests.forEach(test => {
        const card = document.createElement("div");
        card.className = "test-card";

        const isActive = test.status === "active";
        const badgeClass = isActive ? "badge-active" : "badge-inactive";

        card.innerHTML = `
            <div>
                <div class="test-card-top">
                    <div>
                        <h3>${test.title}</h3>
                        <small style="color: var(--primary);">${test.category || 'General'}</small>
                    </div>
                    <span class="${badgeClass}">${isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <p>${test.description || 'No description provided.'}</p>
                <div style="font-size: 13px; color: var(--text-light); margin-bottom: 16px;">
                    <div>⏱ Duration: <strong>${test.durationMinutes || 15} mins</strong></div>
                    <div>📐 Criteria: <strong>${test.criteria || 'Standard'}</strong></div>
                </div>
            </div>
            <div style="display: flex; gap: 10px; border-top: 1px solid var(--border); padding-top: 14px;">
                <button type="button" class="btn-toggle" onclick="toggleTestStatus('${test.id}', '${test.status}')">
                    ${isActive ? 'Deactivate Test' : 'Activate Test'}
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

async function toggleTestStatus(testId, currentStatus) {
    const token = getAuthToken();
    const newStatus = currentStatus === "active" ? "inactive" : "active";

    try {
        const res = await fetch(`/api/admin/tests/${testId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        const d = await res.json();
        if (d.success) loadTestsAndInstructions();
    } catch (e) {
        alert("Failed to toggle test: " + e.message);
    }
}

// Create Test Form
const createTestForm = document.getElementById("createTestForm");
if (createTestForm) {
    createTestForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = getAuthToken();

        const payload = {
            title: document.getElementById("testTitle").value.trim(),
            category: document.getElementById("testCategory").value,
            description: document.getElementById("testDescription").value.trim(),
            criteria: document.getElementById("testCriteria").value.trim(),
            durationMinutes: Number(document.getElementById("testDuration").value)
        };

        try {
            const res = await fetch("/api/admin/tests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const d = await res.json();
            if (d.success) {
                alert("✅ Test published successfully!");
                createTestForm.reset();
                loadTestsAndInstructions();
            } else {
                alert("Error: " + d.message);
            }
        } catch (err) {
            alert("Create failed: " + err.message);
        }
    });
}

function populateTestSelect(tests) {
    const sel = document.getElementById("instTestSelect");
    if (!sel) return;
    sel.innerHTML = `<option value="general">General Long Jump Test</option>`;
    tests.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.title;
        sel.appendChild(opt);
    });
}

function renderInstructions(instList) {
    const listEl = document.getElementById("currentInstructionsList");
    if (!listEl) return;

    if (instList.length === 0) {
        listEl.innerHTML = `<div style="color: var(--text-light); padding: 20px;">No instructions defined.</div>`;
        return;
    }

    listEl.innerHTML = "";

    instList.forEach(inst => {
        const item = document.createElement("div");
        item.style.background = "var(--card)";
        item.style.border = "1px solid var(--border)";
        item.style.borderRadius = "12px";
        item.style.padding = "20px";
        item.style.marginBottom = "16px";

        const steps = (inst.steps || []).map(s => `<li>${s}</li>`).join("");

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <h3 style="color: var(--primary); margin: 0;">${inst.title}</h3>
                <small style="color: var(--text-light);">Updated: ${inst.lastUpdated ? inst.lastUpdated.split('T')[0] : '--'}</small>
            </div>
            <p style="color: var(--text-light); font-size: 14px; margin-bottom: 12px;">${inst.summary || ''}</p>
            <ol style="padding-left: 20px; color: var(--text); font-size: 13px; line-height: 1.6;">${steps}</ol>
        `;

        listEl.appendChild(item);
    });
}

// Add/Update Instructions Form
const instructionsForm = document.getElementById("instructionsForm");
if (instructionsForm) {
    instructionsForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = getAuthToken();

        const testId = document.getElementById("instTestSelect").value;
        const title = document.getElementById("instTitle").value.trim();
        const summary = document.getElementById("instSummary").value.trim();

        const rawSteps = document.getElementById("instSteps").value.trim();
        const steps = rawSteps ? rawSteps.split("\n").map(s => s.trim()).filter(Boolean) : [];

        const rawReqs = document.getElementById("instRequirements").value.trim();
        const requirements = rawReqs ? rawReqs.split(",").map(r => r.trim()).filter(Boolean) : [];

        const rawTips = document.getElementById("instTips").value.trim();
        const tips = rawTips ? rawTips.split(",").map(t => t.trim()).filter(Boolean) : [];

        const payload = { testId, title, summary, steps, requirements, tips };

        try {
            const res = await fetch("/api/admin/instructions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            const d = await res.json();
            if (d.success) {
                alert("✅ Instructions updated! Athletes will now see these guidelines on their instructions page.");
                instructionsForm.reset();
                loadTestsAndInstructions();
            } else {
                alert("Error: " + d.message);
            }
        } catch (err) {
            alert("Save failed: " + err.message);
        }
    });
}

document.addEventListener("DOMContentLoaded", loadTestsAndInstructions);
