// pricing.js - Optimized to update specific elements to avoid layout shifts
document.addEventListener('DOMContentLoaded', () => {
    const currencyEl = document.getElementById('price-currency');
    const numberEl = document.getElementById('price-number');
    const periodEl = document.getElementById('price-period');
    const discountContainer = document.getElementById('discount-container');

    // Add support for local vs international toggle
    const pricingLeft = document.querySelector('.pricing-left');
    const priceSub = document.querySelector('.pricing-sub');
    const selectorBtns = document.querySelectorAll('.selector-btn');

    if (selectorBtns.length > 0 && pricingLeft && numberEl) {
        selectorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-pricing-type');
                
                // Update active state on buttons
                selectorBtns.forEach(b => {
                    if (b === btn) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });

                // Smooth fade effect
                numberEl.style.opacity = '0';
                if (priceSub) priceSub.style.opacity = '0';

                setTimeout(() => {
                    if (type === 'global') {
                        pricingLeft.classList.add('is-global');
                        numberEl.textContent = '850';
                        if (priceSub) priceSub.innerHTML = 'Lifetime license <strong>(approx. $8 USD)</strong>. Pay once, use forever.';
                    } else {
                        pricingLeft.classList.remove('is-global');
                        numberEl.textContent = '600';
                        if (priceSub) priceSub.textContent = 'No recurring fees. Pay once, use forever.';
                    }
                    numberEl.style.opacity = '1';
                    if (priceSub) priceSub.style.opacity = '1';
                }, 150);
            });
        });
    }

    if (!currencyEl || !numberEl || !periodEl || !discountContainer) return;

    fetch('assets/pricing.json?v=3.0.2')
        .then(res => res.json())
        .then(data => {
            const { price, currency, period, discounts } = data;

            // Update text content for basic fields
            currencyEl.textContent = currency;
            numberEl.textContent = price;
            periodEl.textContent = period;

            // Clear and regenerate discount rows
            let discountsHtml = '<p class="discount-label">🎟️ BD Local Early Bird Discount Codes:</p>';
            discounts.forEach(d => {
                const isSecondary = d.code === 'SB60';
                discountsHtml += `
                    <div class="discount-row">
                        <span class="discount-badge ${isSecondary ? 'secondary' : ''}">${d.code}</span>
                        <span class="discount-text">${d.description}</span>
                    </div>
                `;
            });
            discountContainer.innerHTML = discountsHtml;
        })
        .catch(err => {
            console.error('Failed to load pricing data:', err);
            // Optionally update labels to show error
            const label = discountContainer.querySelector('.discount-label');
            if (label) label.textContent = '🎟️ Pricing data unavailable';
        });
});
