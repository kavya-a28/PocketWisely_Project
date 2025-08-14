// listener.js - DEFINITIVE FINAL VERSION

console.log("🟢 PocketWisely listener is active. (Definitive Final Version)");

// --- SELECTORS (Both Sites) ---
const purchaseButtonSelectors = [
    // --- Amazon's stable selectors ---
    '#add-to-cart-button',
    '#buy-now-button',
    '[name^="submit.addToCart"]',
    '[data-action="add-to-cart-button"]',
    
    // --- Flipkart's NEW structural selector ---
    // This looks for a button inside a specific list item layout component
    'li.col-6-12 button'

].join(', ');


// --- SCRAPING FUNCTIONS ---

// --- AMAZON LOGIC (PRESERVED) ---
function scrapeAmazonData(button) {
    // Strategy 1: Comparison Widget
    const comparisonTable = button.closest('table[class*="desktopFaceoutStyle_comparisonTable"]');
    if (comparisonTable) {
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
        const allRows = table.querySelectorAll('tbody > tr');
        for (const row of allRows) {
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
    }

    // Strategy 2: Standard Listing Item
    const containerSelectors = ['li.a-carousel-card', '.s-card-container', 'div.a-cardui', '[data-asin]', 'div[data-p13n-asin-metadata]', 'li.a-list-item', '.s-widget-spacing-large', 'div[data-component-id]'];
    const productContainer = button.closest(containerSelectors.join(', '));
    if (productContainer) {
        let nameEl, priceEl, imageEl;
        nameEl = productContainer.querySelector('div[class*="sponsored-products-truncator"], h2.a-text-normal > span, .p13n-sc-truncate-desktop-type2, a.a-link-normal[title]');
        priceEl = productContainer.querySelector('.a-price .a-offscreen');
        imageEl = productContainer.querySelector('img.s-image, img');
        if (nameEl && priceEl) {
            const name = nameEl.textContent.trim() || (nameEl.title ? nameEl.title.trim() : '');
            if (name) return { name: name, price: priceEl.innerText.trim(), image: imageEl ? imageEl.src : '' };
        }
    }

    // Strategy 3: Main Detail Page
    const nameEl = document.querySelector('#productTitle');
    const priceEl = document.querySelector('#corePrice_feature_div .a-offscreen, .a-price.a-text-price .a-offscreen, #price, .a-price-whole');
    const imageEl = document.querySelector('#landingImage');
    if (nameEl && priceEl) {
        return { name: nameEl.textContent.trim(), price: priceEl.innerText.trim(), image: imageEl ? imageEl.src : '' };
    }
    
    return null;
}

// --- FLIPKART LOGIC (SEPARATE) ---
function scrapeFlipkartDetailPage() {
    const nameEl = document.querySelector('span.B_NuCI'); 
    if (!nameEl) return null; 
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
        let productData = null;
        const hostname = window.location.hostname;
        
        // ✨ FINAL CHECK FOR FLIPKART
        // This confirms it's the right button by checking its text content.
        if (hostname.includes('flipkart')) {
            const buttonText = clickedButton.textContent || "";
            if (!buttonText.includes('Add to cart') && !buttonText.includes('Buy Now')) {
                return; // This is not a purchase button, so we ignore the click.
            }
        }

        console.log('🛒 Purchase button clicked! Intercepting...');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (hostname.includes('amazon')) {
            productData = scrapeAmazonData(clickedButton); 
        } else if (hostname.includes('flipkart')) {
            productData = scrapeFlipkartDetailPage(); 
        }
        
        if (!productData) {
            console.error("PocketWisely failed to scrape any product details.");
        }
        
        console.log("Final scraped data being sent:", productData);
        chrome.runtime.sendMessage({
            action: "purchaseAttempt",
            data: productData
        });
    }
}, true);