# 杰哥記帳 - 前端

基於 Google Sheets 的個人記帳系統前端介面。

## 功能特色

- 💰 **預算管理**：設定每月預算，即時顯示剩餘金額與進度條
- 📊 **收支統計**：自動計算本月收入、支出與結餘
- 🏷️ **分類管理**：自訂類別並設定專屬色碼
- ✏️ **記帳編輯**：新增、編輯、刪除交易紀錄
- 📱 **響應式設計**：支援桌面與手機瀏覽器
- 🎨 **清新介面**：柔和配色與流暢動畫

## 技術棧

- **純前端**：HTML + CSS + Vanilla JavaScript
- **UI 框架**：SweetAlert2（彈窗提示）
- **字體**：Zen Maru Gothic + Varela Round
- **API 通訊**：Fetch API

## 檔案結構

```
frontend/
├── index.html      # 主頁面
├── style.css       # 樣式表
├── app.js          # 主要邏輯
├── config.js       # API 設定
├── icon.png        # 網站圖標
└── README.md       # 本文件
```

## 快速開始

### 1. 設定 API 網址

編輯 `config.js`，將 API_BASE_URL 改成你的後端網址：

```javascript
const CONFIG = {
  API_BASE_URL: "hsingo-wallet-backend.zeabur.app",
};
```

## 使用說明

### 登入

- 預設帳號密碼請參考後端設定的環境變數
- 登入後 JWT Token 會儲存在 localStorage

### 預算設定

- 點擊「本月還能花」區塊可設定每月預算
- 進度條會根據支出比例變色（綠 → 黃 → 紅）

### 記帳流程

1. 點擊「記一筆」按鈕
2. 依序填寫：項目名稱 → 類別 → 金額 → 收支 → 日期
3. 點擊「記帳！」完成

### 分類管理

- 點擊「管理分類」可新增/編輯/刪除類別
- 每個類別可設定專屬色碼
- 預設「未分類」類別無法刪除

## 瀏覽器支援

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Android Chrome 90+

## License

MIT
