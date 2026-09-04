<style>
  .loader {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    transition: opacity .25s ease, visibility .25s ease;
  }

  .loader.is-hidden {
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }

  .loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 22px;
    min-width: 180px;
  }

  .loader-logo-stage {
    width: 78px;
    height: 78px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .loader-logo {
    width: 68px;
    height: 68px;
    object-fit: contain;
    filter: drop-shadow(0 10px 14px rgba(15, 23, 42, .14));
    animation: allterusLogoFloat 1.6s ease-in-out infinite;
  }

  .loader-message {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #24345f;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    font-size: 15px;
    font-weight: 500;
    letter-spacing: .01em;
  }

  .loader-spinner {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 2px solid rgba(36, 52, 95, .22);
    border-top-color: #24345f;
    animation: allterusSpin .8s linear infinite;
  }

  @keyframes allterusSpin { to { transform: rotate(360deg); } }

  @keyframes allterusLogoFloat {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-3px) scale(1.025); }
  }

  @media (prefers-reduced-motion: reduce) {
    .loader-logo,
    .loader-spinner { animation: none; }
  }
</style>
<div id="loader" class="loader" role="status" aria-live="polite" aria-label="Preparando ambiente...">
  <div class="loader-content">
    <div class="loader-logo-stage">
      <img class="loader-logo" src="data:image/png;base64,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" alt="Allterus" width="68" height="68">
    </div>
    <div class="loader-message">
      <span class="loader-spinner" aria-hidden="true"></span>
      <span>Preparando ambiente...</span>
    </div>
  </div>
</div>
<script>
  (function() {
    function hideLoader() {
      var loader = document.getElementById('loader');
      if (!loader) return;
      loader.classList.add('is-hidden');
      window.setTimeout(function() {
        if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
      }, 300);
    }

    if (document.readyState === 'complete') hideLoader();
    else window.addEventListener('load', hideLoader, { once: true });
  })();
</script>
