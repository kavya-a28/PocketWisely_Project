// extension/register.js

const BACKEND_URL = 'http://127.0.0.1:5000';

/**
 * A helper function to get the unique user ID from Chrome's local storage.
 */
async function getUserId() {
    let data = await chrome.storage.local.get('userId');
    if (data.userId) {
        return data.userId;
    } else {
        let newUserId = self.crypto.randomUUID();
        await chrome.storage.local.set({ userId: newUserId });
        return newUserId;
    }
}

// Get DOM elements
const form = document.getElementById('registration-form');
const successMessage = document.getElementById('success-message');
const submitBtn = form.querySelector('.submit-btn');
const welcomeContent = document.querySelector('.welcome-content');
const trustIndicators = document.querySelector('.trust-indicators');
const logoSection = document.querySelector('.logo-section');

// Enhanced form submission with animations
form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();

    if (!name || !email || !isValidEmail(email)) {
        showValidationError(!name || !email ? 'Please fill in all fields.' : 'Please enter a valid email address.');
        return;
    }

    startLoadingAnimation();

    try {
        const userId = await getUserId();
        const registrationData = { userId, name, email };

        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Registration failed.');
        }

        await chrome.storage.local.set({ pocketWiselyUser: { userId, name, email } });
        console.log('User registered and data saved:', { pocketWiselyUser: registrationData });

        showSuccessAnimation();

        setTimeout(() => window.close(), 3000);

    } catch (error) {
        console.error('Error during registration:', error);
        showErrorAnimation(error.message);
    }
});

function startLoadingAnimation() {
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;
}

function showSuccessAnimation() {
    submitBtn.classList.remove('loading');
    submitBtn.classList.add('success');
    
    setTimeout(() => {
        const elementsToHide = [form, welcomeContent, trustIndicators, logoSection];
        elementsToHide.forEach(el => el.style.animation = 'formSlideOut 0.5s ease-in forwards');
        
        setTimeout(() => {
            elementsToHide.forEach(el => el.classList.add('hidden'));
            successMessage.classList.remove('hidden');
            createConfetti();
        }, 500);
    }, 800);
}

function showErrorAnimation(message) {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    submitBtn.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => { submitBtn.style.animation = ''; }, 500);
}

function showValidationError(message) {
    const existingError = document.querySelector('.validation-error');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'validation-error';
    errorDiv.textContent = message;
    form.insertBefore(errorDiv, form.firstChild);
    
    setTimeout(() => {
        errorDiv.style.animation = 'errorSlideUp 0.3s ease-in forwards';
        setTimeout(() => errorDiv.remove(), 300);
    }, 4000);
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function createConfetti() {
    const colors = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animation = `confettiFall ${2 + Math.random() * 3}s linear forwards`;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 5000);
    }
}

function addDynamicStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .validation-error { background: #e74c3c; color: white; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; animation: errorSlideDown 0.3s ease-out; }
        @keyframes errorSlideDown { from { opacity: 0; transform: translateY(-20px); max-height: 0; } to { opacity: 1; transform: translateY(0); max-height: 100px; } }
        @keyframes errorSlideUp { to { opacity: 0; transform: translateY(-20px); max-height: 0; } }
        @keyframes formSlideOut { to { opacity: 0; transform: translateY(-30px) scale(0.9); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .confetti { position: fixed; width: 10px; height: 10px; top: -10px; z-index: 1000; pointer-events: none; transform: rotate(${Math.random() * 360}deg); }
        @keyframes confettiFall { to { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
    `;
    document.head.appendChild(style);
}

document.addEventListener('DOMContentLoaded', addDynamicStyles);
