// ============================================================
// LONG JUMP AI - BIOMECHANICS & KNOWLEDGE HUB LOGIC
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
    initSimulator();
});

function initSimulator() {
    const velSlider = document.getElementById("velSlider");
    const angleSlider = document.getElementById("angleSlider");
    const velDisplay = document.getElementById("velDisplay");
    const angleDisplay = document.getElementById("angleDisplay");
    const simDistance = document.getElementById("simDistance");
    const simVy = document.getElementById("simVy");
    const simAirtime = document.getElementById("simAirtime");
    const simCoachingText = document.getElementById("simCoachingText");
    const canvas = document.getElementById("trajectoryCanvas");

    if (!velSlider || !angleSlider) return;

    function updateSimulation() {
        const v0 = parseFloat(velSlider.value);
        const thetaDeg = parseFloat(angleSlider.value);

        if (velDisplay) velDisplay.textContent = `${v0.toFixed(1)} m/s`;
        if (angleDisplay) angleDisplay.textContent = `${thetaDeg.toFixed(1)}°`;

        const thetaRad = (thetaDeg * Math.PI) / 180;
        const g = 9.81;

        const vx = v0 * Math.cos(thetaRad);
        const vy = v0 * Math.sin(thetaRad);

        // Biomechanical CoM offset: Takeoff CoM ~1.25m, Landing CoM ~0.45m
        const deltaH = 0.80;
        const flightTime = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * deltaH))) / g;

        // Biomechanical flight distance adjusted for air drag and landing sweep
        const adjustedDist = vx * flightTime * 0.965;

        if (simDistance) simDistance.textContent = `${adjustedDist.toFixed(2)} m`;
        if (simVy) simVy.textContent = `${vy.toFixed(2)} m/s`;
        if (simAirtime) simAirtime.textContent = `${flightTime.toFixed(2)} s`;

        // Coaching cue assessment
        if (simCoachingText) {
            if (thetaDeg < 17.5) {
                simCoachingText.innerHTML = `⚠️ <strong>Too Flat (${thetaDeg.toFixed(1)}°):</strong> Insufficient vertical airtime restricts total airborne reach despite high velocity. Focus on penultimate stride hip lowering to generate upward impulse.`;
                simCoachingText.style.borderLeftColor = "#f59e0b";
                simCoachingText.style.background = "rgba(245, 158, 11, 0.08)";
            } else if (thetaDeg > 23.5) {
                simCoachingText.innerHTML = `⚠️ <strong>Too Steep (${thetaDeg.toFixed(1)}°):</strong> Excessive takeoff angle causes heavy foot jamming on the board, drastically killing horizontal approach speed. Focus on 'running off the board' without leaping.`;
                simCoachingText.style.borderLeftColor = "#ef4444";
                simCoachingText.style.background = "rgba(239, 68, 68, 0.08)";
            } else {
                simCoachingText.innerHTML = `🎯 <strong>Optimal Takeoff Window (${thetaDeg.toFixed(1)}°):</strong> Ideal biomechanical equilibrium between approach velocity conservation (~85%) and airborne hang time.`;
                simCoachingText.style.borderLeftColor = "var(--primary)";
                simCoachingText.style.background = "rgba(56, 232, 165, 0.08)";
            }
        }

        drawTrajectory(canvas, v0, thetaRad, flightTime, adjustedDist);
    }

    velSlider.addEventListener("input", updateSimulation);
    angleSlider.addEventListener("input", updateSimulation);

    // Initial render
    updateSimulation();
}

function drawTrajectory(canvas, v0, thetaRad, totalTime, distance) {
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Padding
    const padX = 40;
    const padY = 30;
    const groundY = height - padY;

    // Draw Ground / Runway
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padX - 20, groundY);
    ctx.lineTo(width - padX + 20, groundY);
    ctx.stroke();

    // Draw Takeoff Board
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(padX, groundY - 4, 16, 6);

    // Draw Sand Pit
    const pitStartX = padX + 80;
    ctx.fillStyle = "rgba(234, 179, 8, 0.15)";
    ctx.fillRect(pitStartX, groundY, width - pitStartX - padX + 20, 16);
    ctx.fillStyle = "#eab308";
    ctx.font = "10px sans-serif";
    ctx.fillText("SAND PIT", pitStartX + 10, groundY + 12);

    // Draw Takeoff Label
    ctx.fillStyle = "#38e8a5";
    ctx.font = "10px sans-serif";
    ctx.fillText("BOARD", padX - 8, groundY + 16);

    // Calculate Points along trajectory
    const g = 9.81;
    const vx = v0 * Math.cos(thetaRad);
    const vy = v0 * Math.sin(thetaRad);

    // Scale factors
    const maxDist = 9.5; // meters
    const scaleX = (width - padX * 2 - 20) / maxDist;
    const scaleY = (height - padY * 2) / 2.5; // 2.5m apex

    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#38e8a5";

    const steps = 40;
    let landingPixelX = padX;

    for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * totalTime;
        const x = vx * t;
        const y = vy * t - 0.5 * g * t * t;

        const pixelX = padX + x * scaleX;
        const pixelY = groundY - y * scaleY;

        if (i === 0) {
            ctx.moveTo(pixelX, pixelY);
        } else {
            ctx.lineTo(pixelX, pixelY);
        }

        if (i === steps) {
            landingPixelX = pixelX;
        }
    }
    ctx.stroke();

    // Draw Landing Mark & Distance text
    ctx.fillStyle = "#38e8a5";
    ctx.beginPath();
    ctx.arc(landingPixelX, groundY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`${distance.toFixed(2)} m`, landingPixelX - 16, groundY - 12);
}
