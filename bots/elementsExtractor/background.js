chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'aiExtractorMenu',
    title: 'Extract elements with AI Extractor',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'aiExtractorMenu') {
    chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ['contentScript.js'] // or open popup, etc.
    });
  }
});
