// contentScript.js
if (!window.aiExtractorOverlayInjected) {
  window.aiExtractorOverlayInjected = true;
  const panel = document.createElement('div');
  panel.innerHTML = '<button>Extract Elements (Overlay!)</button>';
  panel.style.position = 'fixed';
  panel.style.top = '10px';
  panel.style.right = '10px';
  panel.style.zIndex = 99999;
  document.body.appendChild(panel);

  panel.querySelector('button').onclick = () => {
    alert('Extraction logic can go here!');
    // Or trigger the extraction logic as in your popup
  };
}
