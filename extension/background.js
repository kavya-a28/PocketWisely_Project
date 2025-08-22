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
            <div class="pw-alert-header">
                <div class="pw-warning-icon">!</div>
                <h2 class="pw-alert-title">Impulse Purchase Detected</h2>
            </div>
            <p class="pw-alert-subtitle">Take a moment to think! This seems like an impulse buy that could impact your financial goals.</p>
            <div class="pw-button-container">
                <button class="pw-invest-btn" id="pw-invest-btn-main">🚀 Invest Instead & Build Wealth</button>
                <button class="pw-proceed-btn" id="pw-proceed-btn-main">I Still Need to Buy This</button>
            </div>
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
            <style>
                /* === STYLES FOR INITIAL IMPULSE ALERT === */
                .pw-alert-header{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:20px}.pw-warning-icon{width:24px;height:24px;background:#fbbf24;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(251,191,36,.4)}.pw-alert-title{color:#1f2937;font-size:24px;font-weight:700;margin:0}.pw-alert-subtitle{color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 28px;text-align:center}.pw-button-container{display:flex;gap:12px;flex-direction:column;margin-top:0}.pw-invest-btn{background:#2dd4bf;color:#fff;border:none;padding:16px 20px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s ease;box-shadow:0 4px 15px -2px rgba(45,212,191,.3)}.pw-invest-btn:hover{background:#14b8a6;transform:translateY(-2px);box-shadow:0 6px 20px -2px rgba(45,212,191,.4)}.pw-proceed-btn{background:#f3f4f6;color:#4b5563;border:none;padding:14px 20px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s ease}.pw-proceed-btn:hover{background:#e5e7eb}

                /* === FINAL ATTRACTIVE: Sea Green & Responsive Theme === */
                .pw-survey-modal{background:linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-radius:20px;text-align:left;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;}.pw-survey-header{padding:24px 28px 20px;text-align:center;flex-shrink:0;border-bottom:1px solid #eaf0f6}.pw-survey-title{color:#1e293b;font-size:20px;font-weight:700;margin:0 0 6px}.pw-survey-subtitle{color:#64748b;font-size:14px;margin:0}.pw-survey-body{overflow-y:auto;padding:20px 28px}.pw-survey-question{margin-bottom:16px}.pw-survey-question-title{color:#334155;font-size:15px;font-weight:600;margin:0 0 12px}.pw-survey-options{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.pw-survey-option{background:#fff;border:1px solid #eaf0f6;color:#475569;padding:12px 10px;border-radius:12px;cursor:pointer;transition:all .2s ease-out;text-align:center;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 2px 4px rgba(0,0,0,.02)}.pw-survey-option:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(0,0,0,.08);border-color:#d1dbe5}.pw-survey-option.selected{border-color:#14b8a6;background:#f0fdfa;color:#0f766e;box-shadow:0 4px 14px rgba(20,184,166,.25),inset 0 2px 4px rgba(255,255,255,.5);transform:translateY(-2px)}.pw-survey-option .emoji{font-size:20px;line-height:1}.pw-survey-option strong{font-size:14px;font-weight:600;color:#1e293b;line-height:1.2;margin:4px 0}.pw-survey-option small{font-size:12px;color:#64748b;line-height:1.2}.pw-survey-option.selected strong,.pw-survey-option.selected small{color:inherit}.pw-checkmark{position:absolute;top:8px;right:8px;width:18px;height:18px;background:#14b8a6;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;transform:scale(0) rotate(-180deg);transition:transform .3s cubic-bezier(.34,1.56,.64,1);opacity:0;font-size:10px}.pw-survey-option.selected .pw-checkmark{transform:scale(1) rotate(0deg);opacity:1}.pw-survey-actions{display:flex;gap:12px;padding:20px 28px;justify-content:flex-end;flex-shrink:0;border-top:1px solid #eaf0f6;background:linear-gradient(180deg, #f7f9fc 0%, #f1f5f9 100%)}.pw-survey-cancel,.pw-survey-submit{border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s ease}.pw-survey-cancel{background:#eaf0f6;color:#475569}.pw-survey-cancel:hover{background:#d1dbe5}.pw-survey-submit{background:#14b8a6;color:#fff;opacity:.5;pointer-events:none}.pw-survey-submit.enabled{opacity:1;pointer-events:auto;box-shadow:0 4px 14px -2px rgba(20,184,166,.4)}.pw-survey-submit.enabled:hover{background:#0d9488;transform:translateY(-1px)}

                /* === Main Overlay & Container Styles === */
                #pocketwisely-prompt-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(10,20,30,.5);backdrop-filter:blur(5px);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:40px 15px;animation:overlayFadeIn .3s ease-out}#pocketwisely-prompt{background:#fff;border-radius:20px;box-shadow:0 20px 60px -10px rgba(0,0,0,.25);width:100%;max-width:500px;text-align:center;border:0;animation:promptSlideIn .4s cubic-bezier(.34,1.56,.64,1);max-height:calc(100vh - 80px);overflow:hidden;display:flex}
                @keyframes overlayFadeIn{from{opacity:0}to{opacity:1}}@keyframes promptSlideIn{from{opacity:0;transform:scale(.95) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}
            </style>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', promptContainerHTML);

    window.pwSurveyAnswers = { risk_level: null, duration: null, financial_stability: null };

    window.pwSelectOption = function(category, value, element) {
        window.pwSurveyAnswers[category] = value;
        const question = element.closest('.pw-survey-question');
        question.querySelectorAll('.pw-survey-option').forEach(option => option.classList.remove('selected'));
        element.classList.add('selected');
        window.pwCheckSurveyComplete();
    };

    window.pwCheckSurveyComplete = function() {
        const allAnswered = Object.values(window.pwSurveyAnswers).every(answer => answer !== null);
        const submitBtn = document.getElementById('surveySubmit');
        if (submitBtn) {
            if (allAnswered) submitBtn.classList.add('enabled');
            else submitBtn.classList.remove('enabled');
        }
    };

    window.pwSubmitSurvey = function() {
        if (!Object.values(window.pwSurveyAnswers).every(answer => answer !== null)) return;
        console.log('Investment Survey Results:', window.pwSurveyAnswers);
        const { risk_level, duration } = window.pwSurveyAnswers;
        let recommendation = 'a Diversified Investment Portfolio';
        if (risk_level === 'low' && duration === 'short') { recommendation = 'Fixed Deposits or Government Bonds'; }
        else if (risk_level === 'medium' && duration === 'medium') { recommendation = 'Balanced Mutual Funds or Index Funds'; }
        else if (risk_level === 'high' && duration === 'long') { recommendation = 'Equity Mutual Funds or Growth Stocks'; }
        alert(`🎯 Perfect! Based on your profile, we recommend: ${recommendation}. Redirecting...`);
        window.pwClosePrompt();
    };
    
    window.pwClosePrompt = function() {
        const overlay = document.getElementById('pocketwisely-prompt-overlay');
        if (overlay) {
            overlay.style.animation = 'overlayFadeOut 0.3s ease-out forwards';
            const prompt = overlay.querySelector('#pocketwisely-prompt');
            if (prompt) prompt.style.animation = 'promptSlideOut 0.3s ease-out forwards';
            setTimeout(() => overlay.remove(), 300);
        }
    };
    
    if (advice.type === 'impulsive') {
        const investBtn = document.getElementById('pw-invest-btn-main');
        if (investBtn) {
            investBtn.addEventListener('click', () => {
                const promptContent = document.getElementById('pw-content-area');
                const promptContainer = document.getElementById('pocketwisely-prompt');
                if (!promptContent || !promptContainer) return;

                const surveyHTML = `
                    <div class="pw-survey-modal">
                        <div class="pw-survey-header">
                            <h2 class="pw-survey-title">Quick Investment Profile</h2>
                            <p class="pw-survey-subtitle">Help us recommend the best options for you</p>
                        </div>
                        <div class="pw-survey-body">
                            <div class="pw-survey-question">
                                <h3 class="pw-survey-question-title">What's your risk tolerance?</h3>
                                <div class="pw-survey-options">
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('risk_level', 'low', this)">
                                        <div class="pw-checkmark">✔</div><span class="emoji">🛡️</span><strong>Low</strong><small>Safe & Steady</small>
                                    </button>
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('risk_level', 'medium', this)">
                                        <div class="pw-checkmark">✔</div><span class="emoji">⚖️</span><strong>Medium</strong><small>Balanced Growth</small>
                                    </button>
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('risk_level', 'high', this)">
                                        <div class="pw-checkmark">✔</div><span class="emoji">🚀</span><strong>High</strong><small>Maximum Returns</small>
                                    </button>
                                </div>
                            </div>
                            <div class="pw-survey-question">
                                <h3 class="pw-survey-question-title">Investment duration preference?</h3>
                                <div class="pw-survey-options">
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('duration', 'short', this)"><div class="pw-checkmark">✔</div><span class="emoji">⏰</span><strong>Short</strong><small>(1-2 years)</small></button>
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('duration', 'medium', this)"><div class="pw-checkmark">✔</div><span class="emoji">📅</span><strong>Medium</strong><small>(3-5 years)</small></button>
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('duration', 'long', this)"><div class="pw-checkmark">✔</div><span class="emoji">🏗️</span><strong>Long</strong><small>(5+ years)</small></button>
                                </div>
                            </div>
                            <div class="pw-survey-question">
                                <h3 class="pw-survey-question-title">Current financial situation?</h3>
                                <div class="pw-survey-options">
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('financial_stability', 'tough', this)"><div class="pw-checkmark">✔</div><span class="emoji">😰</span><strong>Tough</strong><small>Limited Budget</small></button>
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('financial_stability', 'comfort', this)"><div class="pw-checkmark">✔</div><span class="emoji">😊</span><strong>Comfortable</strong><small>Stable Income</small></button>
                                    <button class="pw-survey-option" onclick="window.pwSelectOption('financial_stability', 'flexible', this)"><div class="pw-checkmark">✔</div><span class="emoji">💪</span><strong>Flexible</strong><small>Extra Savings</small></button>
                                </div>
                            </div>
                        </div>
                        <div class="pw-survey-actions">
                            <button class="pw-survey-cancel" onclick="window.pwClosePrompt()">Cancel</button>
                            <button class="pw-survey-submit" id="surveySubmit" onclick="window.pwSubmitSurvey()">Get Recommendations</button>
                        </div>
                    </div>
                `;

                // Update container style for the new modal
                promptContainer.style.maxWidth = '520px';
                promptContainer.style.background = 'transparent';
                promptContainer.style.boxShadow = 'none';
                promptContainer.style.padding = '0';
                
                promptContent.innerHTML = surveyHTML;
            });
        }

        const proceedBtn = document.getElementById('pw-proceed-btn-main');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                const confirmed = confirm('⚠️ Are you absolutely sure? This purchase might delay your financial goals.');
                if (confirmed) {
                    alert('✅ Proceeding with purchase...');
                    window.pwClosePrompt();
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                        chrome.runtime.sendMessage({ action: "logFinalDecision", eventId: eventId, decision: "proceeded_after_advice" });
                    }
                }
            });
        }
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes overlayFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes promptSlideOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(20px); } }
    `;
    document.head.appendChild(style);
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