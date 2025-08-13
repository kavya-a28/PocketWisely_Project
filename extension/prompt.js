// prompt.js

(function() {
    console.log("🟢 PocketWisely prompt script injected!");

    function scrapeProductData() {
        // First, find the specific product container we "marked" earlier
        const targetItem = document.getElementById('pocketwisely-target-item');

        if (!targetItem) {
            console.error("Could not find the marked target item.");
            return null;
        }

        // Now, we use selectors that work INSIDE a product card, not on the whole page
        const nameEl = targetItem.querySelector('h2 .a-text-normal, .a-size-base-plus.a-text-normal');
        const priceEl = targetItem.querySelector('.a-price-whole');
        const priceFractionEl = targetItem.querySelector('.a-price-fraction');
        const imageEl = targetItem.querySelector('.s-image');

        // Clean up the temporary ID so it doesn't interfere with the page
        targetItem.id = '';

        // If we can't find the core details, return null
        if (!nameEl || !priceEl) {
             console.log("On a listing page but couldn't find details inside the card.");
            return null;
        }
        
        const name = nameEl.innerText.trim();
        const price = "₹" + priceEl.innerText.trim() + (priceFractionEl ? priceFractionEl.innerText.trim() : '00');
        const image = imageEl ? imageEl.src : ''; // Use a placeholder if no image

        return { name, price, image };
    }

    function showImpulseBlockerPrompt(product) {
        const oldPrompt = document.getElementById('pocketwisely-prompt-overlay');
        if (oldPrompt) { oldPrompt.remove(); }

        const productName = product ? product.name : "this item";
        const productPrice = product ? product.price : "this amount";
        const productImageHTML = product && product.image ? `<img src="${product.image}" alt="${product.name}" />` : "";

        // The rest of this function (the HTML and CSS) remains the same as before...
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
            <div class="pw-message">Instead of buying, you could invest ${productPrice} and potentially grow your wealth.</div>
            <div class="pw-buttons">
              <button id="pw-cancel-btn">You're right, I'll wait.</button>
              <button id="pw-proceed-btn">I really need this.</button>
            </div>
          </div>
        </div>
      `;
        const style = document.createElement('style');
        style.innerHTML = `
        #pocketwisely-prompt-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
        #pocketwisely-prompt { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.3); width: 90%; max-width: 450px; text-align: center; animation: pw-fadein 0.3s ease; }
        @keyframes pw-fadein { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .pw-header { font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #333; }
        .pw-product { display: flex; align-items: center; text-align: left; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
        .pw-product img { width: 80px; height: 80px; object-fit: contain; margin-right: 15px; border-radius: 8px; }
        .pw-name { font-size: 16px; font-weight: bold; }
        .pw-price { font-size: 14px; color: #555; }
        .pw-question { font-size: 18px; margin-bottom: 10px; }
        .pw-message { font-size: 14px; color: #666; background-color: #f0f8ff; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
        .pw-buttons button { border: none; padding: 12px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: bold; transition: transform 0.1s ease; }
        .pw-buttons button:active { transform: scale(0.97); }
        #pw-cancel-btn { background-color: #f1f1f1; }
        #pw-proceed-btn { background-color: #28a745; color: white; margin-left: 10px; }
      `;
        document.head.appendChild(style);
        document.body.insertAdjacentHTML('beforeend', promptHTML);

        document.getElementById('pw-cancel-btn').addEventListener('click', () => {
            document.getElementById('pocketwisely-prompt-overlay').remove();
        });

        document.getElementById('pw-proceed-btn').addEventListener('click', () => {
            alert("To proceed, you'll need to re-enable the button or re-send the request. For now, please click the original button again.");
            document.getElementById('pocketwisely-prompt-overlay').remove();
        });
    }

    // --- Main Logic ---
    const productData = scrapeProductData();
    showImpulseBlockerPrompt(productData);

})();