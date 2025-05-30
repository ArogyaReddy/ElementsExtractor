// ============================= @section: Element AI Extractor - popup.js =============================
/**
 * @fileoverview Main script for Element AI Extractor popup.
 * Handles: UI setup, extraction, locator generation, user events, table render, utility functions.
 */

// ============================= @section: AI Tips (Constants) =============================
const aiTips = ['Did you know? [role] and [aria-label] improve accessibility and test stability.', 'AI Tip: Interactable (clickable) elements are best for automation.', 'Pro tip: Prefer visible elements for automation—hidden ones may change.', 'AI Tip: IDs are the most stable selectors—use them if available!', 'AI Tip: XPath lets you select by text, attribute, or position.', 'AI Tip: Use CSS selectors for faster automation scripts.', 'AI Tip: Filter by element type for faster locator selection.', 'Pro tip: Combine CSS classes for more unique selectors.'];

// ============================= @section: UI Initialization =============================
/**
 * On popup load:
 *  - Shows a random AI tip
 *  - Sets up initial checkbox states
 *  - Loads last extracted results if available
 */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ai-tip').textContent = aiTips[Math.floor(Math.random() * aiTips.length)];
  document.getElementById('filterAll').checked = true;
  elementTypeList.forEach(type => (document.getElementById(type.id).checked = false));
  chrome.storage.local.get(['lastExtractedData'], res => {
    if (res.lastExtractedData && Array.isArray(res.lastExtractedData)) {
      renderElementsTable(res.lastExtractedData);
      document.getElementById('status').textContent = 'Previous extraction loaded.';
    }
  });
});

// ============================= @section: Supported Element Types =============================
const elementTypeList = [
  {id: 'filterLinks', label: 'Links', selector: 'a'},
  {id: 'filterButtons', label: 'Buttons', selector: "button,input[type='button'],input[type='submit']"},
  {id: 'filterInputs', label: 'Inputs', selector: 'input,select,textarea'},
  {id: 'filterCombo', label: 'Combo', selector: "select,[role='combobox']"},
  {id: 'filterHeaders', label: 'Headers', selector: 'h1,h2,h3,h4,h5,h6'},
  {id: 'filterTextboxes', label: 'Textboxes', selector: "input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']"},
  {id: 'filterCheckboxes', label: 'Checkboxes', selector: "input[type='checkbox']"},
  {id: 'filterRadios', label: 'Radios', selector: "input[type='radio']"},
  {id: 'filterLists', label: 'Lists', selector: 'ul,ol,li,dl,dt,dd'},
  {id: 'filterForms', label: 'Forms', selector: 'form'},
  {id: 'filterSVG', label: 'SVG', selector: 'svg'},
  {id: 'filterTables', label: 'Tables', selector: 'table,thead,tbody,tr,td,th'},
  {id: 'filterSpans', label: 'Spans', selector: 'span'},
  {id: 'filterDivs', label: 'Divs', selector: 'div'},
  {id: 'filterCustom', label: 'Custom Elements', selector: '*'}
];

// ============================= @section: Filter Checkbox and Toggle Logic =============================
/**
 * "All Elements" toggle sets/resets all filters.
 */
const filterAllBox = document.getElementById('filterAll');
filterAllBox.addEventListener('change', function () {
  elementTypeList.forEach(type => {
    document.getElementById(type.id).checked = this.checked;
  });
});
elementTypeList.forEach(type => {
  document.getElementById(type.id).addEventListener('change', function () {
    if (!this.checked) filterAllBox.checked = false;
    else filterAllBox.checked = elementTypeList.every(type => document.getElementById(type.id).checked);
  });
});

// ---- Visible/Hidden mutual exclusion ----
document.getElementById('filterVisible').addEventListener('change', function () {
  if (this.checked) document.getElementById('filterHidden').checked = false;
});
document.getElementById('filterHidden').addEventListener('change', function () {
  if (this.checked) document.getElementById('filterVisible').checked = false;
});

// ============================= @section: Utility Functions =============================

/**
 * @function getCurrentFilters
 * @returns {Object} - Current UI filter selections.
 */
function getCurrentFilters() {
  return {
    selectedTypes: elementTypeList.filter(type => document.getElementById(type.id).checked).map(type => type.id),
    shadowDOM: document.getElementById('filterShadow').checked,
    visibleOnly: document.getElementById('filterVisible').checked,
    hiddenOnly: document.getElementById('filterHidden').checked
  };
}

/**
 * @function getCurrentTabInfo
 * @returns {Promise<{hostname: string, tabId: number}>}
 */
async function getCurrentTabInfo() {
  let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  try {
    const url = new URL(tab.url);
    return {hostname: url.hostname, tabId: tab.id};
  } catch (e) {
    return {hostname: 'site', tabId: tab.id};
  }
}

/**
 * @function nameMatchesSearch
 * @param {string} name
 * @param {string} search
 * @returns {boolean}
 */
function nameMatchesSearch(name, search) {
  if (!search) return true;
  return (name || '').toLowerCase().includes(search.toLowerCase());
}

/**
 * @function copyLocatorToClipboard
 * @param {string} text
 */
function copyLocatorToClipboard(text) {
  navigator.clipboard.writeText(text);
}

/**
 * @function highlightElementOnTab
 * @param {number} tabId
 * @param {string} locator
 * @param {boolean} inShadowDOM
 */
function highlightElementOnTab(tabId, locator, inShadowDOM) {
  chrome.scripting.executeScript({
    target: {tabId},
    args: [locator, inShadowDOM],
    func: (locator, inShadowDOM) => {
      let el = null;
      if (inShadowDOM) {
        function searchShadowRoots(node, selector) {
          if (!node) return null;
          if (node.querySelector) {
            let found = node.querySelector(selector);
            if (found) return found;
          }
          let children = node.children || [];
          for (let child of children) {
            if (child.shadowRoot) {
              let found = searchShadowRoots(child.shadowRoot, selector);
              if (found) return found;
            }
          }
          return null;
        }
        el = searchShadowRoots(document, locator);
      } else {
        if (locator.startsWith('#')) {
          el = document.querySelector(locator);
        } else if (locator.startsWith('/')) {
          let r = document.evaluate(locator, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          el = r.singleNodeValue;
        } else {
          el = document.querySelector(locator);
        }
      }
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center'});
        el.style.outline = '3px solid #48b5f3';
        setTimeout(() => {
          el.style.outline = '';
        }, 1500);
      }
    }
  });
}

// ============================= @section: CSV Download Helper =============================

/**
 * @function downloadCSVFile
 * @param {Array<Object>} elementList
 * @param {string} filename
 */
function downloadCSVFile(elementList, filename) {
  const headers = ['Element Name', 'Element Type', 'Best Locator', 'Locator Type', 'Why Best', 'ID', 'CSS', 'XPATH', 'In Shadow DOM'];
  const csvRows = [headers.join(',')].concat(elementList.map(row => headers.map(h => `"${(row[h] + '').replace(/"/g, '""')}"`).join(',')));
  const blob = new Blob([csvRows.join('\n')], {type: 'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  document.getElementById('status').textContent = `Your locators are ready: ${filename}`;
}

// ============================= @section: Extraction Button Handler =============================

/**
 * Main extract handler. Runs in content script context, updates table, downloads CSV.
 */
document.getElementById('extract').onclick = async () => {
  // Collapse before scan:
  document.querySelector('.popup-root').classList.remove('expanded');
  collapsePopup();
  let extractBtn = document.getElementById('extract');
  extractBtn.disabled = true;
  document.getElementById('status').innerHTML = '<span class="loading">Scanning elements...</span>';
  document.getElementById('preview').innerHTML = '';
  const filters = getCurrentFilters();
  const {hostname, tabId} = await getCurrentTabInfo();

  // Fail-safe timeout
  let failTimeout = setTimeout(() => {
    document.getElementById('status').innerHTML = '❌ Could not extract elements. Try on a regular website.';
    extractBtn.disabled = false;
  }, 9000);

  chrome.scripting.executeScript(
    {
      target: {tabId},
      args: [filters],
      func: domExtractionFunction
    },
    results => {
      clearTimeout(failTimeout);

      if (!results || !results[0] || !results[0].result) {
        document.getElementById('status').textContent = '❌ Injection or extraction failed!';
        extractBtn.disabled = false;
        return;
      }

      if (chrome.runtime.lastError) {
        document.getElementById('status').textContent = '❌ Script injection failed: ' + chrome.runtime.lastError.message;
        extractBtn.disabled = false;
        return;
      }
      if (!results || !Array.isArray(results) || !results[0] || !results[0].result) {
        document.getElementById('status').textContent = '❌ Extraction failed or blocked on this page.';
        extractBtn.disabled = false;
        return;
      }
      let elementDataList = results[0].result;
      chrome.storage.local.set({lastExtractedData: elementDataList});
      if (!elementDataList.length) {
        document.getElementById('status').textContent = 'No elements found.';
        document.getElementById('preview').innerHTML = '';
        extractBtn.disabled = false;
        return;
      }
      document.getElementById('status').textContent = 'Scanned elements!';
      renderElementsTable(elementDataList);
      document.querySelector('.popup-root').classList.add('expanded');

      // Compose filename
      let now = new Date();
      let timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      let filename = `${hostname}_elements_${timestamp}.csv`;
      downloadCSVFile(elementDataList, filename);
      setTimeout(() => (extractBtn.disabled = false), 1100);
    }
  );
};

// ============================= @section: domExtractionFunction (IN-PAGE CONTEXT) =============================
/**
 * @function domExtractionFunction
 * Extracts all elements matching the filters and generates the "best locator" for each.
 * @param {Object} filters - The current UI filter state.
 * @returns {Array<Object>} - Extracted element info with advanced locator logic.
 */
function domExtractionFunction(filters) {
  // -- Helper functions for in-page context --
  /**
   * @function isVisible
   * Checks if the element is visible.
   */
  function isVisible(el) {
    const style = window.getComputedStyle(el);
    return style && style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
  }
  /**
   * @function getUniqueCssSelector
   * Generates a unique CSS selector for the element.
   */
  function getUniqueCssSelector(el) {
    if (el.id) return `#${el.id}`;
    let path = [],
      parent;
    while (el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className) selector += '.' + [...el.classList].join('.');
      parent = el.parentNode;
      let siblings = parent ? [...parent.children].filter(e => e.nodeName === el.nodeName) : [];
      if (siblings.length > 1) selector += `:nth-child(${[...parent.children].indexOf(el) + 1})`;
      path.unshift(selector);
      el = parent;
      if (!el || el === document.body) break;
    }
    return path.join(' > ');
  }
  /**
   * @function getXPath
   * Generates XPath for the element.
   */
  function getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;
    let path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let idx = 1,
        sib = el.previousSibling;
      while (sib) {
        if (sib.nodeType === Node.ELEMENT_NODE && sib.nodeName === el.nodeName) idx++;
        sib = sib.previousSibling;
      }
      path.unshift(el.nodeName.toLowerCase() + '[' + idx + ']');
      el = el.parentNode;
    }
    return '/' + path.join('/');
  }
  /**
   * @function getBestLocator
   * Advanced locator selection logic for best automation reliability.
   */
  function getBestLocator(el) {
    // 1. data-* attributes
    for (let attr of el.getAttributeNames()) {
      if (/^data-(testid|test|qa|automation|cy)\b/i.test(attr)) {
        return {type: 'data-*', locator: `[${attr}="${el.getAttribute(attr)}"]`, reason: 'data-* attribute'};
      }
    }
    // 2. aria-label/labelledby/role
    if (el.getAttribute('aria-label')) {
      return {type: 'aria-label', locator: `[aria-label="${el.getAttribute('aria-label')}"]`, reason: 'aria-label'};
    }
    if (el.getAttribute('aria-labelledby')) {
      return {type: 'aria-labelledby', locator: `[aria-labelledby="${el.getAttribute('aria-labelledby')}"]`, reason: 'aria-labelledby'};
    }
    if (el.getAttribute('role')) {
      return {type: 'role', locator: `[role="${el.getAttribute('role')}"]`, reason: 'role'};
    }
    // 3. id (must be unique in DOM)
    if (el.id && document.querySelectorAll(`#${CSS.escape(el.id)}`).length === 1) {
      return {type: 'id', locator: `#${el.id}`, reason: 'unique id'};
    }
    // 4. Unique class
    if (el.classList.length) {
      for (let cls of el.classList) {
        if (!['btn', 'active', 'selected', 'open', 'close', 'show', 'hide'].includes(cls.toLowerCase())) {
          if (document.querySelectorAll('.' + CSS.escape(cls)).length === 1) {
            return {type: 'class', locator: `.${cls}`, reason: 'unique class'};
          }
        }
      }
    }
    // 5. Text content for buttons/links
    if ((el.tagName === 'BUTTON' || el.tagName === 'A') && el.textContent.trim().length > 0) {
      let match = Array.from(document.querySelectorAll(el.tagName)).filter(n => n.textContent.trim() === el.textContent.trim());
      if (match.length === 1) {
        return {type: 'text', locator: `${el.tagName}:contains("${el.textContent.trim()}")`, reason: 'unique text'};
      }
    }
    // 6. CSS selector fallback
    return {type: 'css', locator: getUniqueCssSelector(el), reason: 'auto-generated CSS'};
  }
  /**
   * @function getElementDisplayName
   * @returns {string} - Name or short label for the element.
   */
  function getElementDisplayName(el) {
    return el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('placeholder') || (el.innerText ? el.innerText.trim().replace(/\s+/g, ' ').slice(0, 40) : el.tagName.toLowerCase());
  }
  /**
   * @function getElementTypeName
   * @returns {string} - For badge/type column
   */
  function getElementTypeName(el) {
    if (el.matches('a')) return 'LINK';
    if (el.matches("button,input[type='button'],input[type='submit']")) return 'BTN';
    if (el.matches('input,select,textarea')) return 'INPUT';
    if (el.matches("select,[role='combobox']")) return 'COMBO';
    if (el.matches('h1,h2,h3,h4,h5,h6')) return 'HDR';
    if (el.matches("input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']")) return 'TXT';
    if (el.matches("input[type='checkbox']")) return 'CHK';
    if (el.matches("input[type='radio']")) return 'RADIO';
    if (el.matches('ul,ol,li,dl,dt,dd')) return 'LIST';
    if (el.matches('form')) return 'FORM';
    if (el.matches('svg')) return 'SVG';
    if (el.matches('table,thead,tbody,tr,td,th')) return 'TABLE';
    if (el.matches('span')) return 'SPAN';
    if (el.matches('div')) return 'DIV';
    if (el.tagName && el.tagName.includes('-')) return 'CUSTOM';
    return el.tagName;
  }

  // -- Main Extraction --
  const typeToSelector = {
    filterLinks: 'a',
    filterButtons: "button,input[type='button'],input[type='submit']",
    filterInputs: 'input,select,textarea',
    filterCombo: "select,[role='combobox']",
    filterHeaders: 'h1,h2,h3,h4,h5,h6',
    filterTextboxes: "input[type='text'],input[type='search'],input[type='email'],input[type='url'],input[type='password']",
    filterCheckboxes: "input[type='checkbox']",
    filterRadios: "input[type='radio']",
    filterLists: 'ul,ol,li,dl,dt,dd',
    filterForms: 'form',
    filterSVG: 'svg',
    filterTables: 'table,thead,tbody,tr,td,th',
    filterSpans: 'span',
    filterDivs: 'div',
    filterCustom: '*'
  };

  let selectorsString = filters.selectedTypes.map(type => typeToSelector[type] || '*').join(',');
  let domElements = [];
  try {
    domElements = Array.from(document.querySelectorAll(selectorsString));
  } catch (e) {
    domElements = Array.from(document.querySelectorAll('*'));
  }
  domElements = domElements.slice(0, 2000);

  let data = [];
  for (let el of domElements) {
    if (filters.visibleOnly && !isVisible(el)) continue;
    if (filters.hiddenOnly && isVisible(el)) continue;
    let displayName = getElementDisplayName(el);
    let id = el.id || '';
    let cssSelector = getUniqueCssSelector(el);
    let xpath = getXPath(el);
    let bestLocator = getBestLocator(el);
    let elementType = getElementTypeName(el);
    data.push({
      'Element Name': displayName,
      'Element Type': elementType,
      'Best Locator': bestLocator.locator,
      'Locator Type': bestLocator.type,
      'Why Best': bestLocator.reason,
      ID: id,
      CSS: cssSelector,
      XPATH: xpath,
      'In Shadow DOM': '' // (Add logic for shadow DOM if needed)
    });
  }
  return data;
}

// ============================= @section: Table Render & Preview =============================
/**
 * @function renderElementsTable
 * Renders a preview table of extracted elements.
 */
function renderElementsTable(data) {
  const search = document.getElementById('search').value;
  let filteredData = data.filter(row => nameMatchesSearch(row['Element Name'], search));
  let maxRows = 12;
  let previewHTML = `<b>Preview (first ${Math.min(maxRows, filteredData.length)}):</b>
    <table><tr>
    <th>Name</th>
    <th>Type</th>
    <th>Best</th>
    <th>ID</th>
    <th>CSS</th>
    <th>XPATH</th>
    <th>Shadow</th>
    <th>Copy</th>
    <th>Highlight</th></tr>`;
  for (let i = 0; i < Math.min(filteredData.length, maxRows); ++i) {
    let r = filteredData[i];
    previewHTML += `<tr>
      <td title="${r['Element Name']}">${r['Element Name']}</td>
      <td><span class="el-badge">${r['Element Type']}</span></td>
      <td title="${r['Best Locator']}">${r['Best Locator']}</td>
      <td title="${r['ID']}">${r['ID']}</td>
      <td title="${r['CSS']}">${r['CSS']}</td>
      <td title="${r['XPATH']}">${r['XPATH']}</td>
      <td>${r['In Shadow DOM'] ? `<span class="shadow-badge">Shadow</span>` : ''}</td>
      <td><button class="copy-btn" data-copy="${r['Best Locator']}" title="Copy to clipboard">📋</button></td>
      <td><button class="hl-btn" data-hl="${r['Best Locator']}" data-shadow="${r['In Shadow DOM'] ? '1' : '0'}" title="Highlight element">👁️</button></td>
    </tr>`;
  }
  previewHTML += '</table>';
  document.getElementById('preview').innerHTML = previewHTML;
  setTimeout(() => bindTablePreviewButtons(), 100);
  expandPopupForResults();
}

/**
 * @function bindTablePreviewButtons
 * Handles copy and highlight actions for table.
 */
function bindTablePreviewButtons() {
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.onclick = e => {
      let text = e.target.getAttribute('data-copy');
      copyLocatorToClipboard(text);
      btn.textContent = '✅';
      setTimeout(() => (btn.textContent = '📋'), 600);
    };
  });
  document.querySelectorAll('.hl-btn').forEach(btn => {
    btn.onclick = async e => {
      let locator = e.target.getAttribute('data-hl');
      let inShadow = e.target.getAttribute('data-shadow') === '1';
      const {tabId} = await getCurrentTabInfo();
      highlightElementOnTab(tabId, locator, inShadow);
      btn.textContent = '✨';
      setTimeout(() => (btn.textContent = '👁️'), 600);
    };
  });
}

// ============================= @section: Table Search Filter =============================
document.getElementById('search').oninput = function () {
  let tableRows = document.querySelectorAll('#preview table tr');
  if (!tableRows.length) return;
  let text = this.value.trim().toLowerCase();
  tableRows.forEach((row, idx) => {
    if (idx == 0) return;
    let name = row.cells[0].textContent.toLowerCase();
    row.style.display = !text || name.includes(text) ? '' : 'none';
  });
};

// ============================= @section: On Load - "All Elements" Checks =============================
if (document.getElementById('filterAll').checked) {
  elementTypeList.forEach(type => {
    document.getElementById(type.id).checked = true;
  });
}


function expandPopupForResults() {
  document.querySelector('.popup-root').classList.add('expanded');
}

function collapsePopup() {
  document.querySelector('.popup-root').classList.remove('expanded');
}

