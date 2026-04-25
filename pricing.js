// pricing.js - Dynamically render the pricing section
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pricing-container');
  if (!container) return;

  fetch('assets/pricing.json')
    .then(res => res.json())
    .then(data => {
      const { price, currency, period, discounts } = data;
      const leftHtml = `
        <div class="pricing-left">
          <div class="pricing-badge">🔥 Limited Launch Offer</div>
          <h3 class="pricing-title">Lifetime Access</h3>
          <div class="pricing-amount">
            <span class="price-currency">${currency}</span>
            <span class="price-number">${price}</span>
            <span class="price-period">${period}</span>
          </div>
          <p class="pricing-sub">No recurring fees. Pay once, use forever.</p>
          <div class="discount-codes">
            <p class="discount-label">🎟️ Early Bird Discount Codes:</p>
            ${discounts.map(d => `<div class="discount-row"><span class="discount-badge${d.code==='SB60' ? ' secondary' : ''}">${d.code}</span><span class="discount-text">${d.description}</span></div>`).join('')}
          </div>
          <div class="pricing-cta">
            <a href="https://wa.me/8801922577297" class="btn btn-wa pulse-btn" target="_blank">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M5.784 21.332l.003-.002 1.422-.378A9.956 9.956 0 0 0 12 22.8c5.414 0 9.8-4.386 9.8-9.8S17.414 3.2 12 3.2 2.2 7.586 2.2 13c0 1.74.455 3.37 1.243 4.79l-.003.003-.49 1.898 2.834-.359zm-2.05 1.46L2 22.8l1.26-4.884A10.98 0 0 1 2 13C2 7.477 6.477 3 12 3s10 4.477 10 10-4.477 10-10 10a10.971 10.971 0 0 1-5.284-1.348l-2.982.14z"/></svg>
              Contact on WhatsApp
            </a>
            <p class="pricing-note">⚡ License delivered manually within minutes</p>
          </div>
        </div>`;
      const rightHtml = `
        <div class="pricing-right">
          <p class="features-label">Everything included:</p>
          <ul class="pricing-features-list">
            <li><span class="check">✦</span> 1 Device Activation</li>
            <li><span class="check">✦</span> All 5 Premium Themes</li>
            <li><span class="check">✦</span> Smart Search &amp; Grid Zoom</li>
            <li><span class="check">✦</span> Hover Preview System</li>
            <li><span class="check">✦</span> Auto Organization Engine</li>
            <li><span class="check">✦</span> Manual License Delivery</li>
            <li><span class="check">✦</span> Lifetime Updates</li>
            <li><span class="check">✦</span> Developer Support (WhatsApp)</li>
          </ul>
          <div class="whatsapp-contact">
            <p>Send your coupon code &amp; payment proof to:</p>
            <a href="https://wa.me/8801922577297" class="wa-number" target="_blank">📞 01922577297</a>
          </div>
        </div>`;
      container.innerHTML = leftHtml + rightHtml;
    })
    .catch(err => {
      console.error('Failed to load pricing data:', err);
      container.innerHTML = '<p class="pricing-note">Unable to load pricing information.</p>';
    });
});
