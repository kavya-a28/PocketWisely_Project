// confirmation_listener.js
console.log("✅ PocketWisely Confirmation Page Listener is active.");

function scrapePurchasedItems() {
    const purchasedItems = [];
    // This selector targets the product name links on the "Thank You" page.
    const itemElements = document.querySelectorAll('.a-link-normal[href*="/dp/"]');
    
    itemElements.forEach(el => {
        const name = el.innerText.trim();
        if (name) {
            purchasedItems.push(name);
        }
    });
    
    return purchasedItems;
}

const productNames = scrapePurchasedItems();

if (productNames.length > 0) {
    console.log("Detected purchased items:", productNames);
    chrome.runtime.sendMessage({ action: "purchaseCompleted", productNames: productNames });
}
