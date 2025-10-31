let isCapturing = false;
let captureCount = 0;

// 監聽快捷鍵
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-capture') {
    toggleCapture();
  }
});

// 監聽來自 content script 和 popup 的訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleCapture') {
    toggleCapture();
    sendResponse({ isCapturing, captureCount });
  } else if (request.action === 'getStatus') {
    sendResponse({ isCapturing, captureCount });
  } else if (request.action === 'captureScreen') {
    captureCurrentTab(sender.tab.id);
  }
  return true;
});

function toggleCapture() {
  isCapturing = !isCapturing;
  
  if (isCapturing) {
    captureCount = 0;
    console.log('開始自動截圖');
  } else {
    console.log('停止自動截圖，共截取 ' + captureCount + ' 張');
  }
  
  // 通知所有分頁更新狀態
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateStatus',
        isCapturing,
        captureCount
      }).catch(() => {}); // 忽略錯誤（某些分頁可能無法接收訊息）
    });
  });
}

function captureCurrentTab(tabId) {
  if (!isCapturing) return;
  
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error('截圖錯誤:', chrome.runtime.lastError.message);
      return;
    }
    
    captureCount++;
    
    // 將 PNG 轉換為 JPG 並下載
    convertAndDownload(dataUrl, captureCount);
    
    // 通知 content script 繼續下一步
    chrome.tabs.sendMessage(tabId, {
      action: 'captureComplete',
      count: captureCount
    });
  });
}

function convertAndDownload(dataUrl, count) {
  // 從 storage 獲取設定
  chrome.storage.sync.get(['saveFolder'], (result) => {
    const folder = result.saveFolder || 'screenshots';
    const filename = `${folder}/screenshot_${String(count).padStart(4, '0')}.jpg`;
    
    // 將 PNG DataURL 轉換為 JPG
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF'; // 白色背景
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(resolve, 'image/jpeg', 0.92);
          };
          img.src = URL.createObjectURL(blob);
        });
      })
      .then(jpgBlob => {
        const url = URL.createObjectURL(jpgBlob);
        
        chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: false
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error('下載錯誤:', chrome.runtime.lastError.message);
          } else {
            console.log(`已儲存: ${filename}`);
          }
          // 清理 URL
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
      });
  });
}
