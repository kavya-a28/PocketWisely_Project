// extension/background.js

console.log("PocketWisely background service worker started.");

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'register.html' });
    }
});

const BACKEND_URL = 'http://127.0.0.1:5000';

async function getUserId() {
    let data = await chrome.storage.local.get('userId');
    if (data.userId) { return data.userId; }
    let newUserId = self.crypto.randomUUID();
    await chrome.storage.local.set({ userId: newUserId });
    return newUserId;
}

function showImpulseBlocker(productData, eventId) {
    // This is the function that creates the popup.
    // It now includes the survey logic.

    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) oldPrompt.remove();

    const questions = [
        { key: 'reason', text: "Why do you want to buy this?", answers: ["Need it for work/study", "Replacement", "Gifting", "Just wanted it / trend", "Other"] },
        { key: 'budget', text: "Will this affect your monthly budget?", answers: ["Yes", "No", "Not sure"] },
        { key: 'wait', text: "Can you wait 30 days before buying this?", answers: ["Yes", "No"] }
    ];

    let currentQuestionIndex = -1;
    const userAnswers = {};

    function renderPromptContent() {
        const contentEl = document.getElementById('pw-content-area');
        if (!contentEl) return;

        if (currentQuestionIndex >= questions.length) {
            // Survey is finished, send answers back to the background script
            chrome.runtime.sendMessage({ action: "logSurveyAnswers", eventId: eventId, answers: userAnswers });
            document.getElementById('pocketwisely-prompt-overlay').remove();
            return;
        }

        let innerHTML = '';
        if (currentQuestionIndex === -1) {
            innerHTML = `
                <div style="font-size: 18px; margin-bottom: 10px;">Is this a mindful purchase?</div>
                <div style="font-size: 14px; color: #666; background-color: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 20px;">Instead of buying, you could invest ${productData.price} and potentially grow your wealth.</div>
                <div style="display: flex; justify-content: center;">
                    <button id="pw-cancel-btn" style="border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; background-color: #f1f1f1; color: #333;">You're right, I'll wait.</button>
                    <button id="pw-proceed-btn" style="border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; background-color: #28a745; color: white; margin-left: 10px;">I really need this.</button>
                </div>
            `;
        } else {
            const q = questions[currentQuestionIndex];
            innerHTML = `
                <div style="font-size: 18px; margin-bottom: 20px;">${q.text}</div>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
                    ${q.answers.map(answer => `<button class="pw-answer-btn" data-answer="${answer}" style="border: 1px solid #ccc; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-size: 14px; background-color: #fff;">${answer}</button>`).join('')}
                </div>
            `;
        }
        contentEl.innerHTML = innerHTML;
        attachListeners();
    }

    function attachListeners() {
        if (currentQuestionIndex === -1) {
            document.getElementById('pw-cancel-btn').addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: "logDecision", eventId: eventId, decision: "discarded" });
                document.getElementById('pocketwisely-prompt-overlay').remove();
            });
            document.getElementById('pw-proceed-btn').addEventListener('click', () => {
                chrome.runtime.sendMessage({ action: "logDecision", eventId: eventId, decision: "interested" });
                currentQuestionIndex++;
                renderPromptContent();
            });
        } else {
            const q = questions[currentQuestionIndex];
            document.querySelectorAll('.pw-answer-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    userAnswers[q.key] = btn.dataset.answer;
                    currentQuestionIndex++;
                    renderPromptContent();
                });
            });
        }
    }

    const promptHTML = `
        <div id="pocketwisely-prompt-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: sans-serif;">
            <div id="pocketwisely-prompt" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); width: 90%; max-width: 450px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">Hold On! 🧐</div>
                <div style="display: flex; align-items: center; text-align: left; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                    <img src="${productData.image}" alt="${productData.name}" style="width: 80px; height: 80px; object-fit: contain; margin-right: 15px; border-radius: 8px;" />
                    <div>
                        <div style="font-size: 16px; font-weight: bold;">${productData.name}</div>
                        <div style="font-size: 14px; color: #555; margin-top: 4px;">Price: <strong>${productData.price}</strong></div>
                    </div>
                </div>
                <div id="pw-content-area"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', promptHTML);
    renderPromptContent();
}

function unlockButton() {
    const targetButton = document.querySelector('[data-pocketwisely-target="true"]');
    if (targetButton) {
        targetButton.setAttribute('data-pocketwisely-unlocked', 'true');
        targetButton.removeAttribute('data-pocketwisely-target');
        console.log("Unlocked button:", targetButton);
    }
}

function cleanupMarker() {
    const targetButton = document.querySelector('[data-pocketwisely-target="true"]');
    if (targetButton) {
        targetButton.removeAttribute('data-pocketwisely-target');
    }
}

// --- Main Message Listener (The "Mailroom") ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        const userId = await getUserId();
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (request.action === "purchaseAttempt") {
            const response = await fetch(`${BACKEND_URL}/api/event/view`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: userId,
                    productData: {
                        name: request.data.name,
                        price: parseFloat(request.data.price.replace(/[^0-9.-]+/g, "")),
                        image: request.data.image
                    }
                })
            });
            const eventData = await response.json();
            await chrome.storage.session.set({ currentEventId: eventData.eventId });
            
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                func: showImpulseBlocker,
                args: [request.data, eventData.eventId]
            });
        }

        if (request.action === "logDecision") {
            await fetch(`${BACKEND_URL}/api/event/decide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: request.eventId, decision: request.decision })
            });
        }
        
        // --- ✅ NEW BLOCK to handle survey answers ---
        if (request.action === "logSurveyAnswers") {
            await fetch(`${BACKEND_URL}/api/event/log-survey`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: request.eventId, answers: request.answers })
            });
            
            alert("Thank you for reflecting. You may now click the original button again to proceed.");
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: unlockButton,
            });
        }
        
        if (request.action === "unlockOriginalButton") {
             chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: unlockButton,
            });
        }

        if (request.action === "actualPurchaseAction") {
            const { currentEventId } = await chrome.storage.session.get('currentEventId');
            if (currentEventId) {
                await fetch(`${BACKEND_URL}/api/event/update-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: currentEventId, newStatus: request.buttonType })
                });
                await chrome.storage.session.remove('currentEventId');
            }
        }

        if (request.action === "purchaseCompleted") {
            await fetch(`${BACKEND_URL}/api/event/confirm-purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, productNames: request.productNames })
            });
        }
    })();
    return true;
});