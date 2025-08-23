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
                    <!-- Floating Particles Background -->
                    <div class="pw-particles-container">
                        <div class="pw-particle"></div>
                        <div class="pw-particle"></div>
                        <div class="pw-particle"></div>
                        <div class="pw-particle"></div>
                        <div class="pw-particle"></div>
                        <div class="pw-particle"></div>
                        <div class="pw-particle"></div>
                        <div class="pw-particle"></div>
                    </div>

                    <!-- Header with Animated Icon -->
                    <div class="pw-rec-header">
                        <div class="pw-header-animation">
                            <div class="pw-investment-icon">
                                <div class="pw-piggy-bank">🐷</div>
                                <!-- Falling coins animation -->
                                <div class="pw-falling-coins">
                                    <div class="pw-falling-coin">🪙</div>
                                    <div class="pw-falling-coin">🪙</div>
                                    <div class="pw-falling-coin">🪙</div>
                                    <div class="pw-falling-coin">🪙</div>
                                    <div class="pw-falling-coin">🪙</div>
                                    <div class="pw-falling-coin">🪙</div>
                                </div>
                                <!-- Money bags floating -->
                                <div class="pw-money-bags">
                                    <div class="pw-money-bag">💰</div>
                                    <div class="pw-money-bag">💰</div>
                                    <div class="pw-money-bag">💰</div>
                                </div>
                                <!-- Sparkles around piggy bank -->
                                <div class="pw-sparkles">
                                    <div class="pw-sparkle">✨</div>
                                    <div class="pw-sparkle">✨</div>
                                    <div class="pw-sparkle">✨</div>
                                    <div class="pw-sparkle">✨</div>
                                    <div class="pw-sparkle">✨</div>
                                </div>
                            </div>
                        </div>
                        <h2 class="pw-rec-title">
                            <span class="pw-title-word pw-word-1">Your</span>
                            <span class="pw-title-word pw-word-2">Top</span>
                            <span class="pw-title-word pw-word-3">Investment</span>
                            <span class="pw-title-word pw-word-4">Match</span>
                        </h2>
                        <div class="pw-wealth-progress-container">
                            <div class="pw-wealth-label">
                                <span class="pw-wealth-icon">📈</span>
                                Future Wealth Building
                            </div>
                            <div class="pw-wealth-progress-bar">
                                <div class="pw-wealth-fill"></div>
                                <div class="pw-wealth-percentage">0%</div>
                                <div class="pw-progress-sparkle">✨</div>
                            </div>
                        </div>
                    </div>

                    <div class="pw-rec-body">
                        <!-- AI Recommendation Badge -->
                        <div class="pw-ai-badge">
                            <div class="pw-ai-icon">🤖</div>
                            <span>AI Personalized Match</span>
                            <div class="pw-ai-pulse"></div>
                            <div class="pw-ai-scan-line"></div>
                        </div>

                        <!-- Product Card with Holographic Effect -->
                        <div class="pw-rec-product-card">
                            <div class="pw-holographic-overlay"></div>
                            <div class="pw-neon-border"></div>
                            <div class="pw-product-content">
                                <h3 class="pw-product-name">${recData.product_name}</h3>
                                <div class="pw-rec-tags">
                                    <span class="pw-rec-tag risk-${recData.risk_level.toLowerCase()}">
                                        <span class="pw-tag-icon">🛡</span>
                                        ${recData.risk_level} Risk
                                        <div class="pw-tag-shine"></div>
                                    </span>
                                    <span class="pw-rec-tag">
                                        <span class="pw-tag-icon">💧</span>
                                        ${recData.liquidity} Liquidity
                                        <div class="pw-tag-shine"></div>
                                    </span>
                                </div>
                                <div class="pw-rec-returns">
                                    <div class="pw-returns-animated">
                                        <small>Expected Annual Returns</small>
                                        <div class="pw-returns-value">
                                            <span class="pw-return-low">${recData.expected_return.low}%</span>
                                            <span class="pw-return-separator">-</span>
                                            <span class="pw-return-high">${recData.expected_return.high}%</span>
                                        </div>
                                        <div class="pw-returns-sparkle">✨</div>
                                        <div class="pw-returns-glow"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Interactive Calculator with Real-time Animation -->
                        <div class="pw-rec-calculator">
                            <div class="pw-calc-glow"></div>
                            <div class="pw-calculator-grid"></div>
                            <div class="pw-rec-calc-header">
                                <h4>
                                    <span class="pw-calc-icon">🚀</span>
                                    Potential Growth Simulator
                                    <span class="pw-calc-pulse"></span>
                                </h4>
                                <div class="pw-future-value-display">
                                    <div class="pw-value-container">
                                        <div class="pw-currency-symbol">₹</div>
                                        <div class="pw-animated-value" id="pw-future-val-display">${formatCurrency(recData.future_values.low)} - ${formatCurrency(recData.future_values.high)}</div>
                                        <div class="pw-value-particles">
                                            <div class="pw-value-particle"></div>
                                            <div class="pw-value-particle"></div>
                                            <div class="pw-value-particle"></div>
                                        </div>
                                    </div>
                                    <div class="pw-time-display" id="pw-time-val">${recData.time_horizon_display || recData.time_horizon_years + ' years'}</div>
                                </div>
                            </div>
                            <div class="pw-rec-calc-slider">
                                <label for="pw-time-slider">
                                    <span class="pw-slider-icon">⏰</span>
                                    Adjust Time Horizon
                                </label>
                                <div class="pw-slider-container">
                                    <input type="range" min="0" max="120" value="${recData.time_horizon_months || recData.time_horizon_years * 12}" id="pw-time-slider">
                                    <div class="pw-slider-glow"></div>
                                </div>
                                <div class="pw-slider-labels">
                                    <span>30 days</span>
                                    <span>10 years</span>
                                </div>
                            </div>
                        </div>

                        <!-- Benefits with Staggered Animation -->
                        <div class="pw-rec-benefits">
                            <h4>
                                <span class="pw-benefits-icon">💎</span>
                                Why This Investment?
                            </h4>
                            <div class="pw-benefit-item pw-benefit-1">
                                <div class="pw-benefit-icon-container">
                                    <span class="pw-benefit-icon">🎯</span>
                                    <div class="pw-icon-ripple"></div>
                                    <div class="pw-icon-glow"></div>
                                </div>
                                <div class="pw-benefit-content">
                                    <strong>Perfect Risk Match</strong>
                                    <p>Carefully selected based on your ${recData.risk_level.toLowerCase()} risk tolerance.</p>
                                </div>
                                <div class="pw-benefit-shine"></div>
                            </div>
                            <div class="pw-benefit-item pw-benefit-2">
                                <div class="pw-benefit-icon-container">
                                    <span class="pw-benefit-icon">⏰</span>
                                    <div class="pw-icon-ripple"></div>
                                    <div class="pw-icon-glow"></div>
                                </div>
                                <div class="pw-benefit-content">
                                    <strong>Optimal Timeline</strong>
                                    <p>Perfect for your ${recData.time_horizon_display || recData.time_horizon_years + '-year'} investment timeline.</p>
                                </div>
                                <div class="pw-benefit-shine"></div>
                            </div>
                            <div class="pw-benefit-item pw-benefit-3">
                                <div class="pw-benefit-icon-container">
                                    <span class="pw-benefit-icon">👨‍💼</span>
                                    <div class="pw-icon-ripple"></div>
                                    <div class="pw-icon-glow"></div>
                                </div>
                                <div class="pw-benefit-content">
                                    <strong>Expert Management</strong>
                                    <p>Managed by experienced professionals with proven track records.</p>
                                </div>
                                <div class="pw-benefit-shine"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Futuristic Action Buttons -->
                    <div class="pw-rec-actions">
                        <button id="pw-change-prefs-btn" class="pw-btn-secondary">
                            <span class="pw-btn-icon">⚙</span>
                            <span class="pw-btn-text">Change Preferences</span>
                            <div class="pw-btn-ripple"></div>
                            <div class="pw-btn-glow"></div>
                        </button>
                        <button id="pw-invest-now-btn" class="pw-btn-primary">
                            <span class="pw-btn-icon">🚀</span>
                            <span class="pw-btn-text">Invest Now</span>
                            <div class="pw-btn-ripple"></div>
                            <div class="pw-btn-particles">
                                <div class="pw-btn-particle"></div>
                                <div class="pw-btn-particle"></div>
                                <div class="pw-btn-particle"></div>
                                <div class="pw-btn-particle"></div>
                                <div class="pw-btn-particle"></div>
                            </div>
                            <div class="pw-btn-energy-field"></div>
                        </button>
                    </div>

                    <!-- Tech Grid Overlay -->
                    <div class="pw-tech-grid"></div>
                </div>
            </div>
        </div>

        <style>
            /* Base Overlay with Matrix Effect */
            #pocketwisely-prompt-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: 
                    radial-gradient(ellipse at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                    radial-gradient(ellipse at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
                    radial-gradient(ellipse at 40% 40%, rgba(20, 184, 166, 0.15) 0%, transparent 50%),
                    linear-gradient(135deg, rgba(10, 20, 30, 0.85) 0%, rgba(15, 25, 40, 0.9) 100%);
                backdrop-filter: blur(12px) saturate(180%);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 10px 8px;
                animation: overlayMagicFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            #pocketwisely-prompt {
                background: transparent;
                width: 100%;
                max-width: 480px;
                max-height: calc(100vh - 20px);
                animation: modalMagicEntry 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                position: relative;
                filter: drop-shadow(0 25px 50px rgba(20, 184, 166, 0.3));
            }

            /* Main Modal with Holographic Glass Effect */
            .pw-rec-modal {
                background: 
                    linear-gradient(135deg, 
                        rgba(255, 255, 255, 0.95) 0%, 
                        rgba(248, 250, 252, 0.9) 25%,
                        rgba(240, 249, 255, 0.92) 50%, 
                        rgba(248, 250, 252, 0.9) 75%,
                        rgba(255, 255, 255, 0.95) 100%);
                backdrop-filter: blur(25px) saturate(200%);
                border: 2px solid;
                border-image: linear-gradient(135deg, 
                    rgba(20, 184, 166, 0.4) 0%,
                    rgba(59, 130, 246, 0.4) 25%,
                    rgba(139, 92, 246, 0.4) 50%,
                    rgba(236, 72, 153, 0.4) 75%,
                    rgba(20, 184, 166, 0.4) 100%) 1;
                border-radius: 24px;
                box-shadow: 
                    0 0 80px rgba(20, 184, 166, 0.4),
                    0 0 40px rgba(59, 130, 246, 0.3),
                    0 25px 50px -12px rgba(0, 0, 0, 0.4),
                    inset 0 1px 0 rgba(255, 255, 255, 0.9),
                    inset 0 -1px 0 rgba(255, 255, 255, 0.1);
                overflow: hidden;
                position: relative;
                display: flex;
                flex-direction: column;
                max-height: 100%;
            }

            /* Tech Grid Background */
            .pw-tech-grid {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: 
                    linear-gradient(rgba(20, 184, 166, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(20, 184, 166, 0.1) 1px, transparent 1px);
                background-size: 20px 20px;
                animation: gridMove 20s linear infinite;
                pointer-events: none;
                opacity: 0.3;
            }

            /* Floating Particles Background */
            .pw-particles-container {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                overflow: hidden;
                pointer-events: none;
            }

            .pw-particle {
                position: absolute;
                width: 6px;
                height: 6px;
                background: linear-gradient(45deg, #14b8a6, #06b6d4, #8b5cf6);
                border-radius: 50%;
                animation: floatingParticles 25s infinite linear;
                box-shadow: 0 0 10px rgba(20, 184, 166, 0.8);
            }

            .pw-particle:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 20s; }
            .pw-particle:nth-child(2) { left: 20%; animation-delay: 3s; animation-duration: 22s; }
            .pw-particle:nth-child(3) { left: 30%; animation-delay: 6s; animation-duration: 18s; }
            .pw-particle:nth-child(4) { left: 50%; animation-delay: 9s; animation-duration: 24s; }
            .pw-particle:nth-child(5) { left: 70%; animation-delay: 12s; animation-duration: 16s; }
            .pw-particle:nth-child(6) { left: 80%; animation-delay: 15s; animation-duration: 26s; }
            .pw-particle:nth-child(7) { left: 40%; animation-delay: 18s; animation-duration: 21s; }
            .pw-particle:nth-child(8) { left: 60%; animation-delay: 21s; animation-duration: 19s; }

            /* Header with Enhanced Coin Animation - COMPACT */
            .pw-rec-header {
                padding: 20px 24px 16px;
                text-align: center;
                position: relative;
                background: 
                    linear-gradient(135deg, 
                        rgba(20, 184, 166, 0.08) 0%, 
                        rgba(59, 130, 246, 0.05) 50%,
                        transparent 100%);
                border-bottom: 1px solid rgba(20, 184, 166, 0.1);
                flex-shrink: 0;
            }

            .pw-header-animation {
                margin-bottom: 16px;
                position: relative;
                height: 70px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .pw-investment-icon {
                position: relative;
                z-index: 10;
            }

            .pw-piggy-bank {
                font-size: 42px;
                animation: piggyBounce 3s ease-in-out infinite;
                filter: drop-shadow(0 12px 24px rgba(20, 184, 166, 0.4));
                position: relative;
                z-index: 5;
            }

            /* Enhanced Falling Coins */
            .pw-falling-coins {
                position: absolute;
                top: -20px;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 100px;
                pointer-events: none;
            }

            .pw-falling-coin {
                position: absolute;
                font-size: 16px;
                animation: coinFall 3s ease-in infinite;
                filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.6));
            }

            .pw-falling-coin:nth-child(1) { left: 15%; animation-delay: 0.2s; }
            .pw-falling-coin:nth-child(2) { left: 30%; animation-delay: 0.8s; }
            .pw-falling-coin:nth-child(3) { left: 50%; animation-delay: 1.4s; }
            .pw-falling-coin:nth-child(4) { left: 70%; animation-delay: 2s; }
            .pw-falling-coin:nth-child(5) { left: 85%; animation-delay: 2.6s; }
            .pw-falling-coin:nth-child(6) { left: 40%; animation-delay: 1.2s; }

            /* Money Bags Floating */
            .pw-money-bags {
                position: absolute;
                top: -15px;
                left: 50%;
                transform: translateX(-50%);
                width: 160px;
                height: 90px;
                pointer-events: none;
            }

            .pw-money-bag {
                position: absolute;
                font-size: 18px;
                animation: moneyBagFloat 4s ease-in-out infinite;
                filter: drop-shadow(0 8px 16px rgba(34, 197, 94, 0.4));
            }

            .pw-money-bag:nth-child(1) { left: 20%; animation-delay: 0s; }
            .pw-money-bag:nth-child(2) { left: 50%; animation-delay: 1.3s; }
            .pw-money-bag:nth-child(3) { left: 80%; animation-delay: 2.6s; }

            /* Sparkles around piggy bank */
            .pw-sparkles {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 150px;
                height: 150px;
                pointer-events: none;
            }

            .pw-sparkle {
                position: absolute;
                font-size: 12px;
                animation: sparkleOrbit 8s linear infinite;
                filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
            }

            .pw-sparkle:nth-child(1) { animation-delay: 0s; }
            .pw-sparkle:nth-child(2) { animation-delay: 1.6s; }
            .pw-sparkle:nth-child(3) { animation-delay: 3.2s; }
            .pw-sparkle:nth-child(4) { animation-delay: 4.8s; }
            .pw-sparkle:nth-child(5) { animation-delay: 6.4s; }

            /* Animated Title - COMPACT */
            .pw-rec-title {
                color: #1e293b;
                font-size: 24px;
                font-weight: 900;
                margin: 12px 0;
                letter-spacing: -0.6px;
                perspective: 1000px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .pw-title-word {
                display: inline-block;
                animation: titleWordReveal 1s ease-out forwards;
                opacity: 0;
                transform: translateY(30px) rotateX(90deg);
                margin: 0 6px;
            }

            .pw-word-1 { animation-delay: 0.3s; }
            .pw-word-2 { 
                animation-delay: 0.6s; 
                background: linear-gradient(135deg, #14b8a6, #06b6d4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }
            .pw-word-3 { animation-delay: 0.9s; }
            .pw-word-4 { 
                animation-delay: 1.2s; 
                background: linear-gradient(135deg, #8b5cf6, #ec4899);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
            }

            /* Enhanced Wealth Progress Bar - COMPACT */
            .pw-wealth-progress-container {
                margin-top: 12px;
                position: relative;
            }

            .pw-wealth-label {
                font-size: 13px;
                color: #64748b;
                margin-bottom: 8px;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .pw-wealth-icon {
                animation: iconBounce 2s ease-in-out infinite;
                filter: drop-shadow(0 2px 4px rgba(34, 197, 94, 0.4));
            }

            .pw-wealth-progress-bar {
                position: relative;
                background: rgba(226, 232, 240, 0.8);
                height: 8px;
                border-radius: 25px;
                overflow: hidden;
                box-shadow: 
                    inset 0 2px 8px rgba(0,0,0,0.1),
                    0 1px 0 rgba(255,255,255,0.8);
                border: 1px solid rgba(20, 184, 166, 0.2);
            }

            .pw-wealth-fill {
                height: 100%;
                background: linear-gradient(90deg, 
                    #14b8a6 0%, 
                    #06b6d4 25%, 
                    #3b82f6 50%, 
                    #8b5cf6 75%, 
                    #ec4899 100%);
                border-radius: 25px;
                animation: wealthGrowth 4s ease-out forwards;
                width: 0%;
                position: relative;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(20, 184, 166, 0.6);
            }

            .pw-wealth-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 30px;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255,255,255,0.9) 50%, 
                    transparent 100%);
                animation: progressShimmer 2s infinite;
            }

            .pw-progress-sparkle {
                position: absolute;
                top: 50%;
                right: 10%;
                transform: translateY(-50%);
                font-size: 10px;
                animation: sparkle 1.5s ease-in-out infinite;
                opacity: 0;
                animation-delay: 3s;
            }

            .pw-wealth-percentage {
                position: absolute;
                top: -28px;
                right: 0;
                font-size: 12px;
                font-weight: 800;
                color: #14b8a6;
                animation: percentageCount 4s ease-out forwards;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }

            /* Body Content with Enhanced Scrolling - COMPACT */
            .pw-rec-body {
                padding: 16px 20px;
                overflow-y: auto;
                flex: 1;
                min-height: 0;
                position: relative;
            }

            /* Enhanced Scrollbar */
            .pw-rec-body::-webkit-scrollbar {
                width: 6px;
            }

            .pw-rec-body::-webkit-scrollbar-track {
                background: linear-gradient(180deg, rgba(20, 184, 166, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%);
                border-radius: 10px;
                box-shadow: inset 0 0 6px rgba(0,0,0,0.1);
            }

          

            /* Enhanced AI Badge - COMPACT */
            .pw-ai-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: linear-gradient(135deg, 
                    rgba(139, 92, 246, 0.15) 0%, 
                    rgba(59, 130, 246, 0.12) 50%,
                    rgba(20, 184, 166, 0.15) 100%);
                border: 2px solid rgba(139, 92, 246, 0.4);
                padding: 8px 14px;
                border-radius: 50px;
                font-size: 11px;
                font-weight: 700;
                color: #7c3aed;
                margin-bottom: 16px;
                position: relative;
                animation: aiBadgeGlow 3s ease-in-out infinite;
                box-shadow: 
                    0 8px 32px rgba(139, 92, 246, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
            }

            .pw-ai-icon {
                animation: aiIconSpin 6s linear infinite;
                font-size: 14px;
                filter: drop-shadow(0 2px 4px rgba(139, 92, 246, 0.4));
            }

            .pw-ai-pulse {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 120%;
                height: 120%;
                border: 2px solid rgba(139, 92, 246, 0.6);
                border-radius: 50px;
                animation: aiPulse 2s ease-in-out infinite;
            }

            .pw-ai-scan-line {
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(139, 92, 246, 0.4) 50%, 
                    transparent 100%);
                animation: aiScanLine 3s ease-in-out infinite;
                border-radius: 50px;
            }

            /* Enhanced Product Card with Neon Effects - COMPACT */
     .pw-rec-product-card {
    position: relative;
    background: linear-gradient(135deg, 
        rgba(255, 255, 255, 0.95) 0%, 
        rgba(248, 250, 252, 0.9) 100%);
    border: 2px solid rgba(20, 184, 166, 0.3); /* Changed border color */
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 16px;
    overflow: hidden;
    animation: cardFloat 4s ease-in-out infinite;
    box-shadow: 
        0 20px 40px rgba(20, 184, 166, 0.15), /* Changed shadow color */
        inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

            .pw-holographic-overlay {
            display: none;
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, 
                    rgba(20, 184, 166, 0.05) 0%,
                    rgba(59, 130, 246, 0.05) 25%,
                    rgba(139, 92, 246, 0.05) 50%,
                    rgba(236, 72, 153, 0.05) 75%,
                    rgba(20, 184, 166, 0.05) 100%);
                background-size: 400% 400%;
                animation: holographicShift 8s ease-in-out infinite;
                pointer-events: none;
                border-radius: 16px;
            }

            .pw-neon-border {
            display: none;
                position: absolute;
                top: -2px;
                left: -2px;
                width: calc(100% + 4px);
                height: calc(100% + 4px);
                background: linear-gradient(45deg, 
                    #14b8a6, #06b6d4, #8b5cf6, #ec4899, #14b8a6);
                background-size: 300% 300%;
                animation: neonBorderFlow 6s linear infinite;
                border-radius: 18px;
                z-index: -1;
                opacity: 0.6;
                filter: blur(1px);
            }

            .pw-product-content {
                position: relative;
                z-index: 2;
            }

         .pw-product-name {
    font-size: 14px; /* Matches simulator title */
    font-weight: 800; /* Matches simulator title */
    color: #1e293b; /* Matches simulator title */
    margin: 0 0 12px; /* Matches simulator title */
    text-align: center; /* Align like simulator title */
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    animation: textGlow 3s ease-in-out infinite;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

            .pw-rec-tags {
                display: flex;
                gap: 8px;
                margin-bottom: 14px;
                flex-wrap: wrap;
            }

            .pw-rec-tag {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
            }

            .pw-rec-tag.risk-low { background: #fef3c7;
    color: #92400e;
    border-color: #fcd34d;
            }

            .pw-rec-tag.risk-medium {
                background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
                color: #9a3412;
                border-color: rgba(154, 52, 18, 0.2);
            }

            .pw-rec-tag.risk-high {
                background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                color: #991b1b;
                border-color: rgba(153, 27, 27, 0.2);
            }

            .pw-tag-icon {
                animation: tagIconBounce 2s ease-in-out infinite;
                filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
            }

            .pw-tag-shine {
             display: none;
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, 
                    transparent 0%, 
                    rgba(255, 255, 255, 0.4) 50%, 
                    transparent 100%);
                animation: tagShine 4s ease-in-out infinite;
            }

            .pw-rec-returns {
                text-align: right;
                position: relative;
            }

            .pw-returns-animated {
                position: relative;
                z-index: 2;
            }

            .pw-returns-animated small {
                display: block;
                font-size: 11px;
                color: #64748b;
                margin-bottom: 4px;
                font-weight: 600;
            }

            .pw-returns-value {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 6px;
                font-size: 20px;
                font-weight: 900;
                color: #14b8a6;
                animation: returnsGlow 2s ease-in-out infinite;
            }

            .pw-return-low, .pw-return-high {
                animation: numberPulse 3s ease-in-out infinite;
            }

            .pw-return-high {
                animation-delay: 0.5s;
            }

            .pw-return-separator {
                color: #64748b;
                font-weight: 400;
            }

            .pw-returns-sparkle {
            display: none;
                position: absolute;
                top: 0;
                right: -10px;
                font-size: 12px;
                animation: sparkleRotate 4s linear infinite;
            }

            .pw-returns-glow {
             display: none;
                position: absolute;
                top: 50%;
                right: 0;
                width: 100px;
                height: 30px;
                background: radial-gradient(ellipse at center, rgba(20, 184, 166, 0.2) 0%, transparent 70%);
                transform: translateY(-50%);
                animation: glowPulse 2s ease-in-out infinite;
                border-radius: 50px;
            }

            /* Enhanced Calculator with Grid Effects - COMPACT */
            .pw-rec-calculator {
                position: relative;
                background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.95) 0%, 
                    rgba(248, 250, 252, 0.9) 100%);
                border: 2px solid rgba(59, 130, 246, 0.3);
                border-radius: 16px;
                padding: 16px;
                margin-bottom: 16px;
                overflow: hidden;
                animation: calculatorPulse 5s ease-in-out infinite;
                box-shadow: 
                    0 20px 40px rgba(59, 130, 246, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
            }

            .pw-calc-glow {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 60%);
                animation: calcGlowPulse 4s ease-in-out infinite;
                border-radius: 16px;
                pointer-events: none;
            }

            .pw-calculator-grid {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-image: 
                    linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
                background-size: 15px 15px;
                animation: calcGridMove 15s linear infinite;
                border-radius: 16px;
                pointer-events: none;
            }

            .pw-rec-calc-header {
                text-align: center;
                margin-bottom: 16px;
                position: relative;
                z-index: 2;
            }

            .pw-rec-calc-header h4 {
                font-size: 14px;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                position: relative;
            }

            .pw-calc-icon {
                animation: calcIconSpin 4s linear infinite;
                font-size: 16px;
                filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.4));
            }

            .pw-calc-pulse {
                position: absolute;
                top: 50%;
                right: -25px;
                transform: translateY(-50%);
                width: 16px;
                height: 16px;
                border: 2px solid rgba(59, 130, 246, 0.6);
                border-radius: 50%;
                animation: calcPulseRing 2s ease-in-out infinite;
            }

            .pw-future-value-display {
                position: relative;
                z-index: 2;
            }

            .pw-value-container {
                position: relative;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .pw-currency-symbol {
                font-size: 18px;
                font-weight: 900;
                color: #14b8a6;
                animation: symbolGlow 3s ease-in-out infinite;
            }

            .pw-animated-value {
                font-size: 18px;
                font-weight: 900;
                color: #1e293b;
                animation: valueFlicker 2s ease-in-out infinite;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .pw-value-particles {
                position: absolute;
                top: 50%;
                right: -25px;
                transform: translateY(-50%);
                width: 50px;
                height: 30px;
            }

            .pw-value-particle {
                position: absolute;
                width: 3px;
                height: 3px;
                background: linear-gradient(45deg, #14b8a6, #06b6d4);
                border-radius: 50%;
                animation: valueParticleFloat 3s ease-in-out infinite;
                box-shadow: 0 0 6px rgba(20, 184, 166, 0.6);
            }

            .pw-value-particle:nth-child(1) { left: 8px; animation-delay: 0s; }
            .pw-value-particle:nth-child(2) { left: 20px; animation-delay: 1s; }
            .pw-value-particle:nth-child(3) { left: 32px; animation-delay: 2s; }

            .pw-time-display {
                font-size: 13px;
                color: #64748b;
                font-weight: 700;
                animation: timeDisplayGlow 4s ease-in-out infinite;
            }

            .pw-rec-calc-slider {
                position: relative;
                z-index: 2;
            }

            .pw-rec-calc-slider label {
                display: block;
                font-size: 12px;
                color: #64748b;
                margin-bottom: 12px;
                text-align: center;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }

            .pw-slider-icon {
                animation: sliderIconBounce 2s ease-in-out infinite;
            }

            .pw-slider-container {
                position: relative;
                margin-bottom: 8px;
            }

            #pw-time-slider {
                width: 100%;
                -webkit-appearance: none;
                height: 8px;
                background: linear-gradient(90deg, 
                    rgba(226, 232, 240, 0.8) 0%, 
                    rgba(203, 213, 225, 0.8) 100%);
                border-radius: 8px;
                outline: none;
                position: relative;
                z-index: 3;
                border: 1px solid rgba(59, 130, 246, 0.2);
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
            }

            #pw-time-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 18px;
                height: 18px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                cursor: pointer;
                border-radius: 50%;
                box-shadow: 
                    0 4px 12px rgba(59, 130, 246, 0.5),
                    0 0 20px rgba(59, 130, 246, 0.3);
                border: 2px solid rgba(255, 255, 255, 0.9);
                transition: all 0.3s ease;
            }

            #pw-time-slider::-webkit-slider-thumb:hover {
                transform: scale(1.2);
                box-shadow: 
                    0 6px 20px rgba(59, 130, 246, 0.7),
                    0 0 30px rgba(59, 130, 246, 0.5);
            }

            #pw-time-slider::-moz-range-thumb {
                width: 18px;
                height: 18px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                cursor: pointer;
                border-radius: 50%;
                border: 2px solid rgba(255, 255, 255, 0.9);
                box-shadow: 
                    0 4px 12px rgba(59, 130, 246, 0.5),
                    0 0 20px rgba(59, 130, 246, 0.3);
            }

            

           
            .pw-slider-labels {
                display: flex;
                justify-content: space-between;
                font-size: 10px;
                color: #94a3b8;
                font-weight: 600;
            }

            /* Enhanced Benefits Section - COMPACT */
            .pw-rec-benefits {
                position: relative;
                background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.95) 0%, 
                    rgba(248, 250, 252, 0.9) 100%);
                border: 2px solid rgba(236, 72, 153, 0.3);
                border-radius: 16px;
                padding: 16px;
                overflow: hidden;
                animation: benefitsFloat 6s ease-in-out infinite;
                box-shadow: 
                    0 20px 40px rgba(236, 72, 153, 0.15),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
            }

            .pw-rec-benefits h4 {
                font-size: 14px;
                font-weight: 800;
                color: #1e293b;
                margin: 0 0 16px;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: benefitsTitleGlow 3s ease-in-out infinite;
            }

            .pw-benefits-icon {
                animation: benefitsIconSpin 8s linear infinite;
                font-size: 16px;
                filter: drop-shadow(0 2px 4px rgba(236, 72, 153, 0.4));
            }

            .pw-benefit-item {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                margin-bottom: 12px;
                position: relative;
                padding: 10px;
                border-radius: 12px;
                background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.6) 0%, 
                    rgba(248, 250, 252, 0.4) 100%);
                border: 1px solid rgba(236, 72, 153, 0.1);
                overflow: hidden;
                transition: all 0.3s ease;
            }

            .pw-benefit-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 16px rgba(236, 72, 153, 0.2);
                border-color: rgba(236, 72, 153, 0.3);
            }

            .pw-benefit-item:last-child {
                margin-bottom: 0;
            }

            .pw-benefit-1 { animation: benefitSlideIn 0.8s ease-out 0.2s both; }
            .pw-benefit-2 { animation: benefitSlideIn 0.8s ease-out 0.4s both; }
            .pw-benefit-3 { animation: benefitSlideIn 0.8s ease-out 0.6s both; }

            .pw-benefit-icon-container {
                position: relative;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .pw-benefit-icon {
                font-size: 16px;
                animation: benefitIconBounce 3s ease-in-out infinite;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
                z-index: 2;
                position: relative;
            }

            .pw-icon-ripple {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 28px;
                height: 28px;
                border: 2px solid rgba(236, 72, 153, 0.4);
                border-radius: 50%;
                transform: translate(-50%, -50%);
                animation: iconRipple 2s ease-in-out infinite;
            }

            .pw-icon-glow {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 40px;
                height: 40px;
                background: radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%);
                transform: translate(-50%, -50%);
                animation: iconGlowPulse 3s ease-in-out infinite;
                border-radius: 50%;
            }

            .pw-benefit-content {
                flex: 1;
                z-index: 2;
                position: relative;
            }

            .pw-benefit-content strong {
                display: block;
                font-size: 13px;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 4px;
                animation: benefitTitleGlow 4s ease-in-out infinite;
            }

            .pw-benefit-content p {
                font-size: 11px;
                color: #64748b;
                margin: 0;
                line-height: 1.4;
                font-weight: 500;
            }


            /* Enhanced Action Buttons - COMPACT */
            .pw-rec-actions {
                display: flex;
                gap: 12px;
                padding: 16px 20px;
                background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.95) 0%, 
                    rgba(248, 250, 252, 0.9) 100%);
                border-top: 2px solid rgba(20, 184, 166, 0.1);
                flex-shrink: 0;
                position: relative;
                overflow: hidden;
            }

            

            .pw-btn-secondary, .pw-btn-primary {
                flex: 1;
                border: none;
                border-radius: 12px;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                padding: 12px 16px;
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                font-family: inherit;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .pw-btn-secondary {
                background: linear-gradient(135deg, 
                    rgba(241, 245, 249, 0.9) 0%, 
                    rgba(226, 232, 240, 0.9) 100%);
                color: #475569;
                border: 2px solid rgba(71, 85, 105, 0.2);
                box-shadow: 0 4px 12px rgba(71, 85, 105, 0.1);
            }

            .pw-btn-secondary:hover {
                background: linear-gradient(135deg, 
                    rgba(226, 232, 240, 0.9) 0%, 
                    rgba(203, 213, 225, 0.9) 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(71, 85, 105, 0.2);
                border-color: rgba(71, 85, 105, 0.3);
            }

            .pw-btn-primary {
                background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
                color: #fff;
                border: 2px solid rgba(20, 184, 166, 0.3);
                box-shadow: 
                    0 8px 25px rgba(20, 184, 166, 0.4),
                    0 0 30px rgba(20, 184, 166, 0.2);
                animation: primaryBtnGlow 3s ease-in-out infinite;
            }

            .pw-btn-primary:hover {
                background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
                transform: translateY(-2px) scale(1.02);
                box-shadow: 
                    0 10px 30px rgba(20, 184, 166, 0.6),
                    0 0 40px rgba(20, 184, 166, 0.4);
            }

            .pw-btn-icon {
                font-size: 14px;
                animation: btnIconPulse 2s ease-in-out infinite;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
            }

            .pw-btn-text {
                font-weight: 800;
                position: relative;
                z-index: 2;
            }

            .pw-btn-ripple {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 70%);
                transform: translate(-50%, -50%);
                border-radius: 50%;
                animation: btnRipple 2s ease-out infinite;
            }

            .pw-btn-glow {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, 
                    transparent 30%, 
                    rgba(255, 255, 255, 0.1) 50%, 
                    transparent 70%);
                transform: translateX(-100%);
                animation: btnGlowSweep 3s ease-in-out infinite;
                border-radius: 12px;
            }

            .pw-btn-particles {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
            }

            .pw-btn-particle {
                position: absolute;
                width: 3px;
                height: 3px;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                animation: btnParticleFloat 4s ease-in-out infinite;
            }

            .pw-btn-particle:nth-child(1) { left: 20%; top: 30%; animation-delay: 0s; }
            .pw-btn-particle:nth-child(2) { left: 50%; top: 20%; animation-delay: 1s; }
            .pw-btn-particle:nth-child(3) { left: 80%; top: 40%; animation-delay: 2s; }
            .pw-btn-particle:nth-child(4) { left: 30%; top: 70%; animation-delay: 3s; }
            .pw-btn-particle:nth-child(5) { left: 70%; top: 60%; animation-delay: 1.5s; }

            .pw-btn-energy-field {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(ellipse at center, 
                    rgba(20, 184, 166, 0.1) 0%, 
                    transparent 60%);
                animation: energyFieldPulse 2s ease-in-out infinite;
                border-radius: 12px;
            }

            /* KEYFRAME ANIMATIONS */
            @keyframes overlayMagicFadeIn {
                from { opacity: 0; backdrop-filter: blur(0px); }
                to { opacity: 1; backdrop-filter: blur(12px); }
            }

            @keyframes modalMagicEntry {
                from { 
                    opacity: 0; 
                    transform: scale(0.7) rotate(-5deg) translateY(50px); 
                    filter: drop-shadow(0 0 0 rgba(20, 184, 166, 0));
                }
                to { 
                    opacity: 1; 
                    transform: scale(1) rotate(0deg) translateY(0); 
                    filter: drop-shadow(0 25px 50px rgba(20, 184, 166, 0.3));
                }
            }

            @keyframes gridMove {
                0% { transform: translate(0, 0); }
                100% { transform: translate(20px, 20px); }
            }

            @keyframes floatingParticles {
                0%, 100% { 
                    transform: translateY(100vh) translateX(0px) rotate(0deg); 
                    opacity: 0; 
                }
                10% { opacity: 1; }
                90% { opacity: 1; }
                50% { 
                    transform: translateY(-20px) translateX(50px) rotate(180deg); 
                    opacity: 1; 
                }
            }

            @keyframes piggyBounce {
                0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
                25% { transform: translateY(-8px) rotate(-2deg) scale(1.05); }
                50% { transform: translateY(-4px) rotate(1deg) scale(1.1); }
                75% { transform: translateY(-12px) rotate(-1deg) scale(1.03); }
            }

            @keyframes coinFall {
                0% { 
                    transform: translateY(-50px) rotate(0deg) scale(1); 
                    opacity: 0; 
                }
                10% { 
                    opacity: 1; 
                    transform: translateY(-30px) rotate(90deg) scale(1.1); 
                }
                50% { 
                    transform: translateY(20px) rotate(180deg) scale(0.9); 
                    opacity: 1; 
                }
                100% { 
                    transform: translateY(80px) rotate(360deg) scale(0.8); 
                    opacity: 0; 
                }
            }

            @keyframes moneyBagFloat {
                0%, 100% { 
                    transform: translateY(0px) rotate(0deg) scale(1); 
                    opacity: 0.8; 
                }
                25% { 
                    transform: translateY(-15px) rotate(-5deg) scale(1.05); 
                    opacity: 1; 
                }
                50% { 
                    transform: translateY(-25px) rotate(0deg) scale(1.1); 
                    opacity: 0.9; 
                }
                75% { 
                    transform: translateY(-10px) rotate(5deg) scale(1.02); 
                    opacity: 1; 
                }
            }

            @keyframes sparkleOrbit {
                0% { 
                    transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg); 
                    opacity: 0; 
                }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { 
                    transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg); 
                    opacity: 0; 
                }
            }

            @keyframes titleWordReveal {
                0% { 
                    opacity: 0; 
                    transform: translateY(30px) rotateX(90deg) scale(0.8); 
                }
                50% { 
                    opacity: 0.5; 
                    transform: translateY(15px) rotateX(45deg) scale(0.9); 
                }
                100% { 
                    opacity: 1; 
                    transform: translateY(0) rotateX(0deg) scale(1); 
                }
            }

            @keyframes iconBounce {
                0%, 100% { transform: translateY(0px) scale(1); }
                50% { transform: translateY(-5px) scale(1.1); }
            }

            @keyframes wealthGrowth {
                0% { width: 0%; }
                20% { width: 15%; }
                40% { width: 35%; }
                60% { width: 60%; }
                80% { width: 85%; }
                100% { width: 100%; }
            }

            @keyframes progressShimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
            }

            @keyframes sparkle {
                0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
                50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
            }

            @keyframes percentageCount {
                0% { opacity: 0; }
                20% { opacity: 1; }
                100% { opacity: 1; }
            }

            @keyframes aiBadgeGlow {
                0%, 100% { 
                    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
                    border-color: rgba(139, 92, 246, 0.4);
                }
                50% { 
                    box-shadow: 0 12px 40px rgba(139, 92, 246, 0.5);
                    border-color: rgba(139, 92, 246, 0.6);
                }
            }

            @keyframes aiIconSpin {
                0% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(90deg) scale(1.1); }
                50% { transform: rotate(180deg) scale(1); }
                75% { transform: rotate(270deg) scale(1.1); }
                100% { transform: rotate(360deg) scale(1); }
            }

            @keyframes aiPulse {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1); 
                    opacity: 0.6; 
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.2); 
                    opacity: 0.3; 
                }
            }

            @keyframes aiScanLine {
                0% { left: -100%; }
                50% { left: 100%; }
                100% { left: -100%; }
            }

            @keyframes cardFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                25% { transform: translateY(-3px) rotate(0.5deg); }
                50% { transform: translateY(-6px) rotate(0deg); }
                75% { transform: translateY(-2px) rotate(-0.5deg); }
            }

            @keyframes holographicShift {
                0%, 100% { background-position: 0% 0%; }
                25% { background-position: 100% 0%; }
                50% { background-position: 100% 100%; }
                75% { background-position: 0% 100%; }
            }

            @keyframes neonBorderFlow {
                0% { background-position: 0% 0%; }
                100% { background-position: 300% 300%; }
            }

            @keyframes textGlow {
                0%, 100% { text-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                50% { text-shadow: 0 4px 8px rgba(30, 41, 59, 0.3); }
            }

            @keyframes tagFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-2px); }
            }

            @keyframes tagIconBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }

            @keyframes tagShine {
                0% { left: -100%; }
                50% { left: 100%; }
                100% { left: -100%; }
            }

            @keyframes returnsGlow {
                0%, 100% { 
                    text-shadow: 0 2px 4px rgba(20, 184, 166, 0.3); 
                    transform: scale(1); 
                }
                50% { 
                    text-shadow: 0 4px 12px rgba(20, 184, 166, 0.6); 
                    transform: scale(1.02); 
                }
            }

            @keyframes numberPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes sparkleRotate {
                0% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(90deg) scale(1.2); }
                50% { transform: rotate(180deg) scale(1); }
                75% { transform: rotate(270deg) scale(1.2); }
                100% { transform: rotate(360deg) scale(1); }
            }

            @keyframes glowPulse {
                0%, 100% { opacity: 0.2; transform: translateY(-50%) scale(1); }
                50% { opacity: 0.4; transform: translateY(-50%) scale(1.1); }
            }

            @keyframes calculatorPulse {
                0%, 100% { 
                    border-color: rgba(59, 130, 246, 0.3); 
                    box-shadow: 0 20px 40px rgba(59, 130, 246, 0.15); 
                }
                50% { 
                    border-color: rgba(59, 130, 246, 0.5); 
                    box-shadow: 0 25px 50px rgba(59, 130, 246, 0.25); 
                }
            }

            @keyframes calcGlowPulse {
                0%, 100% { opacity: 0.1; }
                50% { opacity: 0.2; }
            }

            @keyframes calcGridMove {
                0% { transform: translate(0, 0); }
                100% { transform: translate(15px, 15px); }
            }

            @keyframes calcIconSpin {
                0% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(90deg) scale(1.1); }
                50% { transform: rotate(180deg) scale(1); }
                75% { transform: rotate(270deg) scale(1.1); }
                100% { transform: rotate(360deg) scale(1); }
            }

            @keyframes calcPulseRing {
                0%, 100% { 
                    transform: translateY(-50%) scale(1); 
                    opacity: 0.6; 
                }
                50% { 
                    transform: translateY(-50%) scale(1.3); 
                    opacity: 0.3; 
                }
            }

            @keyframes symbolGlow {
                0%, 100% { 
                    color: #14b8a6; 
                    text-shadow: 0 2px 4px rgba(20, 184, 166, 0.3); 
                }
                50% { 
                    color: #06b6d4; 
                    text-shadow: 0 4px 8px rgba(6, 182, 212, 0.5); 
                }
            }

            @keyframes valueFlicker {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }

            @keyframes valueParticleFloat {
                0%, 100% { transform: translateY(0px) scale(1); opacity: 0.6; }
                50% { transform: translateY(-8px) scale(1.2); opacity: 1; }
            }

            @keyframes timeDisplayGlow {
                0%, 100% { color: #64748b; }
                50% { color: #3b82f6; }
            }


            @keyframes benefitsFloat {
                0%, 100% { transform: translateY(0px) rotate(0deg); }
                25% { transform: translateY(-2px) rotate(0.3deg); }
                50% { transform: translateY(-4px) rotate(0deg); }
                75% { transform: translateY(-1px) rotate(-0.3deg); }
            }

            @keyframes benefitsTitleGlow {
                0%, 100% { 
                    color: #1e293b; 
                    text-shadow: 0 2px 4px rgba(0,0,0,0.1); 
                }
                50% { 
                    color: #334155; 
                    text-shadow: 0 4px 8px rgba(30, 41, 59, 0.2); 
                }
            }

            @keyframes benefitsIconSpin {
                0% { transform: rotate(0deg) scale(1); }
                25% { transform: rotate(90deg) scale(1.05); }
                50% { transform: rotate(180deg) scale(1); }
                75% { transform: rotate(270deg) scale(1.05); }
                100% { transform: rotate(360deg) scale(1); }
            }

            @keyframes benefitSlideIn {
                0% { 
                    opacity: 0; 
                    transform: translateX(-30px) scale(0.8); 
                }
                100% { 
                    opacity: 1; 
                    transform: translateX(0) scale(1); 
                }
            }

            @keyframes benefitIconBounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            @keyframes iconRipple {
                0%, 100% { 
                    transform: translate(-50%, -50%) scale(1); 
                    opacity: 0.6; 
                }
                50% { 
                    transform: translate(-50%, -50%) scale(1.2); 
                    opacity: 0.3; 
                }
            }

            @keyframes iconGlowPulse {
                0%, 100% { opacity: 0.2; }
                50% { opacity: 0.4; }
            }

            @keyframes benefitTitleGlow {
                0%, 100% { 
                    color: #1e293b; 
                    text-shadow: 0 1px 2px rgba(0,0,0,0.1); 
                }
                50% { 
                    color: #334155; 
                    text-shadow: 0 2px 4px rgba(30, 41, 59, 0.2); 
                }
            }

            

            @keyframes primaryBtnGlow {
                0%, 100% { 
                    box-shadow: 
                        0 8px 25px rgba(20, 184, 166, 0.4),
                        0 0 30px rgba(20, 184, 166, 0.2);
                }
                50% { 
                    box-shadow: 
                        0 12px 35px rgba(20, 184, 166, 0.6),
                        0 0 50px rgba(20, 184, 166, 0.4);
                }
            }

            @keyframes btnIconPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            @keyframes btnRipple {
                0% { width: 0; height: 0; opacity: 1; }
                100% { width: 200px; height: 200px; opacity: 0; }
            }

            @keyframes btnGlowSweep {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
            }

            @keyframes btnParticleFloat {
                0%, 100% { opacity: 0; transform: translateY(0px); }
                25% { opacity: 1; transform: translateY(-5px); }
                75% { opacity: 1; transform: translateY(-8px); }
            }

            @keyframes energyFieldPulse {
                0%, 100% { opacity: 0.1; }
                50% { opacity: 0.2; }
            }

            /* Mobile Responsiveness */
            @media (max-width: 480px) {
                #pocketwisely-prompt-overlay {
                    padding: 5px 4px;
                }
                
                #pocketwisely-prompt {
                    max-width: 100%;
                }
                
                .pw-rec-header {
                    padding: 16px 16px 12px;
                }
                
                .pw-header-animation {
                    height: 60px;
                    margin-bottom: 12px;
                }
                
                .pw-piggy-bank {
                    font-size: 36px;
                }
                
                .pw-rec-title {
                    font-size: 20px;
                    margin: 10px 0;
                }
                
                .pw-rec-body {
                    padding: 12px 16px;
                }
                
                .pw-rec-product-card,
                .pw-rec-calculator,
                .pw-rec-benefits {
                    padding: 12px;
                    margin-bottom: 12px;
                }
                
                .pw-rec-actions {
                    padding: 12px 16px;
                    gap: 8px;
                }
                
                .pw-btn-secondary, .pw-btn-primary {
                    padding: 10px 12px;
                    font-size: 12px;
                }
            }
        </style>
    `;

    document.body.appendChild(document.createElement('div')).outerHTML = recommendationHTML;

    // Add event listeners and other JavaScript functionality
    document.getElementById('pw-change-prefs-btn').addEventListener('click', () => {
        // Handle change preferences
        console.log('Change preferences clicked');
    });

    document.getElementById('pw-invest-now-btn').addEventListener('click', () => {
        // Handle invest now
        console.log('Invest now clicked');
    });

        const percentageEl = document.querySelector('.pw-wealth-percentage');
    if (percentageEl) {
        let currentPercent = 0;
        const interval = setInterval(() => {
            currentPercent++;
            percentageEl.textContent = `${currentPercent}%`;
            if (currentPercent >= 100) {
                clearInterval(interval);
                percentageEl.textContent = '100%';
            }
        }, 29); // 29ms * 100 = ~2.9s, slightly faster than the bar
    }

    // Time slider functionality
    const slider = document.getElementById('pw-time-slider');
    const futureValDisplay = document.getElementById('pw-future-val-display');
    const timeValDisplay = document.getElementById('pw-time-val');

    slider.addEventListener('input', (e) => {
        const months = parseInt(e.target.value);
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        
        let timeDisplay = '';
        if (years > 0 && remainingMonths > 0) {
            timeDisplay = `${years} years ${remainingMonths} months`;
        } else if (years > 0) {
            timeDisplay = `${years} years`;
        } else {
            timeDisplay = `${months} months`;
        }
        
        timeValDisplay.textContent = timeDisplay;
        
        // Update future value calculation based on slider
        const baseValue = 50000; // Example base investment
        const lowReturn = recData.expected_return.low / 100;
        const highReturn = recData.expected_return.high / 100;
        
        const futureValueLow = baseValue * Math.pow(1 + lowReturn, years + remainingMonths/12);
        const futureValueHigh = baseValue * Math.pow(1 + highReturn, years + remainingMonths/12);
        
        futureValDisplay.textContent = `${formatCurrency(futureValueLow)} - ${formatCurrency(futureValueHigh)}`;
    });

    const changePrefBtn = document.getElementById('pw-change-prefs-btn');
    const investNowBtn = document.getElementById('pw-invest-now-btn');

    if (changePrefBtn) {
        changePrefBtn.addEventListener('click', () => {
            console.log('Change preferences clicked, eventId:', eventId);
            const overlay = document.getElementById('pocketwisely-prompt-overlay');
            if (overlay) overlay.remove();
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

    // Close modal on background click
    document.getElementById('pocketwisely-prompt-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'pocketwisely-prompt-overlay') {
            document.getElementById('pocketwisely-prompt-overlay').remove();
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