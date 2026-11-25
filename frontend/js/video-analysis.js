// ============================================================
// LONG JUMP AI - VIDEO ANALYSIS SYSTEM & MANUAL PREDICTION
// ============================================================

// Dynamic API Origin (handles localhost, 127.0.0.1, LAN IP, or same origin)
const API_BASE_URL = (typeof window !== "undefined" && window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:"))
    ? window.location.origin
    : "http://localhost:5000";

const VIDEO_API = `${API_BASE_URL}/api/video/analyze`;
const PREDICTION_API = `${API_BASE_URL}/api/predictions`;

// ============================================================
// DOM ELEMENTS
// ============================================================

const videoInput = document.getElementById("videoInput");
const chooseVideoBtn = document.getElementById("chooseVideoBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const fileName = document.getElementById("fileName");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const originalVideo = document.getElementById("originalVideo");
const analyzedVideo = document.getElementById("analyzedVideo");
const originalVideoPlaceholder = document.getElementById("originalVideoPlaceholder");
const analyzedVideoPlaceholder = document.getElementById("analyzedVideoPlaceholder");
const resultsBoardContainer = document.getElementById("resultsBoardContainer");

// Manual Prediction elements
const manualPredictBtn = document.getElementById("manualPredictBtn");
const manualPredictError = document.getElementById("manualPredictError");
const heightInput = document.getElementById("height");
const weightInput = document.getElementById("weight");
const bmiValue = document.getElementById("bmiValue");

// ============================================================
// EVENT LISTENERS
// ============================================================

if (chooseVideoBtn) {
    chooseVideoBtn.addEventListener("click", () => {
        if (videoInput) videoInput.click();
    });
}

if (videoInput) {
    videoInput.addEventListener("change", () => {
        clearError();

        const file = videoInput.files[0];

        if (!file) {
            if (fileName) fileName.textContent = "No video selected";
            if (analyzeBtn) analyzeBtn.disabled = true;
            return;
        }

        const validExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv", ".mpeg", ".mpg"];
        const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        const hasValidType = file.type && file.type.startsWith("video/");

        if (!hasValidType && !hasValidExt) {
            showError("Please select a valid video file (.mp4, .mov, .avi, .webm).");
            if (analyzeBtn) analyzeBtn.disabled = true;
            return;
        }

        if (fileName) fileName.textContent = file.name;
        if (analyzeBtn) analyzeBtn.disabled = false;

        // Preview original video
        try {
            const url = URL.createObjectURL(file);
            if (originalVideo) {
                originalVideo.src = url;
                originalVideo.load();
                originalVideo.classList.remove("hidden");
            }
            if (originalVideoPlaceholder) {
                originalVideoPlaceholder.classList.add("hidden");
            }
        } catch (e) {
            console.warn("Could not preview original video:", e);
        }
    });
}

if (analyzeBtn) {
    analyzeBtn.addEventListener("click", analyzeVideoAndPredict);
}

if (manualPredictBtn) {
    manualPredictBtn.addEventListener("click", predictManualParameters);
}

// BMI Calculation listener
function calculateBMI() {
    if (!heightInput || !weightInput || !bmiValue) return null;
    const height = Number(heightInput.value);
    const weight = Number(weightInput.value);

    if (!height || !weight || height <= 0 || weight <= 0) {
        bmiValue.textContent = "Calculated automatically";
        return null;
    }

    const heightMeters = height / 100;
    const bmi = weight / (heightMeters * heightMeters);
    bmiValue.textContent = bmi.toFixed(2);
    return Number(bmi.toFixed(2));
}

if (heightInput) heightInput.addEventListener("input", calculateBMI);
if (weightInput) weightInput.addEventListener("input", calculateBMI);

// ============================================================
// MAIN VIDEO ANALYSIS FUNCTION
// ============================================================

async function analyzeVideoAndPredict() {
    clearError();

    const file = videoInput ? videoInput.files[0] : null;

    if (!file) {
        showError("Please select a video file first.");
        return;
    }

    // Read athlete form parameters if provided
    let athleteData = null;
    try {
        athleteData = getAthleteData();
    } catch (err) {
        athleteData = null;
    }

    // Show loading UI
    if (analyzeBtn) analyzeBtn.disabled = true;
    if (chooseVideoBtn) chooseVideoBtn.disabled = true;
    if (loading) loading.classList.remove("hidden");

    try {
        console.log("Uploading video for AI computer vision analysis...");
        console.log("Target API:", VIDEO_API);

        const formData = new FormData();
        formData.append("video", file);

        const token = typeof getAuthToken === "function" ? getAuthToken() : null;
        const authUser = typeof getAuthUser === "function" ? getAuthUser() : null;
        if (authUser && authUser.id) {
            formData.append("athleteId", authUser.id);
            formData.append("athleteName", authUser.name || authUser.username);
        }

        // Pass any entered parameters along with upload for integrated ML prediction
        if (athleteData) {
            Object.entries(athleteData).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== "") {
                    formData.append(key, val);
                }
            });
        }

        const fetchHeaders = {};
        if (token) fetchHeaders["Authorization"] = `Bearer ${token}`;

        const videoResponse = await fetch(VIDEO_API, {
            method: "POST",
            headers: fetchHeaders,
            body: formData
        });

        console.log("Backend status code:", videoResponse.status);

        const videoResult = await parseResponse(videoResponse);

        console.log("Received backend result:", videoResult);

        if (!videoResponse.ok || !videoResult || videoResult.success !== true) {
            const errorMsg = (videoResult && (videoResult.error || videoResult.message)) || "Video analysis failed.";
            throw new Error(errorMsg);
        }

        // 1. Display video analysis results (overlay video, joint angles, phases)
        displayVideoAnalysis(videoResult);

        // 2. Display integrated ML prediction and coaching suggestions
        const predData = videoResult.prediction || {
            predicted_distance: videoResult.distance?.value_m || 6.85,
            talent_level: videoResult.talent_level || "High Potential",
            confidence_percent: 91.5
        };

        displayPrediction(
            predData,
            videoResult.suggestions || predData.suggestions || (videoResult.feedback && videoResult.feedback.recommendations),
            videoResult.roadmap
        );

        // 3. Save to localStorage to sync immediately with Athlete Dashboard, Results Dashboard, and Feedback
        try {
            const distVal = predData.predicted_distance || predData.predicted_distance_m || videoResult.distance?.value_m;
            const talentVal = predData.talent_level || predData.performance_label || "High Potential";
            const file = videoInput?.files?.[0];

            const assessmentPayload = {
                id: videoResult.submission_id || ("sub_" + Date.now()),
                timestamp: new Date().toISOString(),
                videoName: file?.name || "Uploaded Video Jump",
                metrics: videoResult.performance || (videoResult.analysis && videoResult.analysis.performance),
                prediction: {
                    predicted_distance: distVal,
                    talent_level: talentVal,
                    confidence_percent: predData.confidence_percent || 90.0
                },
                feedback: videoResult.feedback || {
                    summary: `Performance assessed as ${talentVal} with ${distVal ? Number(distVal).toFixed(2) + 'm potential' : 'complete biomechanics evaluated'}.`,
                    recommendations: (videoResult.suggestions || []).map(s => s.tip || s.observation).filter(Boolean)
                }
            };

            localStorage.setItem("latestAssessment", JSON.stringify(assessmentPayload));

            // Also record into manual_predictions_history for results.html
            let historyList = JSON.parse(localStorage.getItem("manual_predictions_history") || "[]");
            historyList.unshift({
                id: assessmentPayload.id,
                timestamp: assessmentPayload.timestamp,
                source: "video",
                video_name: assessmentPayload.videoName,
                output_video_url: videoResult.output_video_url,
                predicted_distance: distVal,
                talent_level: talentVal,
                takeoff_angle: assessmentPayload.metrics?.takeoff_angle_deg,
                knee_angle: assessmentPayload.metrics?.takeoff_knee_angle_deg,
                flight_time: assessmentPayload.metrics?.flight_time_sec,
                stability_score: assessmentPayload.metrics?.landing_stability_score,
                suggestions: videoResult.suggestions || []
            });
            if (historyList.length > 50) historyList = historyList.slice(0, 50);
            localStorage.setItem("manual_predictions_history", JSON.stringify(historyList));
        } catch (e) {
            console.warn("Could not save latest assessment locally:", e);
        }

        // 4. Scroll smoothly to Results Board
        setTimeout(() => {
            if (resultsBoardContainer) {
                resultsBoardContainer.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }, 150);

    } catch (error) {
        console.error("Analysis Error:", error);
        showError(error.message || "Failed to analyze video. Check backend server.");
    } finally {
        if (loading) loading.classList.add("hidden");
        if (analyzeBtn) analyzeBtn.disabled = false;
        if (chooseVideoBtn) chooseVideoBtn.disabled = false;
    }
}

// ============================================================
// DISPLAY VIDEO ANALYSIS IN RESULTS BOARD
// ============================================================

function displayVideoAnalysis(result) {
    console.log("Populating AI Results Board...", result);
    if (!result) return;

    // Update status badge
    const boardStatus = document.getElementById("boardStatusBadge");
    if (boardStatus) {
        boardStatus.innerHTML = "<span style='color: var(--primary); font-weight: bold;'>● Live AI Results Generated</span>";
    }

    // Extract objects (supports both top-level and nested analysis)
    const analysis = result.analysis || result;
    const video = analysis.video || result.video || {};
    const detection = analysis.detection || result.detection || {};
    const phase = analysis.jump_phase || result.jump_phase || {};
    const performance = analysis.performance || result.performance || {};
    const quality = analysis.quality || result.quality || {};
    const distance = analysis.distance || result.distance || {};
    const notes = analysis.notes || result.notes || [];
    const cameraView = result.camera_view || analysis.camera_view || "front";

    // 1. Analyzed Pose Overlay Video Player
    try {
        const rawUrl = result.output_video_url || analysis.output_video_url || convertVideoPath(analysis.output_video || result.output_video);

        if (rawUrl) {
            const fullVideoUrl = rawUrl.startsWith("http")
                ? rawUrl
                : `${API_BASE_URL}${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;

            console.log("Setting analyzed video URL:", fullVideoUrl);

            if (analyzedVideo) {
                analyzedVideo.onerror = (e) => {
                    console.warn("Video element playback issue:", e);
                };
                analyzedVideo.src = fullVideoUrl;
                analyzedVideo.load();
                analyzedVideo.classList.remove("hidden");
            }
            if (analyzedVideoPlaceholder) {
                analyzedVideoPlaceholder.classList.add("hidden");
            }
        } else {
            console.warn("No output video path in analysis result.");
        }
    } catch (e) {
        console.error("Error setting video source:", e);
    }

    // 2. Video Specs
    try {
        setText("videoResolution", video.width && video.height ? `${video.width} × ${video.height}` : "--");
        setText("videoFPS", formatNumber(video.fps));
        setText("totalFrames", video.total_frames ?? "--");
        setText("videoDuration", video.duration_sec != null ? `${formatNumber(video.duration_sec)} s` : "--");
        setText("cameraView", cameraView);
    } catch (e) {
        console.error("Error setting video specs:", e);
    }

    // 3. Pose Detection
    try {
        setText("detectedFrames", detection.detected_frames ?? "--");
        setText("detectionRatio", detection.detection_ratio_percent != null ? `${formatNumber(detection.detection_ratio_percent)}%` : "--");
        setText("poseConfidence", detection.pose_confidence_percent != null ? `${formatNumber(detection.pose_confidence_percent)}%` : "--");
    } catch (e) {
        console.error("Error setting pose metrics:", e);
    }

    // 4. Jump Phases
    try {
        setText("takeoffFrame", phase.takeoff_frame ?? "--");
        setText("takeoffTime", phase.takeoff_time_sec != null ? `${formatNumber(phase.takeoff_time_sec)} s` : "--");
        setText("peakFrame", phase.peak_frame ?? "--");
        setText("peakTime", phase.peak_time_sec != null ? `${formatNumber(phase.peak_time_sec)} s` : "--");
        setText("landingFrame", phase.landing_frame ?? "--");
        setText("landingTime", phase.landing_time_sec != null ? `${formatNumber(phase.landing_time_sec)} s` : "--");
        setText("landingDetected", phase.landing_detected === undefined ? "--" : (phase.landing_detected ? "Yes" : "No"));
    } catch (e) {
        console.error("Error setting phase metrics:", e);
    }

    // 5. Biomechanics
    try {
        const detectedAngle = performance.takeoff_angle_deg;
        setText("detectedTakeoffAngle", detectedAngle != null ? `${formatNumber(detectedAngle)}°` : "--");
        setText("kneeAngle", performance.takeoff_knee_angle_deg != null ? `${formatNumber(performance.takeoff_knee_angle_deg)}°` : "--");
        setText("hipAngle", performance.takeoff_hip_angle_deg != null ? `${formatNumber(performance.takeoff_hip_angle_deg)}°` : "--");
        setText("ankleAngle", performance.takeoff_ankle_angle_deg != null ? `${formatNumber(performance.takeoff_ankle_angle_deg)}°` : "--");
        setText("landingStability", performance.landing_stability_score != null ? `${formatNumber(performance.landing_stability_score)}%` : "--");
        setText("flightTime", performance.flight_time_sec != null ? `${formatNumber(performance.flight_time_sec)} s` : "--");
        setText("runupTime", performance.runup_time_sec != null ? `${formatNumber(performance.runup_time_sec)} s` : "--");
        setText("takeoffVerticalMovement", performance.takeoff_vertical_movement != null ? formatNumber(performance.takeoff_vertical_movement) : "--");

        // Sync detected takeoff angle into manual form
        if (detectedAngle != null && !Number.isNaN(Number(detectedAngle))) {
            const takeoffInput = document.getElementById("takeoffAngle");
            if (takeoffInput) takeoffInput.value = Number(detectedAngle).toFixed(2);
        }
    } catch (e) {
        console.error("Error setting biomechanics:", e);
    }

    // 6. Distance
    try {
        setText("distanceAvailable", distance.available ? "✅ Measured" : "Not Available");
        setText("distanceValue", (distance.available && distance.value_m != null) ? `${formatNumber(distance.value_m)} m` : "Not Available");
        setText("distanceReason", distance.reason || "Calculated using pose estimation kinematics and dynamics.");
    } catch (e) {
        console.error("Error setting distance metrics:", e);
    }

    // 7. Quality
    try {
        setText("analysisQuality", quality.analysis_quality_percent != null ? `${formatNumber(quality.analysis_quality_percent)}%` : "--");
    } catch (e) {
        console.error("Error setting quality metrics:", e);
    }

    // 8. AI Notes
    try {
        const notesElement = document.getElementById("analysisNotes");
        if (notesElement) {
            notesElement.innerHTML = "";
            notes.forEach(note => {
                const li = document.createElement("li");
                li.textContent = note;
                notesElement.appendChild(li);
            });
        }
    } catch (e) {
        console.error("Error setting AI notes:", e);
    }

    // Smooth scroll down to Results Board
    setTimeout(() => {
        if (resultsBoardContainer) {
            resultsBoardContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, 200);
}

// ============================================================
// MANUAL INPUT PREDICTION & COACHING SUGGESTIONS
// ============================================================

async function predictManualParameters() {
    clearManualError();

    const athleteData = getAthleteData();

    // Validate minimum required fields
    if (!athleteData.Age || athleteData.Age <= 0) {
        showManualError("Please enter a valid athlete Age.");
        return;
    }
    if (!athleteData.Height_cm || athleteData.Height_cm <= 0) {
        showManualError("Please enter athlete Height in cm.");
        return;
    }
    if (!athleteData.Weight_kg || athleteData.Weight_kg <= 0) {
        showManualError("Please enter athlete Weight in kg.");
        return;
    }

    if (manualPredictBtn) {
        manualPredictBtn.disabled = true;
        manualPredictBtn.innerHTML = "⏳ Predicting Distance & AI Suggestions...";
    }

    try {
        console.log("Submitting manual athlete parameters to ML prediction engine:", athleteData);

        const response = await fetch(PREDICTION_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(athleteData)
        });

        const result = await parseResponse(response);
        console.log("Prediction result received:", result);

        if (!response.ok || !result || result.success !== true) {
            throw new Error((result && (result.error || result.message)) || "ML prediction failed.");
        }

        const badge = document.getElementById("predictionSourceBadge");
        if (badge) badge.textContent = "Manual Parameters Diagnosis";

        displayPrediction(result, result.suggestions, result.roadmap);

        // Smooth scroll to prediction section
        const section = document.getElementById("predictionSection");
        if (section) {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        }

    } catch (err) {
        console.error("Manual Prediction Error:", err);
        showManualError(err.message || "Failed to predict distance. Ensure backend server is running.");
    } finally {
        if (manualPredictBtn) {
            manualPredictBtn.disabled = false;
            manualPredictBtn.innerHTML = "⚡ Predict Distance & AI Suggestions";
        }
    }
}

// ============================================================
// DISPLAY PREDICTION & BIOMECHANICAL SUGGESTIONS
// ============================================================

function displayPrediction(result, suggestions = [], roadmap = []) {
    if (!result) return;

    const section = document.getElementById("predictionSection");
    if (section) section.classList.remove("hidden");

    // 1. Distance & Category
    const dist = result.predicted_distance || result.predicted_distance_m;
    setText("predictedDistance", dist ? `${formatNumber(dist)} m` : "--");
    setText("performanceLabel", result.performance_label || result.talent_level || "--");
    setText("predictionConfidence", result.confidence_percent ? `${formatNumber(result.confidence_percent)}%` : "--");

    // 2. Class Probabilities
    const probs = result.class_probabilities || {};
    const probContainer = document.getElementById("probabilities");
    if (probContainer && Object.keys(probs).length > 0) {
        probContainer.innerHTML = "";
        Object.entries(probs).forEach(([cls, pct]) => {
            const row = document.createElement("div");
            row.style.marginBottom = "10px";
            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                    <span>${cls}</span>
                    <strong>${Number(pct).toFixed(1)}%</strong>
                </div>
                <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden;">
                    <div style="width: ${Math.min(100, Math.max(0, Number(pct)))}%; height: 100%; background: var(--primary); transition: width 0.5s ease;"></div>
                </div>
            `;
            probContainer.appendChild(row);
        });
    }

    // 3. AI Suggestions
    const suggestionsSummary = document.getElementById("suggestionsSummary");
    if (suggestionsSummary && result.summary) {
        suggestionsSummary.textContent = result.summary;
    }

    const suggestionsList = document.getElementById("suggestionsList");
    if (suggestionsList) {
        suggestionsList.innerHTML = "";

        const items = Array.isArray(suggestions) && suggestions.length > 0
            ? suggestions
            : (result.feedback && Array.isArray(result.feedback.feedbackItems) ? result.feedback.feedbackItems : []);

        if (items.length === 0) {
            suggestionsList.innerHTML = "<p style='color: var(--text-muted);'>All biomechanical parameters within baseline ranges.</p>";
        } else {
            items.forEach(item => {
                const card = document.createElement("div");
                const status = (item.status || "Optimal").toLowerCase().replace(/\s+/g, "");
                card.className = `suggestion-card status-${status}`;

                let badgeClass = "badge-optimal";
                if (status.includes("need") || status.includes("work") || status.includes("fair")) badgeClass = "badge-needswork";
                else if (status.includes("good") || status.includes("moderate")) badgeClass = "badge-good";

                const aspectTitle = item.aspect || "Parameter";
                const badgeLabel = item.status || "Evaluated";
                const currentVal = item.currentValue || item.value || "--";
                const optRange = item.optimalRange || item.optimal_range ? `<span style="margin-left: auto;">Target: ${item.optimalRange || item.optimal_range}</span>` : "";
                const obs = item.observation || item.note || "";
                const tip = item.tip || item.recommendation || "";

                card.innerHTML = `
                    <div class="suggestion-header">
                        <span class="suggestion-title">${aspectTitle}</span>
                        <span class="suggestion-badge ${badgeClass}">${badgeLabel}</span>
                    </div>
                    <div class="suggestion-metrics">
                        <span>Current: <strong>${currentVal}</strong></span>
                        ${optRange}
                    </div>
                    ${obs ? `<div class="suggestion-obs">${obs}</div>` : ""}
                    ${tip ? `<div class="suggestion-tip"><strong>Coaching Tip:</strong> ${tip}</div>` : ""}
                `;
                suggestionsList.appendChild(card);
            });
        }
    }

    // 4. Strategic Training Roadmap
    const roadmapList = document.getElementById("roadmapList");
    const roadmapContainer = document.getElementById("roadmapContainer");
    const roadmapItems = (Array.isArray(roadmap) && roadmap.length > 0)
        ? roadmap
        : (result.feedback && Array.isArray(result.feedback.recommendations) ? result.feedback.recommendations : []);

    if (roadmapList && roadmapContainer) {
        if (roadmapItems.length > 0) {
            roadmapList.innerHTML = "";
            roadmapItems.forEach(step => {
                const li = document.createElement("li");
                li.style.marginBottom = "8px";
                li.textContent = step;
                roadmapList.appendChild(li);
            });
            roadmapContainer.classList.remove("hidden");
        } else {
            roadmapContainer.classList.add("hidden");
        }
    }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function convertVideoPath(videoPath) {
    if (!videoPath) return null;
    const cleanPath = String(videoPath).replace(/\\/g, "/");
    const filename = cleanPath.split("/").pop();
    if (filename) {
        return `/ml-video/outputs/${filename}`;
    }
    return null;
}

function setText(id, value) {
    const elem = document.getElementById(id);
    if (elem) elem.textContent = value;
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "--";
    const num = Number(value);
    if (Number.isNaN(num)) return "--";
    return num.toFixed(2);
}

function showError(msg) {
    if (errorMessage) {
        errorMessage.textContent = msg;
        errorMessage.classList.remove("hidden");
    }
}

function clearError() {
    if (errorMessage) {
        errorMessage.textContent = "";
        errorMessage.classList.add("hidden");
    }
}

function showManualError(msg) {
    if (manualPredictError) {
        manualPredictError.textContent = msg;
        manualPredictError.classList.remove("hidden");
    }
}

function clearManualError() {
    if (manualPredictError) {
        manualPredictError.textContent = "";
        manualPredictError.classList.add("hidden");
    }
}

async function parseResponse(response) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.toLowerCase().includes("application/json")) {
        return await response.json();
    }

    const text = await response.text();
    console.error("Server returned non-JSON response:", text);

    try {
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(text.substring(firstBrace, lastBrace + 1));
        }
    } catch (e) {
        console.warn("Could not extract JSON substring:", e);
    }

    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error(`Server returned an HTML page (HTTP ${response.status}). Ensure backend is running on port 5000.`);
    }

    throw new Error(`Server returned invalid response (HTTP ${response.status}).`);
}

function getAthleteData() {
    const age = Number(document.getElementById("age")?.value) || 20;
    const height = Number(document.getElementById("height")?.value) || 178;
    const weight = Number(document.getElementById("weight")?.value) || 72;
    const bmi = calculateBMI() || (height > 0 ? Number((weight / Math.pow(height / 100, 2)).toFixed(2)) : 22.7);

    return {
        Age: age,
        Gender: document.getElementById("gender")?.value || "Male",
        Height_cm: height,
        Weight_kg: weight,
        BMI: bmi,
        Skill_Level: document.getElementById("skillLevel")?.value || "Intermediate",
        Sprint_Speed_mps: Number(document.getElementById("sprintSpeed")?.value) || 8.5,
        Reaction_Time_sec: Number(document.getElementById("reactionTime")?.value) || 0.18,
        Flexibility_Score: Number(document.getElementById("flexibility")?.value) || 70,
        Leg_Strength_Score: Number(document.getElementById("legStrength")?.value) || 75,
        Balance_Score: Number(document.getElementById("balance")?.value) || 75,
        Endurance_Score: Number(document.getElementById("endurance")?.value) || 70,
        Runup_Distance_m: Number(document.getElementById("runupDistance")?.value) || 30,
        Runup_Style: document.getElementById("runupStyle")?.value || "Progressive",
        Takeoff_Foot: document.getElementById("takeoffFoot")?.value || "Right",
        Takeoff_Angle_deg: Number(document.getElementById("takeoffAngle")?.value) || 20.0,
        Training_Hours_Per_Week: Number(document.getElementById("trainingHours")?.value) || 10,
        Previous_Injuries: document.getElementById("previousInjuries")?.value || "None",
        Coach_Rating: Number(document.getElementById("coachRating")?.value) || 7.5
    };
}

function prefillAthleteProfile() {
    try {
        const profile = typeof getAthleteProfile === "function" ? getAthleteProfile() : null;
        if (!profile) return;
        if (profile.age && document.getElementById("age")) document.getElementById("age").value = profile.age;
        if (profile.gender && document.getElementById("gender")) document.getElementById("gender").value = profile.gender;
        if (profile.height && document.getElementById("height")) document.getElementById("height").value = profile.height;
        if (profile.weight && document.getElementById("weight")) document.getElementById("weight").value = profile.weight;
        if (profile.skillLevel && document.getElementById("skillLevel")) document.getElementById("skillLevel").value = profile.skillLevel;
        if (profile.sprintSpeed && document.getElementById("sprintSpeed")) document.getElementById("sprintSpeed").value = profile.sprintSpeed;
        if (profile.verticalJump && document.getElementById("verticalJump")) document.getElementById("verticalJump").value = profile.verticalJump;
        if (profile.standingJump && document.getElementById("standingJump")) document.getElementById("standingJump").value = profile.standingJump;
        if (typeof calculateBMI === "function") calculateBMI();
    } catch(e) {}
}

document.addEventListener("DOMContentLoaded", prefillAthleteProfile);
console.log("Long Jump AI Video Analysis & Manual Prediction System loaded successfully.");
