// extension/register.js

const form = document.getElementById('registration-form');
const successMessage = document.getElementById('success-message');

form.addEventListener('submit', function(event) {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;

    if (name && email) {
        const userInfo = { name, email };
        chrome.storage.local.set({ userInfo: userInfo }, function() {
            console.log("User info saved to local storage:", userInfo);

            form.classList.add('hidden');
            document.querySelector('p').classList.add('hidden');
            successMessage.classList.remove('hidden');

            // ✨ MODIFICATION: Send this data to your backend API
            fetch('http://127.0.0.1:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userInfo)
            })
            .then(response => response.json())
            .then(data => console.log('Backend response:', data))
            .catch(error => console.error('Error sending data to backend:', error));
        });
    }
});