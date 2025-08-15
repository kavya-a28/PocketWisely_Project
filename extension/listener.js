// extension/listener.js

console.log("🟢 PocketWisely listener is active.");

const purchaseButtonSelectors = [
    '#add-to-cart-button',
    '#buy-now-button',
    '[name^="submit.add-to-cart"]',
    'input.a-button-input[type="submit"][data-asin]',
    'li.col-6-12 button'
].join(', ');

function scrapeAmazonData(button) {
    const productCard = button.closest('[data-component-type="s-search-result"], div[data-asin], .a-carousel-card');
    if (productCard) {
        const nameSelectors = ['h2 .a-text-normal', '.a-size-base-plus.a-text-normal', '._cDEzb_titleR3_fVNyM'].join(', ');
        const nameEl = productCard.querySelector(nameSelectors);
        const priceEl = productCard.querySelector('.a-price-whole');
        if (nameEl && priceEl) {
            const name = nameEl.innerText.trim();
            let rawPrice = priceEl.innerText.trim().replace(/,/g, '');
            let formattedPrice;
            if (rawPrice && !isNaN(parseFloat(rawPrice))) {
                formattedPrice = "₹" + rawPrice;
            } else {
                formattedPrice = "this amount";
            }
            const imageEl = productCard.querySelector('.s-image, .a-carousel-card img');
            const image = imageEl ? imageEl.src : '';
            return { name, price: formattedPrice, image }; 
        }
    }
    
    const nameEl = document.querySelector('#productTitle');
    const imageEl = document.querySelector('#landingImage');
    let priceText = null;
    const priceSelectors = [
        '#corePrice_feature_div .a-offscreen',
        '.priceToPay .a-offscreen',
        '.a-price[data-a-color="price"] .a-offscreen',
        '.a-section .a-price:not([data-a-strike="true"]) .a-offscreen',
        '.a-price-whole'
    ];
    for (const selector of priceSelectors) {
        const priceEl = document.querySelector(selector);
        if (priceEl && priceEl.innerText) {
            priceText = priceEl.innerText;
            break;
        }
    }
    if (nameEl && priceText) {
        let rawPriceMatch = priceText.match(/[\d,.]+/);
        let formattedPrice;
        if (rawPriceMatch) {
            formattedPrice = "₹" + rawPriceMatch[0].replace(/,/g, '');
        } else {
            formattedPrice = "this amount";
        }
        return { 
            name: nameEl.innerText.trim(), 
            price: formattedPrice, 
            image: imageEl ? imageEl.src : '' 
        };
    }
    console.error("PocketWisely could not find product details on this page.");
    return null;
}

function scrapeFlipkartDetailPage() {
    // Flipkart logic remains the same
    const nameEl = document.querySelector('span.B_NuCI');
    if (!nameEl) return null;
    const priceEl = document.querySelector('div._30jeq3._16Jk6d');
    const imageEl = document.querySelector('img._396cs4');
    if (nameEl && priceEl) {
        return { name: nameEl.innerText.trim(), price: priceEl.textContent.trim(), image: imageEl ? imageEl.src : '' };
    }
    return null;
}

// --- Main Click Listener with Button Type Detection ---
// In listener.js, use this as your permanent event listener.

document.body.addEventListener('click', function(event) {
    const clickedButton = event.target.closest(purchaseButtonSelectors);
    
    if (clickedButton) {
        console.log('🛒 Purchase button clicked! Intercepting...');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        // --- FINAL, ROBUST LOGIC to determine button type ---
        let actionType = 'add_to_cart'; // Default to this

        // The report shows the button has id="buy-now-button" and name="submit.buy-now".
        // This logic is designed to correctly catch it, even with case differences.
        if (
            (clickedButton.id && clickedButton.id.toLowerCase() === 'buy-now-button') ||
            (clickedButton.name && clickedButton.name.toLowerCase().includes('buy-now'))
        ) {
            actionType = 'buy_now';
        }
        console.log(`Action type detected: ${actionType}`);
        
        let productData = null;
        const hostname = window.location.hostname;

        if (hostname.includes('amazon')) {
            productData = scrapeAmazonData(clickedButton); 
        } else if (hostname.includes('flipkart')) {
            productData = scrapeFlipkartDetailPage(); 
        }
        
        console.log("Final scraped data:", productData);
        chrome.runtime.sendMessage({
            action: "purchaseAttempt",
            data: productData,
            buttonType: actionType // Pass the detected button type
        });
    }
}, true);