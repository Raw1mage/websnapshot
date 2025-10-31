
const statusDiv = document.getElementById('status');
const toggleBtn = document.getElementById('toggleBtn');
const saveFolderInput = document.getElementById('saveFolder');
const nextButtonSelectorInput = document.getElementById('nextButtonSelector');
const delayMsInput = document.getElementById('delayMs');
const saveSettingsBtn = document.getElementById('saveSettings');

// 載入當前狀態
function updateStatus() {
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response) {
      const { isCapturing, captureCount } = response;
      
      if (isCapturing) {
        statusDiv.className = 'status active';
        statusDiv.textContent = `🔴 截圖中... (已截取: ${captureCount} 張)`;
        toggleBtn.textContent = '停止截圖';
        toggleBtn.className = 'btn-danger';
      } else {
        statusDiv.className = 'status inactive';
        statusDiv.textContent = `⏸️ 未啟動 (已截取: ${captureCount} 張)`;
        toggleBtn.textContent = '開始截圖';
        toggleBtn.className = 'btn-primary';
      }
    }
  });
}

// 初始載入
updateStatus();

// 每秒更新一次狀態
setInterval(updateStatus, 1000);

// 切換截圖狀態
toggleBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'toggleCapture' }, (response) => {
    updateStatus();
  });
});

// 載入設定
chrome.storage.sync.get(['saveFolder', 'nextButtonSelector', 'delayMs'], (result) => {
  saveFolderInput.value = result.saveFolder || 'screenshots';
  nextButtonSelectorInput.value = result.nextButtonSelector || 'a:contains("下一頁"), button:contains("下一頁"), a[rel="next"], .next';
  delayMsInput.value = result.delayMs || 2000;
});

// 儲存設定
saveSettingsBtn.addEventListener('click', () => {
  const settings = {
    saveFolder: saveFolderInput.value || 'screenshots',
    nextButtonSelector: nextButtonSelectorInput.value,
    delayMs: parseInt(delayMsInput.value) || 2000
  };
  
  chrome.storage.sync.set(settings, () => {
    // 視覺回饋
    saveSettingsBtn.textContent = '✓ 已儲存';
    setTimeout(() => {
      saveSettingsBtn.textContent = '儲存設定';
    }, 1500);
    
    // 通知所有分頁更新設定
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateSettings',
          settings
        }).catch(() => {});
      });
    });
  });
});
