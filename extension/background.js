// background.js (Final Event Funnel with Mark and Unlock)

console.log("PocketWisely background service worker started.");

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        // Using 'register.html' to match your file structure
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

// This function is injected to show the popup.
function showImpulseBlocker(productData, eventId) {
    const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
    if (oldPrompt) { oldPrompt.remove(); }

    const productName = productData.name;
    const productPrice = productData.price;
    // The question is now generic, but could be fetched from an analyze endpoint
    const mindfulQuestion = "Is this a mindful purchase?";

    const promptHTML = `
      <div id="pocketwisely-prompt-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 2147483647; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <div id="pocketwisely-prompt" style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); width: 90%; max-width: 450px; text-align: center; animation: fadeIn 0.3s ease;">
          <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px;">Hold On! 🧐</div>
          <div style="display: flex; align-items: center; text-align: left; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
            <img src="${productData.image}" alt="${productData.name}" style="width: 80px; height: 80px; object-fit: contain; margin-right: 15px; border-radius: 8px;" />
            <div style="display: flex; flex-direction: column;">
              <div style="font-size: 16px; font-weight: bold;">${productName}</div>
              <div style="font-size: 14px; color: #555; margin-top: 4px;">Price: <strong>${productPrice}</strong></div>
            </div>
          </div>
          <div style="font-size: 18px; margin-bottom: 10px;">${mindfulQuestion}</div>
          <div style="font-size: 14px; color: #666; background-color: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 20px;">Instead of buying, you could invest ${productPrice} and potentially grow your wealth.</div>
          <div style="display: flex; justify-content: center;">
            <button id="pw-cancel-btn" style="border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; background-color: #f1f1f1; color: #333;">You're right, I'll wait.</button>
            <button id="pw-proceed-btn" style="border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; background-color: #28a745; color: white; margin-left: 10px;">I really need this.</button>
          </div>
        </div>
      </div>
      <style> @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } </style>`;
      
    document.body.insertAdjacentHTML('beforeend', promptHTML);

    const overlay = document.getElementById('pocketwisely-prompt-overlay');
    
    document.getElementById('pw-cancel-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "logDecision", eventId: eventId, decision: "discarded" });
        overlay.remove();
    });

    document.getElementById('pw-proceed-btn').addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: "logDecision", eventId: eventId, decision: "interested" });
        overlay.remove();
        alert("You may now click the original 'Add to Cart' or 'Buy Now' button again to proceed.");
    });
}

// This function is injected to find the original button that was marked and "unlock" it.
function unlockButton() {
    const targetButton = document.querySelector('[data-pocketwisely-target="true"]');
    if (targetButton) {
        targetButton.setAttribute('data-pocketwisely-unlocked', 'true');
        targetButton.removeAttribute('data-pocketwisely-target'); // Clean up the marker
        console.log("Unlocked button:", targetButton);
    } else {
        console.error("PocketWisely Error: Could not find the target button to unlock.");
    }
}

// This function is injected to clean up the marker if the user cancels.
function cleanupMarker() {
    const targetButton = document.querySelector('[data-pocketwisely-target="true"]');
    if (targetButton) {
        targetButton.removeAttribute('data-pocketwisely-target');
    }
}

// Main listener for all messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    (async () => {
        const userId = await getUserId();

        if (request.action === "purchaseAttempt") {
            try {
                const response = await fetch(`${BACKEND_URL}/api/event/view`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        productData: {
                            name: request.data.name,
                            price: parseFloat(request.data.price.replace(/[^0-9.-]+/g, "")),
                            image: request.data.image
                        }
                    })
                });
                const eventData = await response.json();
                await chrome.storage.session.set({ currentEventId: eventData.eventId });
                
                chrome.scripting.executeScript({
                    target: { tabId: sender.tab.id },
                    func: showImpulseBlocker,
                    args: [request.data, eventData.eventId]
                });

            } catch (error) {
                console.error("Error during purchase attempt flow:", error);
            }
        }

        if (request.action === "logDecision") {
            await fetch(`${BACKEND_URL}/api/event/decide`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: request.eventId, decision: request.decision })
            });

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (request.decision === 'interested') {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: unlockButton,
                });
            } else { // 'discarded'
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: cleanupMarker,
                });
            }
        }
        
        if (request.action === "actualPurchaseAction") {
            const { currentEventId } = await chrome.storage.session.get('currentEventId');
            if (currentEventId) {
                // Update status to 'added_to_cart' or 'buy_now'
                await fetch(`${BACKEND_URL}/api/event/update-status`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId: currentEventId, newStatus: request.buttonType })
                });

                // If it was a 'buy_now' action, we can also immediately mark it as purchased
                if (request.buttonType === 'buy_now') {
                     await fetch(`${BACKEND_URL}/api/event/update-status`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ eventId: currentEventId, newStatus: 'purchased' })
                    });
                }
                await chrome.storage.session.remove('currentEventId');
            }
        }

        if (request.action === "purchaseCompleted") {
            await fetch(`${BACKEND_URL}/api/event/confirm-purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userId, productNames: request.productNames })
            });
        }

    })();
    return true;
});
