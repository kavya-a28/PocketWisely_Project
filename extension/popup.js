// extension/popup.js

document.addEventListener('DOMContentLoaded', function() {
    const title = document.getElementById('popup-title');
    const message = document.getElementById('popup-message');

    // ✅ FIX: Look for 'pocketWiselyUser' instead of 'userInfo'
    chrome.storage.local.get(['pocketWiselyUser'], function(result) {
        if (result.pocketWiselyUser && result.pocketWiselyUser.name) {
            title.textContent = `Hello, ${result.pocketWiselyUser.name}! 🧠`;
            message.textContent = 'PocketWisely is active and ready to help you shop mindfully.';
        } else {
            title.textContent = 'Welcome to PocketWisely!';
            message.textContent = 'Please complete your registration to get started.';
        }
    });
});