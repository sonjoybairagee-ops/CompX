// pricing.js - Optimized to update specific elements to avoid layout shifts
document.addEventListener('DOMContentLoaded', () => {
    const currencyEl = document.getElementById('price-currency');
    const numberEl = document.getElementById('price-number');
    const periodEl = document.getElementById('price-period');
    const discountContainer = document.getElementById('discount-container');

    if (!currencyEl || !numberEl || !periodEl || !discountContainer) return;

    fetch('assets/pricing.json')
        .then(res => res.json())
        .then(data => {
            const { price, currency, period, discounts } = data;

            // Update text content for basic fields
            currencyEl.textContent = currency;
            numberEl.textContent = price;
            periodEl.textContent = period;

            // Clear and regenerate discount rows
            let discountsHtml = '<p class="discount-label">🎟️ Early Bird Discount Codes:</p>';
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
