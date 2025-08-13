// listener.js

// This message is the proof that you are running the correct, final version of the code.
console.log("✅ PocketWisely Listener.js --- VERSION 16 (Clean Titles) --- is running.");

// Selectors for all possible "Add to Cart" or "Buy Now" buttons on Amazon
const purchaseButtonSelectors = [
    '#add-to-cart-button',
    '#buy-now-button',
    '[name^="submit.addToCart"]',
    '[data-action="add-to-cart-button"]'
];


/**
 * The DEFINITIVE function to handle the "Compare with similar items" table.
 * This version now returns ONLY the product name, without the "This Item:" prefix.
 * @param {HTMLElement} button - The button element that was clicked.
 * @returns {object|null} The scraped product data.
 */
function scrapeComparisonTable(button) {
    const table = button.closest('table[class*="comparisonTable"]');
    if (!table) return null;

    const buttonCell = button.closest('td');
    if (!buttonCell) return null;

    // STEP 1: Determine the exact column index of the clicked button.
    const buttonRow = buttonCell.parentElement;
    const columnIndex = Array.from(buttonRow.children).indexOf(buttonCell);

    // STEP 2: Find the main header cell in the first row at the same column index.
    const headerRow = table.querySelector('tbody > tr');
    if (!headerRow || !headerRow.children[columnIndex]) return null;
    
    const nameAndImageCell = headerRow.children[columnIndex];
    const nameContainerEl = nameAndImageCell.querySelector('div[class*="titleStyle"]');
    const imageEl = nameAndImageCell.querySelector('img');

    // STEP 3: Find the Price by first finding the "Price" row, then getting the correct cell.
    let priceEl = null;
    const allRows = table.querySelectorAll('tbody > tr');
    for (const row of allRows) {
        const firstCellInRow = row.children[0];
        if (firstCellInRow && firstCellInRow.textContent.trim().toLowerCase() === 'price') {
            const priceCell = row.children[columnIndex];
            if (priceCell) {
                priceEl = priceCell.querySelector('.a-price .a-offscreen');
            }
            break; 
        }
    }
    
    // STEP 4: Assemble and return the complete data.
    if (nameContainerEl && priceEl) {
        // Get the full product name, and clean up any extra whitespace.
        const fullName = nameContainerEl.textContent.replace(/\s+/g, ' ').trim();

        return {
            name: fullName, // Return just the clean name, without the context label.
            price: priceEl.innerText.trim(),
            image: imageEl ? imageEl.src : ''
        };
    }
    
    return null;
}


/**
 * The main scraping function, acting as a router to decide which scraping strategy to use.
 * @param {HTMLElement} button The button element that was clicked.
 * @returns {object|null} An object with {name, price, image} or null if not found.
 */
function scrapeDataForClickedButton(button) {
    // --- STRATEGY 1: Check if we are in the "Compare with similar items" table FIRST ---
    const comparisonTable = button.closest('table[class*="desktopFaceoutStyle_comparisonTable"]');
    if (comparisonTable) {
        console.log("Strategy 1: Using Comparison Table scraper.");
        return scrapeComparisonTable(button);
    }
    
    // --- STRATEGY 2: Handle ALL other card/list/grid components ---
    const containerSelectors = [
        'li.a-carousel-card',
        '.s-card-container',
        'div.a-cardui',
        '[data-asin]',
        'div[data-p13n-asin-metadata]',
        'li.a-list-item',
        '.s-widget-spacing-large',
        'div[data-component-id]'
    ];
    const productContainer = button.closest(containerSelectors.join(', '));

    if (productContainer) {
        console.log("Strategy 2: Found a generic product container. Using waterfall logic.");
        let nameEl, priceEl, imageEl;

        // Name Waterfall
        nameEl = productContainer.querySelector('div[class*="sponsored-products-truncator"]');
        if (!nameEl) nameEl = productContainer.querySelector('h2.a-text-normal > span');
        if (!nameEl) nameEl = productContainer.querySelector('.p13n-sc-truncate-desktop-type2');
        if (!nameEl) nameEl = productContainer.querySelector('a.a-link-normal[title]');
        
        // Price & Image
        priceEl = productContainer.querySelector('.a-price .a-offscreen');
        imageEl = productContainer.querySelector('img.s-image, img');

        if (nameEl && priceEl) {
            const name = nameEl.textContent.trim() || (nameEl.title ? nameEl.title.trim() : '');
            if (name) {
                 return { name: name, price: priceEl.innerText.trim(), image: imageEl ? imageEl.src : '' };
            }
        }
    }

    // --- STRATEGY 3: Main Page as the TRUE last resort ---
    else {
        console.log("Strategy 3: No container found. Assuming this is the main page 'Add to Cart' button.");
        const nameEl = document.querySelector('#productTitle');
        const priceEl = document.querySelector('#corePrice_feature_div .a-offscreen, .a-price.a-text-price .a-offscreen, #price');
        const imageEl = document.querySelector('#landingImage');

        if (nameEl && priceEl) {
            return { name: nameEl.textContent.trim(), price: priceEl.innerText.trim(), image: imageEl ? imageEl.src : '' };
        }
    }

    console.error("PocketWisely failed to scrape any product details using any available strategy.");
    return null;
}


// The main event listener remains the same.
document.body.addEventListener('click', function(event) {
    const clickedButton = event.target.closest(purchaseButtonSelectors.join(', '));

    if (clickedButton) {
        console.log('🛒 Purchase button clicked! Intercepting...');
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const productData = scrapeDataForClickedButton(clickedButton);
        console.log("Final scraped data being sent:", productData);

        chrome.runtime.sendMessage({
            action: "purchaseAttempt",
            data: productData
        });
    }
}, true);