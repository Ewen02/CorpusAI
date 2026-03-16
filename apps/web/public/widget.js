/**
 * CorpusAI Widget Loader
 *
 * Usage:
 *   <script src="https://corpusai.io/widget.js" data-ai="your-slug"></script>
 *
 * Options (data attributes):
 *   data-ai       (required) — AI assistant slug
 *   data-theme    — "light" | "dark" | "system" (default: "system")
 *   data-color    — Primary color hex (e.g., "#3b82f6")
 *   data-height   — Widget height in px (default: "600")
 *   data-container — ID of an existing element to inject into
 *   data-hide-header — "true" to hide the header
 *   data-hide-footer — "true" to hide the footer
 */
(function () {
  'use strict';

  // Find the current script tag
  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];

  var slug = currentScript.getAttribute('data-ai');
  if (!slug) {
    console.error('[CorpusAI] Missing data-ai attribute on widget script.');
    return;
  }

  var theme = currentScript.getAttribute('data-theme') || '';
  var color = currentScript.getAttribute('data-color') || '';
  var height = currentScript.getAttribute('data-height') || '600';
  var containerId = currentScript.getAttribute('data-container') || '';
  var hideHeader = currentScript.getAttribute('data-hide-header') || '';
  var hideFooter = currentScript.getAttribute('data-hide-footer') || '';

  // Build the embed URL
  var origin = currentScript.src.replace(/\/widget\.js.*$/, '');
  var params = [];
  if (theme && theme !== 'system') params.push('theme=' + encodeURIComponent(theme));
  if (color) params.push('color=' + encodeURIComponent(color));
  if (hideHeader === 'true' || hideHeader === '1') params.push('hideHeader=1');
  if (hideFooter === 'true' || hideFooter === '1') params.push('hideFooter=1');

  var src = origin + '/embed/' + encodeURIComponent(slug);
  if (params.length > 0) src += '?' + params.join('&');

  // Create the iframe
  var iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.width = '100%';
  iframe.height = height;
  iframe.frameBorder = '0';
  iframe.allow = 'clipboard-write';
  iframe.style.cssText = 'border:none;border-radius:12px;max-width:100%;';
  iframe.title = 'CorpusAI Assistant';

  // Inject into container or after script tag
  if (containerId) {
    var container = document.getElementById(containerId);
    if (container) {
      container.appendChild(iframe);
    } else {
      console.error('[CorpusAI] Container element #' + containerId + ' not found.');
      currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
    }
  } else {
    currentScript.parentNode.insertBefore(iframe, currentScript.nextSibling);
  }
})();
