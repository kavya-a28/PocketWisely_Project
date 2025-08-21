// background.js (Final Definitive Version with Gamified UI)
console.log("✅ PocketWisely Background Service Worker --- FINAL --- is running.");

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

// ==============================================================================
// --- INJECTABLE FUNCTIONS (These run on the Amazon/Flipkart page) ---
// ==============================================================================

function showFullPromptFlow(productData, eventId) {
    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) oldPrompt.remove();

    const questions = [
        { key: 'reason', text: "Why do you want to buy this?", answers: ["Need it for work/study", "Replacement", "Gifting", "Just wanted it / trend", "Other"] },
        { key: 'budget', text: "Will this affect your monthly budget?", answers: ["Yes", "No", "Not sure"] },
        { key: 'wait', text: "Can you wait 30 days before buying this?", answers: ["Yes", "No"] }
    ];

    let currentQuestionIndex = -1;
    const userAnswers = {};

    function renderContent() {
        const contentEl = document.getElementById('pw-content-area');
        if (!contentEl) return;

        let innerHTML = '';
        if (currentQuestionIndex === -1) {
            // --- INITIAL VIEW ---
            innerHTML = `
                <div style="font-size: 18px; margin-bottom: 10px;">Is this a mindful purchase?</div>
                <div style="font-size: 14px; color: #666; background-color: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 20px;">Instead of buying, you could invest ${productData.price} and potentially grow your wealth.</div>
                <div style="display: flex; justify-content: center;">
                    <button id="pw-cancel-btn" class="pw-btn-secondary">You're right, I'll wait.</button>
                    <button id="pw-proceed-btn" class="pw-btn-primary">I really need this.</button>
                </div>
            `;
        } else if (currentQuestionIndex < questions.length) {
            // --- SURVEY VIEW ---
            const q = questions[currentQuestionIndex];
            innerHTML = `
                <div style="font-size: 18px; margin-bottom: 20px;">${q.text}</div>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
                    ${q.answers.map(answer => `<button class="pw-answer-btn">${answer}</button>`).join('')}
                </div>
            `;
        } else {
            // --- ANALYSIS VIEW ---
            chrome.runtime.sendMessage({ action: "surveyCompleted", eventId: eventId, answers: userAnswers });
            innerHTML = `<div style="font-size: 16px; color: #555;">Analyzing...</div>`;
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
                renderContent();
            });
        } else {
            const q = questions[currentQuestionIndex];
            document.querySelectorAll('.pw-answer-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    userAnswers[q.key] = btn.textContent;
                    currentQuestionIndex++;
                    renderContent();
                });
            });
        }
    }

    const promptHTML = `
        <div id="pocketwisely-prompt-overlay">
            <div id="pocketwisely-prompt">
                <div class="pw-header">Hold On! 🧐</div>
                <div class="pw-product">
                    <img src="${productData.image}" alt="${productData.name}" />
                    <div>
                        <div class="pw-product-name">${productData.name}</div>
                        <div class="pw-product-price">Price: <strong>${productData.price}</strong></div>
                    </div>
                </div>
                <div id="pw-content-area"></div>
            </div>
        </div>
        <style>
            #pocketwisely-prompt-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            #pocketwisely-prompt { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); width: 90%; max-width: 450px; text-align: center; animation: fadeIn 0.3s ease; }
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            .pw-header { font-size: 24px; font-weight: bold; margin-bottom: 15px; }
            .pw-product { display: flex; align-items: center; text-align: left; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
            .pw-product img { width: 80px; height: 80px; object-fit: contain; margin-right: 15px; border-radius: 8px; }
            .pw-product-name { font-size: 16px; font-weight: bold; max-height: 40px; overflow: hidden; }
            .pw-product-price { font-size: 14px; color: #555; margin-top: 4px; }
            .pw-btn-primary, .pw-btn-secondary, .pw-answer-btn { border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; }
            .pw-btn-primary { background-color: #28a745; color: white; margin-left: 10px; }
            .pw-btn-secondary { background-color: #f1f1f1; color: #333; }
            .pw-answer-btn { background-color: #fff; border: 1px solid #ccc; }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', promptHTML);
    renderContent();
}

function showGamifiedAdvice(adviceData, eventId) {
    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) oldPrompt.remove();

    let adviceHTML = '';
    const advice = adviceData;

    if (advice.type === 'impulsive') {
        adviceHTML = `
            <div class="pw-gamified-title">${advice.suggestion.title}</div>
            <div class="pw-gamified-subtitle">${advice.suggestion.future_value_text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
            <div class="pw-investment-options">
                <a href="https://groww.in/mutual-funds" target="_blank" class="pw-option-btn">Start a SIP (via Groww)</a>
                <a href="https://zerodha.com/" target="_blank" class="pw-option-btn">Buy Indian Stocks (via Zerodha)</a>
            </div>
            <button id="pw-proceed-anyway" class="pw-proceed-link">I still need to buy this</button>
        `;
    } else {
        adviceHTML = `
            <div class="pw-mindful-question">${advice.question}</div>
            <div class="pw-buttons">
                <button id="pw-cancel-final" class="pw-btn-secondary">I'll wait</button>
                <button id="pw-proceed-anyway" class="pw-btn-primary">Proceed with Purchase</button>
            </div>
        `;
    }
    
    const promptContainerHTML = `
        <div id="pocketwisely-prompt-overlay">
            <div id="pocketwisely-prompt" class="${advice.type}">
                <div id="pw-content-area">${adviceHTML}</div>
            </div>
        </div>
        <style>
            #pocketwisely-prompt-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
            #pocketwisely-prompt { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 90%; max-width: 400px; text-align: center; border-top: 5px solid; animation: fadeIn 0.3s ease; }
            @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            #pocketwisely-prompt.impulsive { border-top-color: #ffc107; }
            #pocketwisely-prompt.mindful { border-top-color: #28a745; }
            .pw-gamified-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; line-height: 1.3; }
            .pw-gamified-subtitle { font-size: 16px; color: #666; margin-bottom: 25px; }
            .pw-gamified-subtitle strong { color: #28a745; }
            .pw-investment-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
            
            /* ✨ --- MODIFIED --- ✨ */
            .pw-option-btn { display: block; text-decoration: none; background-color: #17a2b8; color: white; padding: 15px; border-radius: 10px; font-weight: bold; transition: all 0.2s ease; }
            .pw-option-btn:hover { background-color: #138496; transform: translateY(-2px); }
            /* ✨ --- END OF MODIFICATION --- ✨ */

            .pw-proceed-link { background: none; border: none; color: #888; text-decoration: underline; cursor: pointer; font-size: 14px; padding-top: 10px; }
            .pw-mindful-question { font-size: 18px; color: #333; margin-bottom: 20px; }
            .pw-buttons { display: flex; justify-content: center; gap: 10px;}
            .pw-btn-primary, .pw-btn-secondary { border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; }
            .pw-btn-primary { background-color: #28a745; color: white; }
            .pw-btn-secondary { background-color: #f1f1f1; color: #333; }
        </style>
    `;
    
    document.body.insertAdjacentHTML('beforeend', promptContainerHTML);

    document.getElementById('pw-proceed-anyway').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "logFinalDecision", eventId: eventId, decision: "proceeded_after_advice" });
        document.getElementById('pocketwisely-prompt-overlay').remove();
        alert("You may now click the original button again to proceed.");
    });
    
    const cancelBtn = document.getElementById('pw-cancel-final');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: "logFinalDecision", eventId: eventId, decision: "avoided_after_advice" });
            document.getElementById('pocketwisely-prompt-overlay').remove();
        });
    }
}

function unlockButton() {
    const targetButton = document.querySelector('[data-pocketwisely-target="true"]');
    if (targetButton) {
        targetButton.setAttribute('data-pocketwisely-unlocked', 'true');
        targetButton.removeAttribute('data-pocketwisely-target');
        console.log("Unlocked button:", targetButton);
    }
}

// ==============================================================================
// --- Main Message Listener (The "Mailroom") ---
// ==============================================================================
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
                        price: parseFloat(String(request.data.price).replace(/[^0-9.-]+/g, "")),
                        image: request.data.image
                    }
                })
            });
            const eventData = await response.json();
            await chrome.storage.session.set({ currentEventId: eventData.eventId });
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                func: showFullPromptFlow,
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
        
        if (request.action === "surveyCompleted") {
            const response = await fetch(`${BACKEND_URL}/api/analyze-and-advise`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: request.eventId, answers: request.answers })
            });
            const advice = await response.json();
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: showGamifiedAdvice,
                args: [advice, request.eventId]
            });
        }
        
        if (request.action === "logFinalDecision") {
            await fetch(`${BACKEND_URL}/api/event/log-final-decision`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: request.eventId, finalDecision: request.decision })
            });
            
            if (request.decision === 'proceeded_after_advice') {
                chrome.scripting.executeScript({ target: { tabId: tab.id }, func: unlockButton });
            }
        }
        
    })();
    return true;
});