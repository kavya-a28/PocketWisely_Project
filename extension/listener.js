// listener.js (Final Version with Connection Check)
console.log("✅ PocketWisely Listener.js --- FINAL --- is running.");

// This is the most comprehensive list of selectors for all known button types.
const purchaseButtonSelectors = [
    '#add-to-cart-button',
    '#buy-now-button',
    '[name^="submit.addToCart"]',
    '[data-action="add-to-cart-button"]',
    '[name^="submit.buy-now"]'
];

document.body.addEventListener('click', function(event) {
    const clickedButton = event.target.closest(purchaseButtonSelectors.join(', '));
    if (!clickedButton) return;

    // This logic handles the second, "unlocked" click
    if (clickedButton.hasAttribute('data-pocketwisely-unlocked')) {
        console.log("🛒 Unlocked button clicked! Allowing action.");
        clickedButton.removeAttribute('data-pocketwisely-unlocked');
        
        let actionType = getActionType(clickedButton);
        // --- MODIFICATION: Added a check for chrome.runtime ---
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "actualPurchaseAction", buttonType: actionType });
        } else {
            console.error("PocketWisely Critical Error: Cannot connect to background script on second click.");
        }
        return; // Allow the default browser action to proceed
    }

    // This is the FIRST click, so we intercept it.
    console.log('🛒 Initial button click detected and intercepted!');
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    // Mark the exact button that was clicked so we can find it again later.
    const oldTarget = document.querySelector('[data-pocketwisely-target="true"]');
    if (oldTarget) oldTarget.removeAttribute('data-pocketwisely-target');
    clickedButton.setAttribute('data-pocketwisely-target', 'true');

    console.log("Scraping product data...");
    const productData = scrapeDataForClickedButton(clickedButton);
    const actionType = getActionType(clickedButton);
    
    if (productData) {
        console.log("✅ Data scraped successfully. Sending to background script.", productData);
        // --- MODIFICATION: Added a check for chrome.runtime ---
        if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: "purchaseAttempt", data: productData, buttonType: actionType });
        } else {
            console.error("PocketWisely Critical Error: Cannot connect to background script. Please reload the extension and the page.");
            alert("PocketWisely Error: Connection to the extension was lost. Please reload the page.");
            clickedButton.removeAttribute('data-pocketwisely-target');
        }
    } else {
        console.error("❌ Scraping failed. Could not find product details. Popup will not be shown.");
        clickedButton.removeAttribute('data-pocketwisely-target');
    }
}, true);

/**
 * Determines if the clicked button was for 'add_to_cart' or 'buy_now'.
 * @param {HTMLElement} button The button element that was clicked.
 * @returns {'add_to_cart' | 'buy_now'}
 */
function getActionType(button) {
    if ((button.id && button.id.toLowerCase().includes('buy-now')) || (button.name && button.name.toLowerCase().includes('buy-now'))) {
        return 'buy_now';
    }
    return 'add_to_cart';
}

/**
 * The main scraping function. It acts as a router to decide which scraping strategy to use.
 * @param {HTMLElement} button The button element that was clicked.
 * @returns {object|null} The scraped product data or null if not found.
 */
function scrapeDataForClickedButton(button) {
    const comparisonTable = button.closest('table[class*="desktopFaceoutStyle_comparisonTable"]');
    if (comparisonTable) return scrapeComparisonTable(button);

    const containerSelectors = ['li.a-carousel-card', '.s-card-container', 'div.a-cardui', '[data-asin]', 'div[data-p13n-asin-metadata]', 'li.a-list-item', '.s-widget-spacing-large', 'div[data-component-id]'];
    const productContainer = button.closest(containerSelectors.join(', '));

    if (productContainer) {
        let nameEl, priceEl, imageEl;
        // Waterfall of selectors to find the name
        nameEl = productContainer.querySelector('div[class*="sponsored-products-truncator"]');
        if (!nameEl) nameEl = productContainer.querySelector('h2.a-text-normal > span');
        if (!nameEl) nameEl = productContainer.querySelector('.p13n-sc-truncate-desktop-type2');
        if (!nameEl) nameEl = productContainer.querySelector('a.a-link-normal[title]');
        
        priceEl = productContainer.querySelector('.a-price .a-offscreen');
        imageEl = productContainer.querySelector('img.s-image, img');

        if (nameEl && priceEl) {
            const name = nameEl.textContent.trim() || (nameEl.title ? nameEl.title.trim() : '');
            if (name) return { name, price: priceEl.innerText.trim(), image: imageEl ? imageEl.src : '' };
        }
    } else {
        // Fallback for the main product page
        const nameEl = document.querySelector('#productTitle');
        const priceEl = document.querySelector('#corePrice_feature_div .a-offscreen, .a-price.a-text-price .a-offscreen, #price');
        const imageEl = document.querySelector('#landingImage');
        if (nameEl && priceEl) return { name: nameEl.textContent.trim(), price: priceEl.innerText.trim(), image: imageEl ? imageEl.src : '' };
    }
    return null; // Return null if no data could be found
}

/**
 * A specialized function to scrape data from a "Compare with similar items" table.
 * @param {HTMLElement} button The button element that was clicked.
 * @returns {object|null} The scraped product data.
 */
function scrapeComparisonTable(button) {
    const table = button.closest('table[class*="comparisonTable"]');
    if (!table) return null;
    const buttonCell = button.closest('td');
    if (!buttonCell) return null;
    const buttonRow = buttonCell.parentElement;
    const columnIndex = Array.from(buttonRow.children).indexOf(buttonCell);
    const headerRow = table.querySelector('tbody > tr');
    if (!headerRow || !headerRow.children[columnIndex]) return null;
    const nameAndImageCell = headerRow.children[columnIndex];
    const nameContainerEl = nameAndImageCell.querySelector('div[class*="titleStyle"]');
    const imageEl = nameAndImageCell.querySelector('img');
    let priceEl = null;
    for (const row of table.querySelectorAll('tbody > tr')) {
        const firstCellInRow = row.children[0];
        if (firstCellInRow && firstCellInRow.textContent.trim().toLowerCase() === 'price') {
            const priceCell = row.children[columnIndex];
            if (priceCell) priceEl = priceCell.querySelector('.a-price .a-offscreen');
            break;
        }
    }
    if (nameContainerEl && priceEl) {
        const fullName = nameContainerEl.textContent.replace(/\s+/g, ' ').trim();
        return { name: fullName, price: priceEl.innerText.trim(), image: imageEl ? imageEl.src : '' };
    }
    return null;
}
