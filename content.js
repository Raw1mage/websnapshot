let isCapturing = false;
let captureCount = 0;
let nextButtonSelector = 'a:contains("下一頁"), button:contains("下一頁"), a[rel="next"], button[rel="next"], .next, .pagination-next';
let delayMs = 2000;

// 建立浮動狀態顯示
const statusDiv = document.createElement('div');
statusDiv.id = 'screenshot-status';
statusDiv.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 15px 20px;
  border-radius: 8px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  z-index: 999999;
  display: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;
document.body.appendChild(statusDiv);

// 從 storage 載入設定
chrome.storage.sync.get(['nextButtonSelector', 'delayMs'], (result) => {
  if (result.nextButtonSelector) nextButtonSelector = result.nextButtonSelector;
  if (result.delayMs) delayMs = result.delayMs;
});

// 監聽來自 background 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStatus') {
    isCapturing = request.isCapturing;
    captureCount = request.captureCount;
    updateStatusDisplay();
    
    if (isCapturing) {
      // 開始第一次截圖
      startCapture();
    }
  } else if (request.action === 'captureComplete') {
    captureCount = request.count;
    updateStatusDisplay();
    
    if (isCapturing) {
      // 點擊下一頁並繼續
      clickNextAndContinue();
    }
  }
  return true;
});

function updateStatusDisplay() {
  if (isCapturing) {
    statusDiv.style.display = 'block';
    statusDiv.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">🔴 自動截圖中...</div>
      <div>已截取: ${captureCount} 張</div>
      <div style="font-size: 12px; margin-top: 5px; opacity: 0.8;">按 Alt+Shift+S 停止</div>
    `;
  } else {
    if (captureCount > 0) {
      statusDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">✅ 已完成</div>
        <div>共截取: ${captureCount} 張</div>
      `;
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 3000);
    } else {
      statusDiv.style.display = 'none';
    }
  }
}

function startCapture() {
  setTimeout(() => {
    if (isCapturing) {
      chrome.runtime.sendMessage({ action: 'captureScreen' });
    }
  }, 500);
}

function clickNextAndContinue() {
  setTimeout(() => {
    if (!isCapturing) return;
    
    // 尋找下一頁按鈕
    const nextButton = findNextButton();
    
    if (nextButton) {
      console.log('找到下一頁按鈕，準備點擊');
      nextButton.click();
      
      // 等待頁面載入後繼續截圖
      setTimeout(() => {
        if (isCapturing) {
          chrome.runtime.sendMessage({ action: 'captureScreen' });
        }
      }, delayMs);
    } else {
      console.log('找不到下一頁按鈕，停止截圖');
      chrome.runtime.sendMessage({ action: 'toggleCapture' });
      alert('找不到下一頁按鈕，自動截圖已停止');
    }
  }, 1000);
}

function findNextButton() {
  // 嘗試多種方式尋找下一頁按鈕
  const selectors = nextButtonSelector.split(',').map(s => s.trim());
  
  for (const selector of selectors) {
    // 處理 :contains() 偽類選擇器
    if (selector.includes(':contains(')) {
      const match = selector.match(/:contains\(['"](.+)['"]\)/);
      if (match) {
        const text = match[1];
        const tagName = selector.split(':')[0];
        const elements = document.querySelectorAll(tagName);
        for (const el of elements) {
          if (el.textContent.includes(text) && el.offsetParent !== null) {
            return el;
          }
        }
      }
    } else {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        return element;
      }
    }
  }
  
  return null;
}
