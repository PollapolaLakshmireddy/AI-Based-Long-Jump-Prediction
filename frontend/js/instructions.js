// ============================================================
// DYNAMIC INSTRUCTIONS LOADER
// ============================================================

async function loadInstructions() {
    const container = document.getElementById("dynamicInstructionsContainer");
    if (!container) return;

    try {
        const response = await fetch("/api/instructions");
        if (!response.ok) {
            throw new Error(`Failed to load instructions (HTTP ${response.status})`);
        }

        const resData = await response.json();
        const instructionsList = resData.data || [];

        if (instructionsList.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-light); padding: 30px;">No specific test instructions available.</div>`;
            return;
        }

        container.innerHTML = "";

        instructionsList.forEach(inst => {
            const block = document.createElement("div");
            block.className = "inst-block";

            const stepsHtml = (inst.steps || [])
                .map(step => `<li>${step}</li>`)
                .join("");

            const reqsHtml = (inst.requirements || [])
                .map(req => `<div class="tag-pill">✓ <strong>${req}</strong></div>`)
                .join("");

            const tipsHtml = (inst.tips || [])
                .map(tip => `<li>💡 ${tip}</li>`)
                .join("");

            block.innerHTML = `
                <h2>${inst.title}</h2>
                <p class="inst-summary">${inst.summary || ''}</p>

                <h4 style="color: var(--primary); margin: 20px 0 12px 0;">Step-by-Step Execution:</h4>
                <ul class="step-list">
                    ${stepsHtml}
                </ul>

                ${reqsHtml ? `
                    <h4 style="color: var(--primary); margin: 24px 0 10px 0;">Technical Requirements:</h4>
                    <div class="tag-list">${reqsHtml}</div>
                ` : ''}

                ${tipsHtml ? `
                    <h4 style="color: var(--primary); margin: 24px 0 10px 0;">Coach's Pro Tips:</h4>
                    <ul style="padding-left: 20px; color: var(--text-light); font-size: 14px; line-height: 1.8;">
                        ${tipsHtml}
                    </ul>
                ` : ''}

                <div style="margin-top: 20px; font-size: 12px; color: var(--text-light); border-top: 1px solid var(--border); padding-top: 10px;">
                    Last updated: ${inst.lastUpdated ? inst.lastUpdated.split('T')[0] : 'Current Edition'}
                </div>
            `;

            container.appendChild(block);
        });

    } catch (e) {
        console.error("Instructions Error:", e);
        container.innerHTML = `<div style="color: #fca5a5; padding: 20px;">Could not load instructions from server.</div>`;
    }
}

document.addEventListener("DOMContentLoaded", loadInstructions);
