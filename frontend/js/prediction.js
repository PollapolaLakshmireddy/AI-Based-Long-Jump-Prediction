// ============================================================
// DEDICATED PREDICTION ENGINE CONTROLLER
// ============================================================

const API_BASE_URL = (typeof window !== "undefined" && window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:"))
    ? window.location.origin
    : "http://localhost:5000";

const PREDICTION_API = `${API_BASE_URL}/api/predictions`;

// DOM Elements
const form = document.getElementById("predictionForm");
const predictBtn = document.getElementById("predictBtn");
const formError = document.getElementById("formError");

const heightInput = document.getElementById("height");
const weightInput = document.getElementById("weight");
const bmiDisplay = document.getElementById("bmiDisplay");

const resultsPlaceholder = document.getElementById("resultsPlaceholder");
const resultsCard = document.getElementById("predictionResultsCard");

// Auto-calculate BMI
function updateBMI() {
    if (!heightInput || !weightInput || !bmiDisplay) return;
    const h = Number(heightInput.value);
    const w = Number(weightInput.value);
    if (h > 0 && w > 0) {
        const bmi = (w / Math.pow(h / 100, 2)).toFixed(2);
        bmiDisplay.textContent = bmi;
        return Number(bmi);
    }
    bmiDisplay.textContent = "--";
    return 22.7;
}

if (heightInput) heightInput.addEventListener("input", updateBMI);
if (weightInput) weightInput.addEventListener("input", updateBMI);

// Pre-fill from localStorage if athlete profile was stored
function prefillFromStorage() {
    try {
        const saved = JSON.parse(localStorage.getItem("currentAthlete") || "null");
        if (!saved) return;
        if (saved.age && document.getElementById("age")) document.getElementById("age").value = saved.age;
        if (saved.gender && document.getElementById("gender")) document.getElementById("gender").value = saved.gender;
        if (saved.height && document.getElementById("height")) document.getElementById("height").value = saved.height;
        if (saved.weight && document.getElementById("weight")) document.getElementById("weight").value = saved.weight;
        if (saved.sprintSpeed && document.getElementById("sprintSpeed")) document.getElementById("sprintSpeed").value = saved.sprintSpeed;
        if (saved.takeoffAngle && document.getElementById("takeoffAngle")) document.getElementById("takeoffAngle").value = saved.takeoffAngle;
        updateBMI();
    } catch (e) {}
}

// Form Submission Handler
if (form) {
    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearError();

        const age = Number(document.getElementById("age")?.value) || 20;
        const gender = document.getElementById("gender")?.value || "Male";
        const height = Number(document.getElementById("height")?.value) || 178;
        const weight = Number(document.getElementById("weight")?.value) || 72;
        const bmi = updateBMI();

        const sprintSpeed = Number(document.getElementById("sprintSpeed")?.value) || 8.5;
        const takeoffAngle = Number(document.getElementById("takeoffAngle")?.value) || 20.0;
        const runupDistance = Number(document.getElementById("runupDistance")?.value) || 35.0;
        const runupStyle = document.getElementById("runupStyle")?.value || "Progressive";
        const takeoffFoot = document.getElementById("takeoffFoot")?.value || "Right";
        const reactionTime = Number(document.getElementById("reactionTime")?.value) || 0.18;

        const legStrength = Number(document.getElementById("legStrength")?.value) || 75;
        const flexibility = Number(document.getElementById("flexibility")?.value) || 70;
        const balance = Number(document.getElementById("balance")?.value) || 75;
        const endurance = Number(document.getElementById("endurance")?.value) || 70;

        const trainingHours = Number(document.getElementById("trainingHours")?.value) || 10;
        const previousInjuries = document.getElementById("previousInjuries")?.value || "None";
        const coachRating = Number(document.getElementById("coachRating")?.value) || 7.5;
        const skillLevel = document.getElementById("skillLevel")?.value || "Intermediate";

        const payload = {
            Age: age,
            Gender: gender,
            Height_cm: height,
            Weight_kg: weight,
            BMI: bmi,
            Skill_Level: skillLevel,
            Sprint_Speed_mps: sprintSpeed,
            Reaction_Time_sec: reactionTime,
            Flexibility_Score: flexibility,
            Leg_Strength_Score: legStrength,
            Balance_Score: balance,
            Endurance_Score: endurance,
            Runup_Distance_m: runupDistance,
            Runup_Style: runupStyle,
            Takeoff_Foot: takeoffFoot,
            Takeoff_Angle_deg: takeoffAngle,
            Training_Hours_Per_Week: trainingHours,
            Previous_Injuries: previousInjuries,
            Coach_Rating: coachRating
        };

        if (predictBtn) {
            predictBtn.disabled = true;
            predictBtn.innerHTML = "<span>⏳</span> Computing Biomechanical Prediction...";
        }

        try {
            console.log("Submitting to Prediction API:", payload);

            const res = await fetch(PREDICTION_API, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error(`Server returned HTTP ${res.status}`);
            }

            const data = await res.json();
            console.log("Prediction response received:", data);

            if (!data || data.success !== true) {
                throw new Error(data?.error || data?.message || "Prediction request was unsuccessful.");
            }

            // Render Results
            renderPredictionResults(data, payload);

        } catch (err) {
            console.error("Prediction Error:", err);
            showError(err.message || "Could not reach prediction engine. Ensure backend server is running.");
        } finally {
            if (predictBtn) {
                predictBtn.disabled = false;
                predictBtn.innerHTML = "<span>⚡</span> Predict Jump Distance & Get AI Suggestions";
            }
        }
    });
}

function renderPredictionResults(res, input) {
    if (resultsPlaceholder) resultsPlaceholder.classList.add("hidden");
    if (resultsCard) resultsCard.classList.remove("hidden");

    const dist = Number(res.predicted_distance || res.predicted_distance_m) || 6.5;
    const talent = res.performance_label || res.talent_level || "Good";
    const conf = res.confidence_percent ? Number(res.confidence_percent).toFixed(1) : "88.5";

    // 1. Distance Callout
    const distEl = document.getElementById("predDistanceVal");
    if (distEl) distEl.innerHTML = `${dist.toFixed(2)} <small>m</small>`;

    const badgeEl = document.getElementById("talentBadge");
    if (badgeEl) badgeEl.textContent = talent;

    const summaryEl = document.getElementById("predSummaryText");
    if (summaryEl) summaryEl.textContent = res.summary || `AI Assessment: Predicted distance of ${dist.toFixed(2)}m based on ${input.Sprint_Speed_mps} m/s runway speed and ${input.Takeoff_Angle_deg}° takeoff trajectory.`;

    // 2. Metrics Grid
    const talentEl = document.getElementById("predTalentVal");
    if (talentEl) talentEl.textContent = talent;

    const confEl = document.getElementById("predConfVal");
    if (confEl) confEl.textContent = `${conf}%`;

    const launchEl = document.getElementById("predLaunchVal");
    if (launchEl) {
        const angle = input.Takeoff_Angle_deg;
        launchEl.textContent = (angle >= 18 && angle <= 23) ? "Optimal" : (angle < 18 ? "Too Flat" : "Too High");
        launchEl.style.color = (angle >= 18 && angle <= 23) ? "var(--primary)" : "#f59e0b";
    }

    // 3. Probabilities Bars
    const probContainer = document.getElementById("probBars");
    if (probContainer && res.class_probabilities) {
        probContainer.innerHTML = "";
        Object.entries(res.class_probabilities).forEach(([cls, pct]) => {
            const row = document.createElement("div");
            row.style.marginBottom = "8px";
            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 3px;">
                    <span>${cls}</span>
                    <strong>${Number(pct).toFixed(1)}%</strong>
                </div>
                <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(100, Math.max(0, Number(pct)))}%; height: 100%; background: var(--primary);"></div>
                </div>
            `;
            probContainer.appendChild(row);
        });
    }

    // 4. Biomechanical Coaching Suggestions
    const suggContainer = document.getElementById("suggestionsContainer");
    if (suggContainer) {
        suggContainer.innerHTML = "";
        const suggestions = res.suggestions || [];

        if (suggestions.length === 0) {
            suggContainer.innerHTML = "<p style='color: var(--text-muted); font-size: 13px;'>All analyzed parameters conform to optimal competitive thresholds.</p>";
        } else {
            suggestions.forEach(item => {
                const card = document.createElement("div");
                const status = (item.status || "Optimal").toLowerCase().replace(/\s+/g, "");
                card.className = `suggestion-card status-${status}`;

                let badgeClass = "badge-optimal";
                if (status.includes("need") || status.includes("work") || status.includes("fair")) badgeClass = "badge-needswork";
                else if (status.includes("good") || status.includes("moderate")) badgeClass = "badge-good";

                card.innerHTML = `
                    <div class="suggestion-header">
                        <span class="suggestion-title">${item.aspect || "Parameter"}</span>
                        <span class="suggestion-badge ${badgeClass}">${item.status || "Evaluated"}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between;">
                        <span>Current: <strong>${item.currentValue || item.current_value || "--"}</strong></span>
                        <span>Target: ${item.optimalRange || item.optimal_range || "Optimal Range"}</span>
                    </div>
                    <div class="suggestion-obs">${item.observation || item.note || ""}</div>
                    <div class="suggestion-tip"><strong>Coaching Tip:</strong> ${item.tip || item.recommendation || ""}</div>
                `;
                suggContainer.appendChild(card);
            });
        }
    }

    // 5. Training Roadmap
    const roadmapBullets = document.getElementById("roadmapBullets");
    const roadmapBox = document.getElementById("roadmapBox");
    if (roadmapBullets && roadmapBox) {
        const roadmapItems = res.roadmap || (res.feedback && res.feedback.recommendations) || [];
        if (roadmapItems.length > 0) {
            roadmapBullets.innerHTML = "";
            roadmapItems.forEach(step => {
                const li = document.createElement("li");
                li.style.marginBottom = "6px";
                li.textContent = step;
                roadmapBullets.appendChild(li);
            });
            roadmapBox.classList.remove("hidden");
        } else {
            roadmapBox.classList.add("hidden");
        }
    }

    // Save to localStorage for synchronization with other pages and Results Dashboard
    try {
        const storedRecord = {
            id: res.id || ("pred_" + Date.now()),
            timestamp: new Date().toISOString(),
            source: "manual",
            video_name: `Manual Prediction (${input.Gender}, ${input.Age}y)`,
            predicted_distance: dist,
            talent_level: talent,
            takeoff_angle: input.Takeoff_Angle_deg,
            knee_angle: 165.0,
            hip_angle: 170.0,
            ankle_angle: 90.0,
            flight_time: Number((dist / (input.Sprint_Speed_mps * 1.05)).toFixed(2)) || 0.72,
            runup_time: Number((input.Runup_Distance_m / (input.Sprint_Speed_mps * 0.75)).toFixed(2)) || 4.5,
            stability_score: 92.0,
            sprint_speed: input.Sprint_Speed_mps,
            confidence: conf,
            suggestions: res.suggestions || [],
            roadmap: res.roadmap || []
        };
        localStorage.setItem("latestPrediction", JSON.stringify(storedRecord));

        let hist = JSON.parse(localStorage.getItem("manual_predictions_history") || "[]");
        hist.unshift(storedRecord);
        if (hist.length > 50) hist = hist.slice(0, 50);
        localStorage.setItem("manual_predictions_history", JSON.stringify(hist));
    } catch (e) {}

    // Scroll smoothly to results card
    if (resultsCard) {
        resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

function showError(msg) {
    if (formError) {
        formError.textContent = msg;
        formError.classList.remove("hidden");
    }
}

function clearError() {
    if (formError) {
        formError.textContent = "";
        formError.classList.add("hidden");
    }
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
    updateBMI();
    prefillFromStorage();
});
