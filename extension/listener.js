// extension/listener.js

console.log("🟢 PocketWisely listener is active.");

// --- SELECTORS (Both Sites) ---
const purchaseButtonSelectors = [
    // --- Main Amazon Product Page Selectors ---
    '#add-to-cart-button',
    '#buy-now-button',

    // --- Amazon Search Result & Listing Page Selectors ---
    '[name^="submit.add-to-cart"]',
    'input.a-button-input[type="submit"][data-asin]',
    
    // --- Flipkart Selector ---
    'li.col-6-12 button'
].join(', ');


// --- SCRAPING FUNCTIONS ---

// In listener.js, replace the function with this debug version
// In listener.js, replace the function with this corrected version

function scrapeAmazonData(button) {
    // --- The only change is in the line below ---
    // We changed '[data-asin]' to 'div[data-asin]' to be more specific.
    const productCard = button.closest('[data-component-type="s-search-result"], div[data-asin], .a-carousel-card');

    if (productCard) {
        const nameSelectors = [
            'h2 .a-text-normal',
            '.a-size-base-plus.a-text-normal',
            '._cDEzb_titleR3_fVNyM'
        ].join(', ');
        
        const nameEl = productCard.querySelector(nameSelectors);
        const priceEl = productCard.querySelector('.a-price-whole');

        if (nameEl && priceEl) {
            const name = nameEl.innerText.trim();
            const price = "₹" + priceEl.innerText.trim().replace(/,/g, '');
            const imageEl = productCard.querySelector('.s-image, .a-carousel-card img');
            const image = imageEl ? imageEl.src : '';
            return { name, price, image };
        }
    }
    
    // Fallback strategy for main product detail pages
    const nameEl = document.querySelector('#productTitle');
    const priceEl = document.querySelector('.a-price-whole, #corePrice_feature_div .a-offscreen');
    const imageEl = document.querySelector('#landingImage');

    if (nameEl && priceEl) {
        return { 
            name: nameEl.innerText.trim(), 
            price: priceEl.innerText.trim(), 
            image: imageEl ? imageEl.src : '' 
        };
    }

    console.error("PocketWisely could not find product details on this page.");
    return null;
}

function scrapeFlipkartDetailPage() {
    const nameEl = document.querySelector('span.B_NuCI'); 
    if (!nameEl) return null; // This is the line that was causing the error
    
    const priceEl = document.querySelector('div._30jeq3._16Jk6d');
    const imageEl = document.querySelector('img._396cs4');
    
    if (nameEl && priceEl) {
        return {
            name: nameEl.innerText.trim(),
            price: priceEl.textContent.trim(),
            image: imageEl ? imageEl.src : ''
        };
    }
    return null;
}


// --- Main Click Listener (Router Logic) ---
document.body.addEventListener('click', function(event) {
    const clickedButton = event.target.closest(purchaseButtonSelectors);
    
    if (clickedButton) {
        console.log('🛒 Purchase button clicked! Intercepting...');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

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
            data: productData
        });
    }
}, true);