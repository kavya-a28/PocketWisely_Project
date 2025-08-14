// extension/background.js

// The onInstalled listener and showImpulseBlocker function remain the same.
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'register.html' });
    }
});

// --- ✅ THIS IS THE CORRECTED LISTENER FUNCTION ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "purchaseAttempt") {
        console.log("Purchase attempt received. Data:", request.data);

        // Get the user object we saved during registration.
        chrome.storage.local.get(['pocketWiselyUser'], function(storageData) {
            // Check if the user object and its ID exist.
            if (storageData.pocketWiselyUser && storageData.pocketWiselyUser.userId) {
                const payload = {
                    // Pass the whole user object from storage.
                    // The backend expects a 'userInfo' key.
                    userInfo: storageData.pocketWiselyUser,
                    productData: request.data
                };

                console.log("Sending to backend:", payload);

                fetch('http://127.0.0.1:5000/api/product_event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(response => response.json())
                .then(backendResponse => {
                    console.log("Backend analysis received:", backendResponse);
                    chrome.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: showImpulseBlocker,
                        args: [request.data, backendResponse.analysis]
                    });
                })
                .catch(error => {
                    console.error('Error communicating with backend:', error);
                    // Fallback to default prompt if backend fails.
                    chrome.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: showImpulseBlocker,
                        args: [request.data, null]
                    });
                });

            } else {
                // If no user is registered, show the default prompt.
                console.log("No user data found in storage. Showing default prompt.");
                chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    func: showImpulseBlocker,
                    args: [request.data, null]
                });
            }
        });
        // Required for asynchronous operations in a listener.
        return true;
    }
});


// You still need the full 'showImpulseBlocker' function in this file.
// I've omitted it for brevity, but it should be present.
// In background.js, replace your entire showImpulseBlocker function with this one.

function showImpulseBlocker(product, analysis) {
    // Remove any old prompt that might exist
    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) { oldPrompt.remove(); }

    // Prepare product details for display, with fallbacks if scraping failed
    const productName = product ? product.name : "this item";
    const productPrice = product ? product.price : "this amount";
    const productImageHTML = product && product.image ? `<img src="${product.image}" alt="${product.name}" />` : "";

    // Use the analysis message from the backend, or a default message
    const analysisMessage = analysis || `Think about it: investing ${productPrice} could be a step towards your long-term financial goals.`;

    // --- ✅ MODIFIED HTML TO INCLUDE PRODUCT DETAILS ---
    const promptHTML = `
        <div id="pocketwisely-prompt-overlay">
            <div id="pocketwisely-prompt">
                <div class="pw-header">Hold On! 🧐</div>

                ${product ? `
                <div class="pw-product">
                    ${productImageHTML}
                    <div class="pw-details">
                        <div class="pw-name">${productName}</div>
                        <div class="pw-price">Price: <strong>${productPrice}</strong></div>
                    </div>
                </div>` : ''}
                
                <div class="pw-question">Is this a mindful purchase?</div>
                <div class="pw-message">${analysisMessage}</div>
                <div class="pw-buttons">
                    <button id="pw-cancel-btn">You're right, I'll wait.</button>
                    <button id="pw-proceed-btn">I really need this.</button>
                </div>
            </div>
        </div>
    `;

    // --- ✅ MODIFIED CSS TO STYLE THE NEW DETAILS ---
    const styleHTML = `
        #pocketwisely-prompt-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        #pocketwisely-prompt { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); width: 90%; max-width: 450px; text-align: center; animation: pw-fadein 0.3s ease; }
        .pw-header { font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #333; }
        
        /* --- New CSS rules --- */
        .pw-product { display: flex; align-items: center; text-align: left; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
        .pw-product img { width: 80px; height: 80px; object-fit: contain; margin-right: 15px; border-radius: 8px; }
        .pw-details { display: flex; flex-direction: column; }
        .pw-name { font-size: 16px; font-weight: bold; max-height: 40px; overflow: hidden; }
        .pw-price { font-size: 14px; color: #555; margin-top: 4px; }
        /* --- End of New CSS --- */

        .pw-question { font-size: 18px; margin-bottom: 10px; }
        .pw-message { font-size: 14px; color: #666; background-color: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
        .pw-buttons { display: flex; justify-content: center; }
        #pw-cancel-btn { background-color: #f1f1f1; color: #333; }
        #pw-proceed-btn { background-color: #28a745; color: white; margin-left: 10px; }
    `;
    
    // The rest of the function injects the HTML and CSS into the page
    const style = document.createElement('style');
    style.innerHTML = styleHTML;
    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', promptHTML);

    const overlay = document.getElementById('pocketwisely-prompt-overlay');
    function cleanUp() {
        overlay.remove();
        style.remove();
    }

    document.getElementById('pw-cancel-btn').addEventListener('click', cleanUp);
    document.getElementById('pw-proceed-btn').addEventListener('click', () => {
        alert("Purchase confirmed. You may now click the original button again to proceed.");
        cleanUp();
    });
}