// extension/onboarding.js (Corrected and Renamed)

// It's best practice to define the backend URL in one place.
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
const successMessage = document.getElementById('success-message'); // Assuming you have this element
const errorMessage = document.getElementById('error-message'); // Assuming you have this for errors

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const button = form.querySelector('button');

    if (!name || !email) {
        return; // The 'required' attribute on the inputs should prevent this
    }

    // --- Provide user feedback ---
    button.disabled = true;
    button.textContent = 'Registering...';
    if (errorMessage) errorMessage.style.display = 'none';


    // --- THE CRITICAL FIX ---
    // 1. Get the unique User ID first.
    const userId = await getUserId();

    // 2. Create the complete payload that the backend expects.
    const registrationData = {
        userId: userId,
        name: name,
        email: email
    };

    // 3. Send the complete data to your backend API.
    try {
        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationData)
        });

        const responseData = await response.json();

        if (response.ok) {
            // If registration is successful on the backend...
            console.log('Backend response:', responseData);

            // ...then save the registration status in the extension.
            await chrome.storage.local.set({ 
                isRegistered: true,
                userName: name,
                userEmail: email 
            });

            // Show success and maybe close the tab after a delay
            form.style.display = 'none';
            if (successMessage) successMessage.style.display = 'block';
            
            // Automatically close the onboarding tab after 2 seconds
            setTimeout(() => {
                window.close();
            }, 2000);

        } else {
            // If the backend returned an error (e.g., user exists)
            throw new Error(responseData.error || 'Registration failed.');
        }
    } catch (error) {
        // If there was a network error or an error from the backend
        console.error('Error sending data to backend:', error);
        if (errorMessage) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
        button.disabled = false;
        button.textContent = 'Try Again';
    }
});