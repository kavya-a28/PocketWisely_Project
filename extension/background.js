// background.js (Final Definitive Version with Persistent Profile Logic)
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
            innerHTML =`
        <div class="pw-main-question">Is this a mindful purchase?</div>
        <div class="pw-investment-hint">Instead of buying, you could invest ${productData.price} and potentially grow your wealth.</div>
        <div class="pw-action-buttons">
            <button id="pw-cancel-btn" class="pw-btn-secondary">You're right, I'll wait.</button>
            <button id="pw-proceed-btn" class="pw-btn-primary">I really need this.</button>
        </div>

        <style>
        .pw-main-question {
                    font-size: 20px;
                    font-weight: 600;
                   color: #1e293b;
                       margin-bottom: 16px;
                   }

    .pw-investment-hint {
    font-size: 14px;
    color: #14b8a6;
    background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 24px;
    border: 1px solid #99f6e4;
    font-weight: 500;
    }

    .pw-action-buttons {
    display: flex;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
    }
    </style>
    `;

        } 
        
        else if (currentQuestionIndex < questions.length) {
        const q = questions[currentQuestionIndex];
         innerHTML = `
        <div class="pw-question-title">${q.text}</div>
        <div class="pw-question-options">
            ${q.answers.map(answer => `<button class="pw-answer-btn">${answer}</button>`).join('')}
        </div>

        <style>
        .pw-question-title {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 20px;
    }

    .pw-question-options {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    }
    </style>
    `;
    
        }

        else {
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
            <div class="pw-modal-container">
                <div class="pw-header">
                    <div class="pw-header-icon">🧐</div>
                    <h2 class="pw-title">Hold On!</h2>
                    <p class="pw-subtitle">Take a moment to consider this purchase</p>
                </div>
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
    </div>
    <style>
        #pocketwisely-prompt-overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background-color: rgba(10, 20, 30, 0.5); 
            backdrop-filter: blur(5px); 
            z-index: 2147483647; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 20px 15px;
            animation: overlayFadeIn 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
        }
        
        #pocketwisely-prompt { 
            background: transparent;
            width: 100%;
            max-width: 480px;
            max-height: calc(100vh - 40px);
            text-align: center;
            border: 0;
            animation: promptSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            display: flex;
            flex-direction: column;
        }
        
        .pw-modal-container {
            background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
            border-radius: 20px;
            text-align: center;
            width: 100%;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            max-height: 100%;
            overflow: hidden;
            padding: 28px;
        }
        
        .pw-header {
            margin-bottom: 20px;
        }
        
        .pw-header-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0 auto 16px;
            box-shadow: 0 4px 20px rgba(20, 184, 166, 0.3);
        }
        
        .pw-title { 
            color: #1e293b;
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 8px;
        }
        
        .pw-subtitle {
            color: #64748b;
            font-size: 14px;
            margin: 0;
            line-height: 1.5;
        }
        
        .pw-product { 
            display: flex; 
            align-items: center; 
            text-align: left; 
            margin-bottom: 24px; 
            background: #fff;
            border: 1px solid #eaf0f6;
            border-radius: 16px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        
        .pw-product img { 
            width: 80px; 
            height: 80px; 
            object-fit: contain; 
            margin-right: 16px; 
            border-radius: 12px;
            background: #f8fafc;
            padding: 8px;
        }
        
        .pw-product-name { 
            font-size: 16px; 
            font-weight: 600; 
            color: #1e293b;
            max-height: 40px; 
            overflow: hidden; 
            margin-bottom: 4px;
        }
        
        .pw-product-price { 
            font-size: 14px; 
            color: #14b8a6; 
            font-weight: 600;
        }
        
        .pw-btn-primary, .pw-btn-secondary, .pw-answer-btn { 
            border: none; 
            padding: 14px 24px; 
            border-radius: 12px; 
            cursor: pointer; 
            font-size: 15px; 
            font-weight: 600; 
            transition: all 0.2s ease;
            margin: 6px;
        }
        
        .pw-btn-primary { 
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); 
            color: white;
            box-shadow: 0 4px 14px -2px rgba(20, 184, 166, 0.4);
        }
        
        .pw-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 18px -2px rgba(20, 184, 166, 0.5);
        }
        
        .pw-btn-secondary { 
            background: #e2e8f0; 
            color: #334155; 
        }
        
        .pw-btn-secondary:hover {
            background: #cbd5e1;
            transform: translateY(-1px);
        }
        
        .pw-answer-btn { 
            background: #fff; 
            border: 1px solid #e2e8f0;
            margin: 4px;
            min-width: 120px;
        }
        
        .pw-answer-btn:hover {
            border-color: #14b8a6;
            background: #f0fdfa;
            transform: translateY(-1px);
        }

        @keyframes overlayFadeIn { 
            from { opacity: 0; } 
            to { opacity: 1; } 
        }
        
        @keyframes promptSlideIn { 
            from { opacity: 0; transform: scale(0.95) translateY(20px); } 
            to { opacity: 1; transform: scale(1) translateY(0); } 
        }
    </style>
`;
    document.body.insertAdjacentHTML('beforeend', promptHTML);
    renderContent();
}


/**
 * This function is now completely self-contained. It defines its own helper
 * functions, ensuring they are available in the execution context and making the buttons clickable.
 */
/**
 * Updated showInvestmentSurvey function that properly handles profile updates
 */
// FIXED AND RESTORED FUNCTION
function showInvestmentSurvey(eventId) {
    // Ensure no old popups exist
    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) oldPrompt.remove();

    const surveyHTML = `
        <div class="pw-survey-modal">
            <div class="pw-survey-header">
                <h2 class="pw-survey-title">Quick Investment Profile</h2>
                <p class="pw-survey-subtitle">Help us recommend the best options for you</p>
            </div>
            <div class="pw-survey-body">
                <div class="pw-survey-question">
                    <h4>What's your risk tolerance?</h4>
                    <div class="pw-survey-options-grid">
                        <button class="pw-survey-option-card" data-category="risk_level" data-value="low">
                            <div class="pw-option-icon">🛡️</div>
                            <div class="pw-option-title">Low</div>
                            <div class="pw-option-subtitle">Safe & Steady</div>
                        </button>
                        <button class="pw-survey-option-card" data-category="risk_level" data-value="medium">
                            <div class="pw-option-icon">⚖️</div>
                            <div class="pw-option-title">Medium</div>
                            <div class="pw-option-subtitle">Balanced Growth</div>
                        </button>
                        <button class="pw-survey-option-card" data-category="risk_level" data-value="high">
                            <div class="pw-option-icon">🚀</div>
                            <div class="pw-option-title">High</div>
                            <div class="pw-option-subtitle">Maximum Returns</div>
                        </button>
                    </div>
                </div>
                <div class="pw-survey-question">
                    <h4>Investment duration preference?</h4>
                    <div class="pw-survey-options-grid">
                        <button class="pw-survey-option-card" data-category="duration" data-value="short">
                            <div class="pw-option-icon">⏰</div>
                            <div class="pw-option-title">Short</div>
                            <div class="pw-option-subtitle">(1-2 years)</div>
                        </button>
                        <button class="pw-survey-option-card" data-category="duration" data-value="medium">
                            <div class="pw-option-icon">🗓️</div>
                            <div class="pw-option-title">Medium</div>
                            <div class="pw-option-subtitle">(3-5 years)</div>
                        </button>
                        <button class="pw-survey-option-card" data-category="duration" data-value="long">
                            <div class="pw-option-icon">🏛️</div>
                            <div class="pw-option-title">Long</div>
                            <div class="pw-option-subtitle">(5+ years)</div>
                        </button>
                    </div>
                </div>
                <div class="pw-survey-question">
                    <h4>Current financial situation?</h4>
                    <div class="pw-survey-options-grid">
                        <button class="pw-survey-option-card" data-category="financial_stability" data-value="unstable">
                            <div class="pw-option-icon">😰</div>
                            <div class="pw-option-title">Tough</div>
                            <div class="pw-option-subtitle">Limited Budget</div>
                        </button>
                        <button class="pw-survey-option-card" data-category="financial_stability" data-value="stable">
                            <div class="pw-option-icon">😊</div>
                            <div class="pw-option-title">Comfortable</div>
                            <div class="pw-option-subtitle">Stable Income</div>
                        </button>
                        <button class="pw-survey-option-card" data-category="financial_stability" data-value="moderate">
                            <div class="pw-option-icon">💪</div>
                            <div class="pw-option-title">Flexible</div>
                            <div class="pw-option-subtitle">Extra Savings</div>
                        </button>
                    </div>
                </div>
            </div>
            <div class="pw-survey-actions">
                <button id="pw-survey-cancel-btn">Cancel</button>
                <button id="surveySubmit">Get Recommendations</button>
            </div>
        </div>
    `;

    const promptContainerHTML = `
    <div id="pocketwisely-prompt-overlay">
        <div id="pocketwisely-prompt">${surveyHTML}</div>
    </div>
    <style>
        #pocketwisely-prompt-overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            background-color: rgba(10, 20, 30, 0.6); 
            backdrop-filter: blur(8px); 
            z-index: 2147483647; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            padding: 20px 15px; 
            animation: overlayFadeIn 0.3s ease-out; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
        }
        #pocketwisely-prompt { 
            background: transparent; 
            width: 100%; 
            max-width: 560px; 
            max-height: calc(100vh - 40px); 
            text-align: center; 
            border: 0; 
            animation: promptSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); 
            display: flex; 
            flex-direction: column; 
        }
        
        .pw-survey-modal { 
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); 
            border-radius: 24px; 
            text-align: center; 
            width: 100%; 
            box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.25); 
            display: flex; 
            flex-direction: column; 
            max-height: 100%; 
            overflow: hidden; 
            border: 1px solid rgba(255, 255, 255, 0.8);
        }
        .pw-survey-header { 
            padding: 32px 28px 24px; 
            text-align: center; 
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); 
            border-bottom: 1px solid #e2e8f0; 
        }
        .pw-survey-title { 
            color: #1e293b; 
            font-size: 28px; 
            font-weight: 700; 
            margin: 0 0 8px; 
            letter-spacing: -0.5px;
        }
        .pw-survey-subtitle { 
            color: #64748b; 
            font-size: 16px; 
            margin: 0; 
            line-height: 1.5; 
            font-weight: 400;
        }

        .pw-survey-body { 
            padding: 24px 28px; 
            overflow-y: auto; 
            flex: 1;
            max-height: 400px;
        }
        .pw-survey-question { 
            margin-bottom: 32px; 
        }
        .pw-survey-question:last-child { 
            margin-bottom: 0; 
        }
        .pw-survey-question h4 { 
            color: #334155; 
            font-size: 20px; 
            margin: 0 0 20px; 
            font-weight: 600; 
            text-align: center;
        }
        
        .pw-survey-options-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 16px; 
            justify-content: center;
        }
        
        .pw-survey-option-card { 
            background: #ffffff; 
            border: 2px solid #e2e8f0; 
            color: #334155; 
            padding: 24px 16px; 
            border-radius: 16px; 
            cursor: pointer; 
            transition: all 0.3s ease; 
            text-align: center; 
            min-height: 140px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
        }
        
        .pw-survey-option-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(20, 184, 166, 0.05) 0%, rgba(20, 184, 166, 0.02) 100%);
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        .pw-survey-option-card:hover { 
            border-color: #14b8a6; 
            transform: translateY(-4px); 
            box-shadow: 0 12px 32px -8px rgba(20, 184, 166, 0.3);
        }
        
        .pw-survey-option-card:hover::before {
            opacity: 1;
        }
        
        .pw-survey-option-card.selected { 
            border-color: #14b8a6; 
            background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%); 
            color: #0f766e; 
            font-weight: 600; 
            box-shadow: 0 8px 25px rgba(20, 184, 166, 0.25); 
            transform: translateY(-2px);
        }

        .pw-option-icon {
            font-size: 32px;
            margin-bottom: 12px;
            display: block;
            line-height: 1;
        }
        
        .pw-option-title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 6px;
            color: inherit;
        }
        
        .pw-option-subtitle {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
            line-height: 1.3;
        }
        
        .pw-survey-option-card.selected .pw-option-subtitle {
            color: #14b8a6;
        }

        .pw-survey-actions { 
            display: flex; 
            gap: 16px; 
            padding: 24px 28px; 
            background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); 
            border-top: 1px solid #e2e8f0; 
        }
        .pw-survey-actions button { 
            flex-grow: 1; 
            border: none; 
            padding: 16px 24px; 
            border-radius: 14px; 
            font-size: 16px; 
            font-weight: 600; 
            cursor: pointer; 
            transition: all 0.3s ease; 
            font-family: inherit;
        }
        #pw-survey-cancel-btn { 
            background: #f1f5f9; 
            color: #475569; 
            border: 1px solid #e2e8f0;
        }
        #pw-survey-cancel-btn:hover { 
            background: #e2e8f0; 
            transform: translateY(-1px);
        }
        #surveySubmit { 
            background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); 
            color: #fff; 
            cursor: not-allowed; 
            opacity: 0.6;
        }
        #surveySubmit.enabled { 
            background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); 
            color: #fff; 
            box-shadow: 0 6px 20px -4px rgba(20, 184, 166, 0.4); 
            cursor: pointer; 
            opacity: 1;
        }
        #surveySubmit.enabled:hover { 
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); 
            transform: translateY(-2px); 
            box-shadow: 0 8px 25px -4px rgba(20, 184, 166, 0.5);
        }

        @keyframes overlayFadeIn { 
            from { opacity: 0; } 
            to { opacity: 1; } 
        }
        @keyframes promptSlideIn { 
            from { opacity: 0; transform: scale(0.95) translateY(20px); } 
            to { opacity: 1; transform: scale(1) translateY(0); } 
        }
        
                    /* Custom scrollbar for webkit browsers */
            .pw-survey-body::-webkit-scrollbar {
                width: 6px;
            }

            .pw-survey-body::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }

            .pw-survey-body::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }

            .pw-survey-body::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }
            
            /* Mobile responsive */
        @media (max-width: 600px) {
            .pw-survey-options-grid {
                grid-template-columns: 1fr;
                gap: 12px;
            }
            
            .pw-survey-option-card {
                min-height: 120px;
                padding: 20px 16px;
            }
            
            .pw-option-icon {
                font-size: 28px;
                margin-bottom: 10px;
            }
            
            .pw-option-title {
                font-size: 16px;
            }
            
            .pw-survey-header {
                padding: 24px 20px 20px;
            }
            
            .pw-survey-title {
                font-size: 24px;
            }
            
            .pw-survey-body {
                padding: 20px;
            }
            
            .pw-survey-actions {
                padding: 20px;
                gap: 12px;
            }
        }
    </style>
`;
    document.body.insertAdjacentHTML('beforeend', promptContainerHTML);

    // --- SELF-CONTAINED LOGIC (unchanged) ---
    const surveyAnswers = { risk_level: null, duration: null, financial_stability: null };
    const submitBtn = document.getElementById('surveySubmit');
    const cancelBtn = document.getElementById('pw-survey-cancel-btn');
    const optionButtons = document.querySelectorAll('.pw-survey-option-card');

    function checkSurveyComplete() {
        const allAnswered = Object.values(surveyAnswers).every(answer => answer !== null);
        if (allAnswered) {
            submitBtn.classList.add('enabled');
        } else {
            submitBtn.classList.remove('enabled');
        }
    }

    optionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            const value = button.dataset.value;
            surveyAnswers[category] = value;
            
            const questionContainer = button.closest('.pw-survey-question');
            questionContainer.querySelectorAll('.pw-survey-option-card').forEach(opt => opt.classList.remove('selected'));
            button.classList.add('selected');

            checkSurveyComplete();
        });
    });

    submitBtn.addEventListener('click', () => {
        if (submitBtn.classList.contains('enabled')) {
            console.log('Survey submitted with answers:', surveyAnswers, 'eventId:', eventId);
            
            // Show loading state
            const contentEl = document.querySelector('#pocketwisely-prompt .pw-survey-modal');
            if(contentEl) {
                contentEl.innerHTML = `<div style="font-size: 18px; color: #64748b; padding: 80px 20px; text-align: center;">
                    <div style="margin-bottom: 16px; font-size: 48px;">🔄</div>
                    <div style="font-weight: 600; margin-bottom: 8px; color: #1e293b;">Finding the best investment for you...</div>
                    <div style="font-size: 14px;">This will just take a moment</div>
                </div>`;
            }
            
            // CRITICAL: This now sends to updateInvestmentRecommendation action
            // which will update the profile AND get new recommendation
            chrome.runtime.sendMessage({
                action: "updateInvestmentRecommendation",
                eventId: eventId,
                answers: surveyAnswers
            });
        }
    });

    cancelBtn.addEventListener('click', () => {
        document.getElementById('pocketwisely-prompt-overlay')?.remove();
    });
}


// --- NEW INJECTABLE FUNCTION ---
// --- UPDATED INJECTABLE FUNCTION WITH SCROLLABLE DESIGN ---
// --- UPDATED INJECTABLE FUNCTION WITH SCROLLABLE DESIGN ---
function showAdvancedRecommendationPopup(recData, eventId) {
    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) oldPrompt.remove();
    
    // Helper for currency formatting
    const formatCurrency = (num) => `₹${Math.round(num).toLocaleString('en-IN')}`;

    const recommendationHTML = `
        <div id="pocketwisely-prompt-overlay">
            <div id="pocketwisely-prompt">
                <div class="pw-rec-modal">
                    <div class="pw-rec-header">
                        <h2 class="pw-rec-title">Your Top Investment Match</h2>
                        <p class="pw-rec-subtitle">Based on your profile, here's our top suggestion for your <strong>${formatCurrency(recData.investment_amount)}</strong>.</p>
                    </div>
                    <div class="pw-rec-body">
                        <div class="pw-rec-product-card">
                            <h3>${recData.product_name}</h3>
                            <div class="pw-rec-tags">
                                <span class="pw-rec-tag risk-${recData.risk_level.toLowerCase()}">${recData.risk_level} Risk</span>
                                <span class="pw-rec-tag">${recData.liquidity} Liquidity</span>
                            </div>
                            <div class="pw-rec-returns">
                                <small>Expected Annual Returns</small>
                                <strong>${recData.expected_return.low}% - ${recData.expected_return.high}%</strong>
                            </div>
                        </div>

                        <div class="pw-rec-calculator">
                            <div class="pw-rec-calc-header">
                                <h4>Potential Growth in <span id="pw-time-val">${recData.time_horizon_display || recData.time_horizon_years + ' years'}</span></h4>
                                <h2 id="pw-future-val-display">${formatCurrency(recData.future_values.low)} - ${formatCurrency(recData.future_values.high)}</h2>
                            </div>
                            <div class="pw-rec-calc-slider">
                                <label for="pw-time-slider">Adjust Time Horizon (30 days to 10 years)</label>
                                <input type="range" min="0" max="120" value="${recData.time_horizon_months || recData.time_horizon_years * 12}" id="pw-time-slider">
                            </div>
                        </div>

                        <div class="pw-rec-benefits">
                            <h4>Why This Investment?</h4>
                            <div class="pw-benefit-item">
                                <span class="pw-benefit-icon">✓</span>
                                <div>
                                    <strong>Matches Your Risk Profile</strong>
                                    <p>Carefully selected based on your ${recData.risk_level.toLowerCase()} risk tolerance preferences.</p>
                                </div>
                            </div>
                            <div class="pw-benefit-item">
                                <span class="pw-benefit-icon">✓</span>
                                <div>
                                    <strong>Optimal Time Horizon</strong>
                                    <p>Perfect for your ${recData.time_horizon_display || recData.time_horizon_years + '-year'} investment timeline.</p>
                                </div>
                            </div>
                            <div class="pw-benefit-item">
                                <span class="pw-benefit-icon">✓</span>
                                <div>
                                    <strong>Professional Management</strong>
                                    <p>Managed by experienced fund managers with proven track records.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="pw-rec-actions">
                        <button id="pw-change-prefs-btn">Change Preferences</button>
                        <button id="pw-invest-now-btn">Invest Now</button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            /* Overlay and main container */
            #pocketwisely-prompt-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(10, 20, 30, 0.5);
                backdrop-filter: blur(5px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px 15px;
                animation: overlayFadeIn 0.3s ease-out;
            }

            #pocketwisely-prompt {
                background: transparent;
                width: 100%;
                max-width: 480px;
                max-height: calc(100vh - 40px);
                text-align: center;
                border: 0;
                animation: promptSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                display: flex;
                flex-direction: column;
            }

            /* Main modal container - KEY CHANGE: Added flex structure */
            .pw-rec-modal {
                background: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border-radius: 20px;
                text-align: left;
                width: 100%;
                box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.2);
                display: flex;
                flex-direction: column;
                max-height: 100%;
                overflow: hidden;
            }

            /* Header - fixed at top */
            .pw-rec-header {
                padding: 24px 28px;
                text-align: center;
                background: #fff;
                border-bottom: 1px solid #eaf0f6;
                flex-shrink: 0;
            }

            .pw-rec-title {
                color: #1e293b;
                font-size: 22px;
                font-weight: 700;
                margin: 0 0 6px;
            }

            .pw-rec-subtitle {
                color: #64748b;
                font-size: 14px;
                margin: 0;
                line-height: 1.5;
            }

            /* Body - scrollable content */
            .pw-rec-body {
                padding: 24px 28px;
                overflow-y: auto;
                flex: 1;
                min-height: 0;
            }

            /* Product card */
            .pw-rec-product-card {
                background: #fff;
                border: 1px solid #eaf0f6;
                padding: 20px;
                border-radius: 16px;
                margin-bottom: 20px;
                box-shadow: 0 4px 10px -2px rgba(0, 0, 0, 0.05);
            }

            .pw-rec-product-card h3 {
                margin: 0 0 12px;
                font-size: 20px;
                color: #1e293b;
            }

            .pw-rec-tags {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
                flex-wrap: wrap;
            }

            .pw-rec-tag {
                font-size: 11px;
                font-weight: 600;
                padding: 4px 10px;
                border-radius: 20px;
                background: #eef2ff;
                color: #4338ca;
                white-space: nowrap;
            }

            .pw-rec-tag.risk-low {
                background-color: #dcfce7;
                color: #166534;
            }

            .pw-rec-tag.risk-medium {
                background-color: #ffedd5;
                color: #9a3412;
            }

            .pw-rec-tag.risk-high {
                background-color: #fee2e2;
                color: #991b1b;
            }

            .pw-rec-returns {
                text-align: right;
            }

            .pw-rec-returns small {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-bottom: 2px;
            }

            .pw-rec-returns strong {
                font-size: 20px;
                color: #14b8a6;
                font-weight: 700;
            }

            /* Calculator section */
            .pw-rec-calculator {
                background: #fff;
                border-radius: 16px;
                padding: 20px;
                border: 1px solid #eaf0f6;
                margin-bottom: 20px;
            }

            .pw-rec-calc-header {
                text-align: center;
                margin-bottom: 16px;
            }

            .pw-rec-calc-header h4 {
                margin: 0 0 8px;
                font-size: 14px;
                font-weight: 500;
                color: #475569;
            }

            .pw-rec-calc-header h2 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
                color: #0f172a;
            }

            .pw-rec-calc-slider label {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-bottom: 8px;
                text-align: center;
            }

            #pw-time-slider {
                width: 100%;
                -webkit-appearance: none;
                height: 8px;
                background: #e2e8f0;
                border-radius: 5px;
                outline: none;
                margin-top: 8px;
            }

            #pw-time-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                background: #14b8a6;
                cursor: pointer;
                border-radius: 50%;
            }

            #pw-time-slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                background: #14b8a6;
                cursor: pointer;
                border-radius: 50%;
                border: none;
            }

            /* Benefits section */
            .pw-rec-benefits {
                background: #fff;
                border-radius: 16px;
                padding: 20px;
                border: 1px solid #eaf0f6;
            }

            .pw-rec-benefits h4 {
                margin: 0 0 16px;
                font-size: 18px;
                color: #1e293b;
                font-weight: 600;
            }

            .pw-benefit-item {
                display: flex;
                gap: 12px;
                margin-bottom: 16px;
                align-items: flex-start;
            }

            .pw-benefit-item:last-child {
                margin-bottom: 0;
            }

            .pw-benefit-icon {
                width: 20px;
                height: 20px;
                background: #14b8a6;
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: 600;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .pw-benefit-item strong {
                display: block;
                font-size: 14px;
                color: #1e293b;
                margin-bottom: 4px;
                font-weight: 600;
            }

            .pw-benefit-item p {
                font-size: 13px;
                color: #64748b;
                margin: 0;
                line-height: 1.4;
            }

            /* Actions - fixed at bottom */
            .pw-rec-actions {
                display: flex;
                gap: 12px;
                padding: 20px 28px;
                background: #fff;
                border-top: 1px solid #eaf0f6;
                flex-shrink: 0;
            }

            .pw-rec-actions button {
                flex-grow: 1;
                border: none;
                padding: 14px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            #pw-change-prefs-btn {
                background: #e2e8f0;
                color: #334155;
            }

            #pw-change-prefs-btn:hover {
                background: #cbd5e1;
                transform: translateY(-1px);
            }

            #pw-invest-now-btn {
                background: #14b8a6;
                color: #fff;
                box-shadow: 0 4px 14px -2px rgba(20, 184, 166, 0.4);
            }

            #pw-invest-now-btn:hover {
                background: #0d9488;
                transform: translateY(-1px);
                box-shadow: 0 6px 18px -2px rgba(20, 184, 166, 0.5);
            }

            /* Animations */
            @keyframes overlayFadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @keyframes promptSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            /* Custom scrollbar for webkit browsers */
            .pw-rec-body::-webkit-scrollbar {
                width: 6px;
            }

            .pw-rec-body::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }

            .pw-rec-body::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 3px;
            }

            .pw-rec-body::-webkit-scrollbar-thumb:hover {
                background: #94a3b8;
            }

            /* Mobile responsive adjustments */
            @media (max-height: 600px) {
                #pocketwisely-prompt-overlay {
                    padding: 10px;
                }
                
                .pw-rec-header {
                    padding: 16px 20px;
                }
                
                .pw-rec-body {
                    padding: 16px 20px;
                }
                
                .pw-rec-actions {
                    padding: 16px 20px;
                }
            }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', recommendationHTML);

    // --- Enhanced Calculator Logic for Months ---
    const slider = document.getElementById('pw-time-slider');
    const timeVal = document.getElementById('pw-time-val');
    const futureValDisplay = document.getElementById('pw-future-val-display');
    
    const P = recData.investment_amount;
    const r_low = recData.expected_return.low / 100;
    const r_high = recData.expected_return.high / 100;

    function formatTimeDisplay(months) {
        if (months < 12) {
            return months === 1 ? '1 month' : `${months} months`;
        } else {
            const years = Math.floor(months / 12);
            const remainingMonths = months % 12;
            if (remainingMonths === 0) {
                return years === 1 ? '1 year' :` ${years} years`;
            } else {
                return `${years}y ${remainingMonths}m`;
            }
        }
    }

    function updateCalculator(months) {
        const n = parseInt(months, 10);
        const timeInYears = n / 12;
        
        // Calculate future values
        const FV_low = P * Math.pow((1 + r_low), timeInYears);
        const FV_high = P * Math.pow((1 + r_high), timeInYears);
        
        // Update display
        timeVal.textContent = formatTimeDisplay(n);
        futureValDisplay.textContent = `${formatCurrency(FV_low)} - ${formatCurrency(FV_high)}`;
    }

    if (slider) {
        slider.addEventListener('input', (e) => updateCalculator(e.target.value));
    }

    // --- Button Logic ---
    const changePrefBtn = document.getElementById('pw-change-prefs-btn');
    const investNowBtn = document.getElementById('pw-invest-now-btn');

    if (changePrefBtn) {
        changePrefBtn.addEventListener('click', () => {
            console.log('Change preferences clicked, eventId:', eventId);
            // Remove current popup first
            const overlay = document.getElementById('pocketwisely-prompt-overlay');
            if (overlay) overlay.remove();
            // Then show investment survey
            chrome.runtime.sendMessage({ action: "showInvestmentSurvey", eventId: eventId });
        });
    }

    if (investNowBtn) {
        investNowBtn.addEventListener('click', () => {
            window.open(recData.redirect_url, '_blank');
            const overlay = document.getElementById('pocketwisely-prompt-overlay');
            if (overlay) overlay.remove();
        });
    }

    // Add escape key listener for better UX
    document.addEventListener('keydown', function escapeHandler(e) {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('pocketwisely-prompt-overlay');
            if (overlay) {
                overlay.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        }
    });
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
        // ENHANCED SIMPLE POPUP STYLING
        adviceHTML = `
            <div class="pw-simple-header">
                <div class="pw-thinking-icon">🤔</div>
                <h2 class="pw-simple-title">Take a Moment to Consider</h2>
            </div>
            <div class="pw-mindful-question">
                <div class="pw-question-icon">💭</div>
                <p class="pw-question-text">${advice.question}</p>
            </div>
            <div class="pw-simple-buttons">
                <button id="pw-cancel-final" class="pw-btn-wait">
                    <span class="pw-btn-icon">⏰</span>
                    <span class="pw-btn-text">I'll Wait</span>
                </button>
                <button id="pw-proceed-anyway" class="pw-btn-proceed">
                    <span class="pw-btn-icon">✓</span>
                    <span class="pw-btn-text">Proceed with Purchase</span>
                </button>
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
            #pocketwisely-prompt-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(10, 20, 30, 0.6);
                backdrop-filter: blur(8px);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px 15px;
                animation: overlayFadeIn 0.3s ease-out;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }

            #pocketwisely-prompt {
                background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
                border-radius: 20px;
                box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.25);
                width: 100%;
                max-width: 450px;
                text-align: center;
                border: 0;
                animation: promptSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
                max-height: calc(100vh - 40px);
                overflow: hidden;
                border: 1px solid rgba(255, 255, 255, 0.8);
            }

            #pw-content-area {
                padding: 32px 28px;
            }

            /* Simple popup specific styles */
            .pw-simple-header {
                text-align: center;
                margin-bottom: 24px;
            }

            .pw-thinking-icon {
                width: 56px;
                height: 56px;
                background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
                margin: 0 auto 16px;
                box-shadow: 0 6px 20px rgba(20, 184, 166, 0.3);
                animation: gentle-pulse 2s infinite;
            }

            @keyframes gentle-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            .pw-simple-title {
                color: #1e293b;
                font-size: 24px;
                font-weight: 700;
                margin: 0;
                letter-spacing: -0.5px;
            }

            .pw-mindful-question {
                background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
                border: 1px solid #a7f3d0;
                border-radius: 16px;
                padding: 24px 20px;
                margin-bottom: 28px;
                display: flex;
                align-items: flex-start;
                gap: 16px;
                text-align: left;
            }

            .pw-question-icon {
                font-size: 24px;
                flex-shrink: 0;
                margin-top: 2px;
            }

            .pw-question-text {
                color: #134e4a;
                font-size: 16px;
                font-weight: 500;
                margin: 0;
                line-height: 1.5;
                flex: 1;
            }

            .pw-simple-buttons {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .pw-btn-wait, .pw-btn-proceed {
                border: none;
                border-radius: 14px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 16px 24px;
                flex: 1;
                justify-content: center;
                font-family: inherit;
                position: relative;
                overflow: hidden;
            }

            .pw-btn-wait::before,
            .pw-btn-proceed::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
                transform: translateX(-100%);
                transition: transform 0.6s ease;
            }

            .pw-btn-wait:hover::before,
            .pw-btn-proceed:hover::before {
                transform: translateX(100%);
            }

            .pw-btn-wait {
                background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
                color: #475569;
                border: 1px solid #cbd5e1;
            }

            .pw-btn-wait:hover {
                background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px -8px rgba(71, 85, 105, 0.3);
            }

            .pw-btn-proceed {
                background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
                color: white;
                box-shadow: 0 4px 15px -2px rgba(20, 184, 166, 0.4);
            }

            .pw-btn-proceed:hover {
                background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                transform: translateY(-2px);
                box-shadow: 0 8px 25px -2px rgba(20, 184, 166, 0.5);
            }

            .pw-btn-icon {
                font-size: 16px;
                display: flex;
                align-items: center;
            }

            .pw-btn-text {
                font-weight: 600;
            }

            /* Original impulsive popup styles (unchanged) */
            .pw-alert-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                margin-bottom: 20px;
            }

            .pw-warning-icon {
                width: 24px;
                height: 24px;
                background: #fbbf24;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #fff;
                font-weight: 700;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(251, 191, 36, 0.4);
            }

            .pw-alert-title {
                color: #1f2937;
                font-size: 24px;
                font-weight: 700;
                margin: 0;
            }

            .pw-alert-subtitle {
                color: #4b5563;
                font-size: 16px;
                line-height: 1.6;
                margin: 0 0 28px;
                text-align: center;
            }

            .pw-button-container {
                display: flex;
                gap: 12px;
                flex-direction: column;
                margin-top: 0;
            }

            .pw-invest-btn {
                background: #2dd4bf;
                color: #fff;
                border: none;
                padding: 16px 20px;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 10px;
                transition: all 0.2s ease;
                box-shadow: 0 4px 15px -2px rgba(45, 212, 191, 0.3);
            }

            .pw-invest-btn:hover {
                background: #14b8a6;
                transform: translateY(-2px);
                box-shadow: 0 6px 20px -2px rgba(45, 212, 191, 0.4);
            }

            .pw-proceed-btn {
                background: #f3f4f6;
                color: #4b5563;
                border: none;
                padding: 14px 20px;
                border-radius: 12px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .pw-proceed-btn:hover {
                background: #e5e7eb;
            }

            /* Animations */
            @keyframes overlayFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes promptSlideIn {
                from { opacity: 0; transform: scale(0.95) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }

            /* Mobile responsive */
            @media (max-width: 480px) {
                #pocketwisely-prompt {
                    max-width: 95%;
                    margin: 10px;
                }

                #pw-content-area {
                    padding: 24px 20px;
                }

                .pw-simple-buttons {
                    flex-direction: column;
                    gap: 10px;
                }

                .pw-btn-wait, .pw-btn-proceed {
                    padding: 14px 20px;
                }

                .pw-mindful-question {
                    padding: 20px 16px;
                }

                .pw-simple-title {
                    font-size: 20px;
                }
            }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', promptContainerHTML);

    // Your existing event listener logic remains unchanged
    if (advice.type === 'impulsive') {
        const investBtn = document.getElementById('pw-invest-btn-main');
        if (investBtn) {
            investBtn.addEventListener('click', () => {
               chrome.runtime.sendMessage({ action: "handleInvestmentFlow", eventId: eventId });
            });
        }
        const proceedBtn = document.getElementById('pw-proceed-btn-main');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                const confirmed = confirm('⚠️ Are you absolutely sure? This purchase might delay your financial goals.');
                if (confirmed) {
                    document.getElementById('pocketwisely-prompt-overlay')?.remove();
                    chrome.runtime.sendMessage({ action: "logFinalDecision", eventId: eventId, decision: "proceeded_after_advice" });
                }
            });
        }
    }
    else {
    // Event listeners for simple popup (non-impulsive)
    const waitBtn = document.getElementById('pw-cancel-final');
    const proceedBtn = document.getElementById('pw-proceed-anyway');
    
    if (waitBtn) {
        waitBtn.addEventListener('click', () => {
            // Close current popup
            document.getElementById('pocketwisely-prompt-overlay')?.remove();
            
            // Log that user decided to wait
            chrome.runtime.sendMessage({ 
                action: "logFinalDecision", 
                eventId: eventId, 
                decision: "waited_after_consideration" 
            });
            
            // Show purchase page again after a short delay
            setTimeout(() => {
                // You can redirect to the purchase page or show a message
                window.location.reload(); // Refreshes the page to show original state
            }, 1000);
        });
    }
    
    if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
            // Close popup
            document.getElementById('pocketwisely-prompt-overlay')?.remove();
            
            // Log final decision
            chrome.runtime.sendMessage({ 
                action: "logFinalDecision", 
                eventId: eventId, 
                decision: "proceeded_after_consideration" 
            });
            
            // Unlock the add to cart button (this function should already exist in your code)
            chrome.runtime.sendMessage({ 
                action: "unlockAddToCartButton" 
            });
        });
    }
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

        else if (request.action === "logDecision") {
            await fetch(`${BACKEND_URL}/api/event/decide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: request.eventId, decision: request.decision })
            });
        }
        
        else if (request.action === "surveyCompleted") {
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

        else if (request.action === "unlockAddToCartButton") {
    // Unlock the add to cart button on the current tab
    chrome.scripting.executeScript({ 
        target: { tabId: tab.id }, 
        func: unlockButton 
    });
    }
        // CORRECTED handleInvestmentFlow handler
        else if (request.action === "handleInvestmentFlow") {
            try {
                console.log('handleInvestmentFlow called for eventId:', request.eventId);
                
                const profileResponse = await fetch(`${BACKEND_URL}/api/user/profile?userId=${userId}`);
                console.log('Profile response status:', profileResponse.status);
                
                if (profileResponse.ok) {
                    const profileData = await profileResponse.json();
                    console.log('Profile data:', profileData);
                    
                    // Check if user has a complete profile
                    if (profileData && profileData.risk_tolerance && profileData.investment_duration && profileData.financial_status) { 
                        console.log('User has existing profile, getting recommendation...');
                        
                        // User has profile, get recommendation directly
                        const answers = {
                            risk_level: profileData.risk_tolerance,
                            duration: profileData.investment_duration,
                            financial_stability: profileData.financial_status
                        };
                        
                        // Get recommendation using existing profile
                        const recResponse = await fetch(`${BACKEND_URL}/api/get-recommendation`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                eventId: request.eventId,
                                answers: answers
                            })
                        });

                        if (recResponse.ok) {
                            const recData = await recResponse.json();
                            console.log('Got recommendation:', recData);
                            
                            // Show recommendation popup directly
                            chrome.scripting.executeScript({
                                target: { tabId: tab.id },
                                func: showAdvancedRecommendationPopup,
                                args: [recData, request.eventId]
                            });
                        } else {
                            console.error("Failed to get recommendation:", await recResponse.text());
                            // Fallback to survey if recommendation fails
                            chrome.scripting.executeScript({ 
                                target: { tabId: tab.id }, 
                                func: showInvestmentSurvey, 
                                args: [request.eventId] 
                            });
                        }
                    } else { 
                        console.log('User profile incomplete, showing survey...');
                        // Profile is incomplete, show survey
                        chrome.scripting.executeScript({ 
                            target: { tabId: tab.id }, 
                            func: showInvestmentSurvey, 
                            args: [request.eventId] 
                        });
                    }
                } else { 
                    console.log('No profile found, showing survey...');
                    // No profile found, show survey
                    chrome.scripting.executeScript({ 
                        target: { tabId: tab.id }, 
                        func: showInvestmentSurvey, 
                        args: [request.eventId] 
                    });
                }
            } catch (error) {
                console.error('Error in handleInvestmentFlow:', error);
                // Fallback to survey on any error
                chrome.scripting.executeScript({ 
                    target: { tabId: tab.id }, 
                    func: showInvestmentSurvey, 
                    args: [request.eventId] 
                });
            }
        }

        else if (request.action === "showInvestmentSurvey") {
            chrome.scripting.executeScript({ 
                target: { tabId: tab.id }, 
                func: showInvestmentSurvey, 
                args: [request.eventId] 
            });
        }

        // --- ORIGINAL getInvestmentRecommendation action (for first-time users) ---
        else if (request.action === "getInvestmentRecommendation") {
            try {
                // 1. First, save the user's profile
                const profileSaveResponse = await fetch(`${BACKEND_URL}/api/user/profile`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId, answers: request.answers })
                });

                if (!profileSaveResponse.ok) {
                    throw new Error(`Profile save failed: ${await profileSaveResponse.text()}`);
                }

                console.log('New profile saved successfully');

                // 2. Then, get the tailored recommendation
                const recResponse = await fetch(`${BACKEND_URL}/api/get-recommendation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId: request.eventId,
                        answers: request.answers
                    })
                });

                if (recResponse.ok) {
                    const recData = await recResponse.json();
                    console.log('Got new user recommendation:', recData);
                    
                    // 3. Display the recommendation popup
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: showAdvancedRecommendationPopup,
                        args: [recData, request.eventId]
                    });
                } else {
                    console.error("Failed to get recommendation:", await recResponse.text());
                    // Show error to user
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: function() {
                            alert('Failed to get investment recommendation. Please try again.');
                        }
                    });
                }
            } catch (error) {
                console.error('Error in getInvestmentRecommendation:', error);
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: function() {
                        alert('Connection error. Please check your internet and try again.');
                    }
                });
            }
        }

        // --- NEW updateInvestmentRecommendation action (for profile updates) ---
        else if (request.action === "updateInvestmentRecommendation") {
            try {
                console.log('updateInvestmentRecommendation called with:', request.answers, 'eventId:', request.eventId);
                
                // 1. First, UPDATE the user's profile in the database
                const profileUpdateResponse = await fetch(`${BACKEND_URL}/api/user/profile`, {
                    method: 'POST', // or PUT depending on your API
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        userId: userId, 
                        answers: request.answers 
                    })
                });

                if (!profileUpdateResponse.ok) {
                    throw new Error(`Profile update failed: ${await profileUpdateResponse.text()}`);
                }
                
                console.log('Profile updated successfully');

                // 2. Then, get the NEW recommendation based on updated profile
                const recResponse = await fetch(`${BACKEND_URL}/api/get-recommendation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        eventId: request.eventId,
                        answers: request.answers
                    })
                });

                if (recResponse.ok) {
                    const recData = await recResponse.json();
                    console.log('Got updated recommendation:', recData);
                    
                    // 3. Display the updated recommendation popup
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: showAdvancedRecommendationPopup,
                        args: [recData, request.eventId]
                    });
                } else {
                    console.error("Failed to get updated recommendation:", await recResponse.text());
                    // Show error to user
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: function() {
                            const overlay = document.getElementById('pocketwisely-prompt-overlay');
                            if (overlay) {
                                overlay.innerHTML = `
                                    <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                                 background: white; padding: 30px; border-radius: 20px; text-align: center;
                                                 box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 2147483647;">
                                        <h3 style="color: #ef4444; margin-bottom: 10px;">❌ Error</h3>
                                        <p style="margin-bottom: 20px; color: #666;">Unable to get recommendation. Please try again.</p>
                                        <button onclick="this.closest('#pocketwisely-prompt-overlay').remove()" 
                                                style="background: #14b8a6; color: white; border: none; padding: 10px 20px; 
                                                       border-radius: 8px; cursor: pointer; font-weight: 600;">
                                            Close
                                        </button>
                                    </div>
                                `;
                            }
                        }
                    });
                }
                
            } catch (error) {
                console.error('Error in updateInvestmentRecommendation:', error);
                
                // Show connection error to user
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: function() {
                        const overlay = document.getElementById('pocketwisely-prompt-overlay');
                        if (overlay) {
                            overlay.innerHTML = `
                                <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                                            background: white; padding: 30px; border-radius: 20px; text-align: center;
                                            box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 2147483647;">
                                    <h3 style="color: #ef4444; margin-bottom: 10px;">❌ Connection Error</h3>
                                    <p style="margin-bottom: 20px; color: #666;">Unable to update preferences. Please check your connection.</p>
                                    <button onclick="this.closest('#pocketwisely-prompt-overlay').remove()" 
                                            style="background: #14b8a6; color: white; border: none; padding: 10px 20px; 
                                                   border-radius: 8px; cursor: pointer; font-weight: 600;">
                                        Close
                                    </button>
                                </div>
                            `;
                        }
                    }
                });
            }
        }

        else if (request.action === "logFinalDecision") {
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