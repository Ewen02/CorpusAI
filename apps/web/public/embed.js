/**
 * CorpusAI Embed — Floating Chat Bubble
 *
 * Usage:
 *   <script src="https://app.corpusai.io/embed.js" data-ai="@username/slug"></script>
 *
 * Options (data attributes):
 *   data-ai        (required) — AI slug, e.g. "@username/my-ai"
 *   data-theme     — "light" | "dark" | "system" (default: "system")
 *   data-color     — Primary color hex (default: "#3b82f6")
 *   data-position  — "left" | "right" (default: "right")
 */
(function () {
  'use strict';

  var scripts = document.getElementsByTagName('script');
  var currentScript = scripts[scripts.length - 1];

  var slug = currentScript.getAttribute('data-ai');
  if (!slug) {
    console.error('[CorpusAI] Missing data-ai attribute on embed script.');
    return;
  }

  var theme = currentScript.getAttribute('data-theme') || 'system';
  var color = currentScript.getAttribute('data-color') || '#3b82f6';
  var position = currentScript.getAttribute('data-position') || 'right';
  var origin = currentScript.src.replace(/\/embed\.js.*$/, '');

  // Build iframe URL
  var params = ['hideHeader=1'];
  if (theme !== 'system') params.push('theme=' + encodeURIComponent(theme));
  if (color !== '#3b82f6') params.push('color=' + encodeURIComponent(color));
  var iframeSrc = origin + '/embed/' + slug + '?' + params.join('&');

  // Inject styles
  var style = document.createElement('style');
  var posLeft = position === 'left';
  style.textContent =
    '.corpusai-bubble{position:fixed;bottom:20px;' +
    (posLeft ? 'left' : 'right') +
    ':20px;' +
    'width:56px;height:56px;border-radius:50%;background:' +
    color +
    ';cursor:pointer;' +
    'display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.25);' +
    'z-index:2147483647;transition:transform .2s,box-shadow .2s;border:none;padding:0;}' +
    '.corpusai-bubble:hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(0,0,0,.3);}' +
    '.corpusai-bubble svg{width:28px;height:28px;fill:#fff;}' +
    '.corpusai-container{position:fixed;bottom:88px;' +
    (posLeft ? 'left' : 'right') +
    ':20px;' +
    'width:400px;height:600px;max-height:calc(100vh - 108px);border-radius:16px;overflow:hidden;' +
    'box-shadow:0 8px 30px rgba(0,0,0,.3);z-index:2147483647;display:none;' +
    'transition:opacity .2s,transform .2s;opacity:0;transform:translateY(10px);}' +
    '.corpusai-container.corpusai-open{display:block;opacity:1;transform:translateY(0);}' +
    '.corpusai-container iframe{width:100%;height:100%;border:none;}' +
    '.corpusai-close{position:absolute;top:8px;' +
    (posLeft ? 'left' : 'right') +
    ':8px;' +
    'width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,.5);border:none;cursor:pointer;' +
    'display:flex;align-items:center;justify-content:center;z-index:1;padding:0;}' +
    '.corpusai-close svg{width:14px;height:14px;fill:#fff;}' +
    '@media(max-width:480px){' +
    '.corpusai-container{width:100%;height:100%;bottom:0;' +
    (posLeft ? 'left' : 'right') +
    ':0;' +
    'border-radius:0;max-height:100vh;}}';
  document.head.appendChild(style);

  // Chat icon SVG
  var chatSvg =
    '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  var closeSvg =
    '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

  // Create bubble button
  var bubble = document.createElement('button');
  bubble.className = 'corpusai-bubble';
  bubble.innerHTML = chatSvg;
  bubble.setAttribute('aria-label', 'Open chat');

  // Create container
  var container = document.createElement('div');
  container.className = 'corpusai-container';

  var closeBtn = document.createElement('button');
  closeBtn.className = 'corpusai-close';
  closeBtn.innerHTML = closeSvg;
  closeBtn.setAttribute('aria-label', 'Close chat');

  var iframe = document.createElement('iframe');
  iframe.title = 'CorpusAI Assistant';
  iframe.allow = 'clipboard-write';

  container.appendChild(closeBtn);
  container.appendChild(iframe);

  var isOpen = false;
  var iframeLoaded = false;

  function toggle() {
    isOpen = !isOpen;
    if (isOpen) {
      if (!iframeLoaded) {
        iframe.src = iframeSrc;
        iframeLoaded = true;
      }
      container.classList.add('corpusai-open');
      bubble.innerHTML = closeSvg;
      bubble.setAttribute('aria-label', 'Close chat');
    } else {
      container.classList.remove('corpusai-open');
      bubble.innerHTML = chatSvg;
      bubble.setAttribute('aria-label', 'Open chat');
    }
  }

  bubble.addEventListener('click', toggle);
  closeBtn.addEventListener('click', toggle);

  document.body.appendChild(container);
  document.body.appendChild(bubble);
})();
