// extension/register.js

const BACKEND_URL = 'http://127.0.0.1:5000';

/**
 * A helper function to get the unique user ID from Chrome's local storage.
 * If it doesn't exist, it creates one. This ensures every user has a stable ID.
 */
async function getUserId() {
    let data = await chrome.storage.local.get('userId');
    if (data.userId) {
        return data.userId;
    } else {
        // Generate a new unique ID if this is the very first run
        let newUserId = self.crypto.randomUUID();
        await chrome.storage.local.set({ userId: newUserId });
        return newUserId;
    }
}

const form = document.getElementById('registration-form');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const button = form.querySelector('button');

    button.disabled = true;
    button.textContent = 'Registering...';
    if (errorMessage) errorMessage.style.display = 'none';

    try {
        const userId = await getUserId();
        const registrationData = {
            userId: userId,
            name: name,
            email: email
        };

        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Registration failed.');
        }

        // --- ✅ THE KEY CHANGE IS HERE ---
        // On success, save all user info into ONE object for consistency.
        await chrome.storage.local.set({
            pocketWiselyUser: {
                userId: userId,
                name: name,
                email: email
            }
        });

        console.log('User registered and data saved:', { pocketWiselyUser: registrationData });

        // Show success and close the tab
        form.style.display = 'none';
        if (successMessage) successMessage.style.display = 'block';

        setTimeout(() => {
            window.close();
        }, 2000);

    } catch (error) {
        console.error('Error during registration:', error);
        if (errorMessage) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
        button.disabled = false;
        button.textContent = 'Try Again';
    }
});