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
            innerHTML = `
                <div style="font-size: 18px; margin-bottom: 10px;">Is this a mindful purchase?</div>
                <div style="font-size: 14px; color: #666; background-color: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 20px;">Instead of buying, you could invest ${productData.price} and potentially grow your wealth.</div>
                <div style="display: flex; justify-content: center;">
                    <button id="pw-cancel-btn" class="pw-btn-secondary">You're right, I'll wait.</button>
                    <button id="pw-proceed-btn" class="pw-btn-primary">I really need this.</button>
                </div>
            `;
        } else if (currentQuestionIndex < questions.length) {
            const q = questions[currentQuestionIndex];
            innerHTML = `
                <div style="font-size: 18px; margin-bottom: 20px;">${q.text}</div>
                <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 10px;">
                    ${q.answers.map(answer => `<button class="pw-answer-btn">${answer}</button>`).join('')}
                </div>
            `;
        } else {
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


/**
 * This function is now completely self-contained. It defines its own helper
 * functions, ensuring they are available in the execution context and making the buttons clickable.
 */
/**
 * Updated showInvestmentSurvey function that properly handles profile updates
 */
function showInvestmentSurvey(eventId) {
    // Ensure no old popups exist
    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) oldPrompt.remove();

    const promptContainerHTML = `
        <div id="pocketwisely-prompt-overlay">
            <div id="pocketwisely-prompt">
                <div class="pw-survey-modal">
                    <div class="pw-survey-header">
                        <h2 class="pw-survey-title">Quick Investment Profile</h2>
                        <p class="pw-survey-subtitle">Help us recommend the best options for you</p>
                    </div>
                    <div class="pw-survey-body">
                        <div class="pw-survey-question">
                            <h3 class="pw-survey-question-title">What's your risk tolerance?</h3>
                            <div class="pw-survey-options">
                                <button class="pw-survey-option" data-category="risk_level" data-value="low"><div class="pw-checkmark">✔</div><span class="emoji">🛡️</span><strong>Low</strong><small>Safe & Steady</small></button>
                                <button class="pw-survey-option" data-category="risk_level" data-value="medium"><div class="pw-checkmark">✔</div><span class="emoji">⚖️</span><strong>Medium</strong><small>Balanced Growth</small></button>
                                <button class="pw-survey-option" data-category="risk_level" data-value="high"><div class="pw-checkmark">✔</div><span class="emoji">🚀</span><strong>High</strong><small>Maximum Returns</small></button>
                            </div>
                        </div>
                        <div class="pw-survey-question">
                            <h3 class="pw-survey-question-title">Investment duration preference?</h3>
                            <div class="pw-survey-options">
                                <button class="pw-survey-option" data-category="duration" data-value="short"><div class="pw-checkmark">✔</div><span class="emoji">⏰</span><strong>Short</strong><small>(1-2 years)</small></button>
                                <button class="pw-survey-option" data-category="duration" data-value="medium"><div class="pw-checkmark">✔</div><span class="emoji">📅</span><strong>Medium</strong><small>(3-5 years)</small></button>
                                <button class="pw-survey-option" data-category="duration" data-value="long"><div class="pw-checkmark">✔</div><span class="emoji">🏗️</span><strong>Long</strong><small>(5+ years)</small></button>
                            </div>
                        </div>
                        <div class="pw-survey-question">
                            <h3 class="pw-survey-question-title">Current financial situation?</h3>
                            <div class="pw-survey-options">
                                <button class="pw-survey-option" data-category="financial_stability" data-value="tough"><div class="pw-checkmark">✔</div><span class="emoji">😰</span><strong>Tough</strong><small>Limited Budget</small></button>
                                <button class="pw-survey-option" data-category="financial_stability" data-value="comfort"><div class="pw-checkmark">✔</div><span class="emoji">😊</span><strong>Comfortable</strong><small>Stable Income</small></button>
                                <button class="pw-survey-option" data-category="financial_stability" data-value="flexible"><div class="pw-checkmark">✔</div><span class="emoji">💪</span><strong>Flexible</strong><small>Extra Savings</small></button>
                            </div>
                        </div>
                    </div>
                    <div class="pw-survey-actions">
                        <button class="pw-survey-cancel" id="pw-survey-cancel-btn">Cancel</button>
                        <button class="pw-survey-submit" id="surveySubmit">Get Recommendations</button>
                    </div>
                </div>
            </div>
        </div>
        <style>
            #pocketwisely-prompt-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(10,20,30,.5);backdrop-filter:blur(5px);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px 15px;animation:overlayFadeIn .3s ease-out}
            #pocketwisely-prompt{background:transparent;border-radius:20px;width:100%;max-width:520px;text-align:center;border:0;animation:promptSlideIn .4s cubic-bezier(.34,1.56,.64,1);max-height:calc(100vh - 40px);display:flex; flex-direction:column;}
            .pw-survey-modal{background:linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;border-radius:20px;text-align:left;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;}
            .pw-survey-header{padding:24px 28px 20px;text-align:center;flex-shrink:0;border-bottom:1px solid #eaf0f6}.pw-survey-title{color:#1e293b;font-size:20px;font-weight:700;margin:0 0 6px}.pw-survey-subtitle{color:#64748b;font-size:14px;margin:0}
            
            /* ✅ FIXED: This allows the body of the survey to scroll */
            .pw-survey-body{overflow-y:auto;padding:20px 28px}

            .pw-survey-question{margin-bottom:16px}.pw-survey-question-title{color:#334155;font-size:15px;font-weight:600;margin:0 0 12px}.pw-survey-options{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.pw-survey-option{background:#fff;border:1px solid #eaf0f6;color:#475569;padding:12px 10px;border-radius:12px;cursor:pointer;transition:all .2s ease-out;text-align:center;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;box-shadow:0 2px 4px rgba(0,0,0,.02)}
            .pw-survey-option.selected{border-color:#000; background:#f0fdfa; transform:translateY(-2px); box-shadow:0 4px 14px rgba(0,0,0,.1);}
            .pw-survey-option:hover{transform:translateY(-2px);box-shadow:0 5px 12px rgba(0,0,0,.08);border-color:#d1dbe5}.pw-survey-option .emoji{font-size:20px;line-height:1}.pw-survey-option strong{font-size:14px;font-weight:600;color:#1e293b;line-height:1.2;margin:4px 0}.pw-survey-option small{font-size:12px;color:#64748b;line-height:1.2}.pw-survey-option.selected strong,.pw-survey-option.selected small{color:inherit}.pw-checkmark{position:absolute;top:8px;right:8px;width:18px;height:18px;background:#14b8a6;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;transform:scale(0) rotate(-180deg);transition:transform .3s cubic-bezier(.34,1.56,.64,1);opacity:0;font-size:10px}.pw-survey-option.selected .pw-checkmark{transform:scale(1) rotate(0deg);opacity:1}.pw-survey-actions{display:flex;gap:12px;padding:20px 28px;justify-content:flex-end;flex-shrink:0;border-top:1px solid #eaf0f6;background:linear-gradient(180deg, #f7f9fc 0%, #f1f5f9 100%)}.pw-survey-cancel,.pw-survey-submit{border:none;padding:12px 24px;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s ease}.pw-survey-cancel{background:#eaf0f6;color:#475569}.pw-survey-cancel:hover{background:#d1dbe5}.pw-survey-submit{background:#14b8a6;color:#fff;opacity:.5;pointer-events:none}.pw-survey-submit.enabled{opacity:1;pointer-events:auto;box-shadow:0 4px 14px -2px rgba(20,184,166,.4)}.pw-survey-submit.enabled:hover{background:#0d9488;transform:translateY(-1px)}
            @keyframes overlayFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes promptSlideIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', promptContainerHTML);

    // --- SELF-CONTAINED LOGIC ---
    const surveyAnswers = { risk_level: null, duration: null, financial_stability: null };
    const submitBtn = document.getElementById('surveySubmit');
    const cancelBtn = document.getElementById('pw-survey-cancel-btn');
    const optionButtons = document.querySelectorAll('.pw-survey-option');

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
            questionContainer.querySelectorAll('.pw-survey-option').forEach(opt => opt.classList.remove('selected'));
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
                contentEl.innerHTML = `<div style="font-size: 16px; color: #555; padding: 100px 20px; text-align: center;">
                    <div style="margin-bottom: 10px;">🔄</div>
                    Finding the best investment for you...
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
                                <h4>Potential Growth in <span id="pw-years-val">${recData.time_horizon_years}</span> years</h4>
                                <h2 id="pw-future-val-display">${formatCurrency(recData.future_values.low)} - ${formatCurrency(recData.future_values.high)}</h2>
                            </div>
                            <div class="pw-rec-calc-slider">
                                <label for="pw-years-slider">Adjust Time Horizon (1-20 years)</label>
                                <input type="range" min="1" max="20" value="${recData.time_horizon_years}" id="pw-years-slider">
                            </div>
                        </div>

                        <!-- Additional Content for Scroll Testing -->
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
                                    <p>Perfect for your ${recData.time_horizon_years}-year investment timeline.</p>
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

            #pw-years-slider {
                width: 100%;
                -webkit-appearance: none;
                height: 8px;
                background: #e2e8f0;
                border-radius: 5px;
                outline: none;
                margin-top: 8px;
            }

            #pw-years-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                background: #14b8a6;
                cursor: pointer;
                border-radius: 50%;
            }

            #pw-years-slider::-moz-range-thumb {
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

    // --- Calculator Logic ---
    const slider = document.getElementById('pw-years-slider');
    const yearsVal = document.getElementById('pw-years-val');
    const futureValDisplay = document.getElementById('pw-future-val-display');
    
    const P = recData.investment_amount;
    const r_low = recData.expected_return.low / 100;
    const r_high = recData.expected_return.high / 100;

    function updateCalculator(years) {
        const n = parseInt(years, 10);
        const FV_low = P * Math.pow((1 + r_low), n);
        const FV_high = P * Math.pow((1 + r_high), n);
        yearsVal.textContent = n;
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
            #pocketwisely-prompt-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(10,20,30,.5);backdrop-filter:blur(5px);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:40px 15px;animation:overlayFadeIn .3s ease-out}#pocketwisely-prompt{background:#fff;border-radius:20px;box-shadow:0 20px 60px -10px rgba(0,0,0,.25);width:100%;max-width:500px;text-align:center;border:0;animation:promptSlideIn .4s cubic-bezier(.34,1.56,.64,1);max-height:calc(100vh - 80px);overflow:hidden;display:flex; padding: 28px;}
            .pw-alert-header{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:20px}.pw-warning-icon{width:24px;height:24px;background:#fbbf24;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:14px;box-shadow:0 2px 8px rgba(251,191,36,.4)}.pw-alert-title{color:#1f2937;font-size:24px;font-weight:700;margin:0}.pw-alert-subtitle{color:#4b5563;font-size:16px;line-height:1.6;margin:0 0 28px;text-align:center}.pw-button-container{display:flex;gap:12px;flex-direction:column;margin-top:0}.pw-invest-btn{background:#2dd4bf;color:#fff;border:none;padding:16px 20px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s ease;box-shadow:0 4px 15px -2px rgba(45,212,191,.3)}.pw-invest-btn:hover{background:#14b8a6;transform:translateY(-2px);box-shadow:0 6px 20px -2px rgba(45,212,191,.4)}.pw-proceed-btn{background:#f3f4f6;color:#4b5563;border:none;padding:14px 20px;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s ease}.pw-proceed-btn:hover{background:#e5e7eb}
        </style>
    `;
    document.body.insertAdjacentHTML('beforeend', promptContainerHTML);

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