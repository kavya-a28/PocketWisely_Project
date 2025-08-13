// extension/background.js

// The onInstalled listener remains the same...
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        chrome.tabs.create({ url: 'register.html' });
    }
});

console.log("PocketWisely background service worker started.");

function showImpulseBlocker(product, analysis) { // ✨ We now accept an 'analysis' message
    // ... The code inside this function that creates the HTML prompt remains the same ...
    // ... BUT we will update the message it displays ...

    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) { oldPrompt.remove(); }

    const productName = product ? product.name : "this item";
    const productPrice = product ? product.price : "this amount";
    const productImageHTML = product && product.image ? `<img src="${product.image}" alt="${product.name}" />` : "";
    
    // ✨ MODIFICATION: Use the analysis from the backend, or a default message.
    const analysisMessage = analysis || `Instead of buying, you could invest ${productPrice} and potentially grow your wealth.`;

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
    // ... The rest of the function (style injection, event listeners) remains the same ...
    const styleHTML = `
        #pocketwisely-prompt-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        #pocketwisely-prompt { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); width: 90%; max-width: 450px; text-align: center; animation: pw-fadein 0.3s ease; }
        @keyframes pw-fadein { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .pw-header { font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .pw-product { display: flex; align-items: center; text-align: left; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
        .pw-product img { width: 80px; height: 80px; object-fit: contain; margin-right: 15px; border-radius: 8px; }
        .pw-details { display: flex; flex-direction: column; }
        .pw-name { font-size: 16px; font-weight: bold; max-height: 40px; overflow: hidden; }
        .pw-price { font-size: 14px; color: #555; margin-top: 4px; }
        .pw-question { font-size: 18px; margin-bottom: 10px; }
        .pw-message { font-size: 14px; color: #666; background-color: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
        .pw-buttons { display: flex; justify-content: center; }
        .pw-buttons button { border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; transition: transform 0.1s ease; }
        .pw-buttons button:active { transform: scale(0.97); }
        #pw-cancel-btn { background-color: #f1f1f1; color: #333; }
        #pw-proceed-btn { background-color: #28a745; color: white; margin-left: 10px; }
    `;
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
        alert("Purchase confirmed. You may now click the 'Add to Cart' button again to proceed.");
        cleanUp();
    });
}


// ✨ MODIFICATION: This entire listener is updated.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "purchaseAttempt") {
        console.log("Purchase attempt message received from tab:", sender.tab.id);
        console.log("Product Data found:", request.data);

        // First, get the user's info from storage.
        chrome.storage.local.get(['userInfo'], function(result) {
            if (result.userInfo) {
                // Now, send both user and product data to the backend.
                fetch('http://127.0.0.1:5000/api/product_event', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userInfo: result.userInfo,
                        productData: request.data
                    })
                })
                .then(response => response.json())
                .then(backendResponse => {
                    console.log("Backend analysis received:", backendResponse);
                    // Inject the prompt, now with the personalized analysis from the backend.
                    chrome.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: showImpulseBlocker,
                        args: [request.data, backendResponse.analysis] // Pass analysis message
                    });
                })
                .catch(error => {
                    console.error('Error communicating with backend:', error);
                    // If backend fails, show a default prompt
                    chrome.scripting.executeScript({
                        target: { tabId: sender.tab.id },
                        func: showImpulseBlocker,
                        args: [request.data, null]
                    });
                });
            } else {
                // If no user is registered, just show the default prompt.
                console.log("No user info found, showing default prompt.");
                chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    func: showImpulseBlocker,
                    args: [request.data, null]
                });
            }
        });
    }
});