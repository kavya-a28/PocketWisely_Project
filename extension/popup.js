// popup.js

document.addEventListener('DOMContentLoaded', function() {
    const title = document.getElementById('popup-title');
    const message = document.getElementById('popup-message');

    // Check Chrome's storage to see if user information exists
    chrome.storage.local.get(['userInfo'], function(result) {
        if (result.userInfo && result.userInfo.name) {
            // If user info is found, greet them by name
            title.textContent = `Hello, ${result.userInfo.name}! 🧠`;
            message.textContent = 'PocketWisely is active and ready to help you shop mindfully.';
        } else {
            // If no user info is found, show the default message
            title.textContent = 'Welcome to PocketWisely!';
            message.textContent = 'Please complete your registration in the tab that opened.';
        }
    });
});