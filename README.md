# PPL Training Mobile 健身日誌全端系統

基於頂級暗黑極簡運動風 UI 打造的行動優先（Mobile-First）健身日誌系統。結合 **Next.js (App Router)**、**Google Sheets API** 與 **Google Gemini AI 智慧自然語言助理**，完美支援 **Vercel 一鍵部署**。

---

## 🌟 核心特色

1. **原汁原味行動極簡介面**：
   - 完整移植原版 PPL 模板設計，包含總覽、訓練、課表、紀錄、進度五大功能頁面。
   - 動態計算 Primary Lift 訓練總 Volume，並以流暢 SVG 柱狀圖即時可視化呈現。
   - 滾動式循環（Rolling PPL）指示器，不再受限於星期幾，無縫追蹤目前進度。

2. **Gemini AI 對話記日誌**：
   - 右下角懸浮隨身教練按鈕，只要直接輸入：「*今天練了 Push A，臥推 50kg 8下四組，啞鈴側平舉 10kg 15下三組*」。
   - Gemini 會精確解析動作、重量、組數與次數，自動計算訓練總量（Volume），並整理為結構化數據。
   - 提供溫暖且專業的教練風格回饋，並自動寫入 Google Sheets，前端即時刷新！

3. **Google Sheets 雲端資料庫**：
   - 使用您指定的 Google 試算表作為資料庫，所有歷史紀錄與數據全都在自己的 Google 雲端硬碟，透明且安全。
   - 未設定 GEMINI_API_KEY 或解析失敗時，一律回報錯誤且不寫入試算表，確保日誌內容都來自實際解析結果。

4. **Vercel 一鍵無痛部署**：
   - 伺服器端 API 路由安全保護 `GEMINI_API_KEY` 與 Google 服務帳戶私鑰，杜絕機密外洩。

---

## 🚀 快速開始

### 1. 安裝相依套件

```bash
npm install
```

### 2. 環境變數設定

複製 `.env.example` 為 `.env.local`：

```bash
cp .env.example .env.local
```

編輯 `.env.local`，填入以下資訊：

```env
# 1. Google Gemini API Key（前往 https://aistudio.google.com/ 免費獲取）
GEMINI_API_KEY=your_gemini_api_key_here
# 選填：Gemini 模型名稱，預設 gemini-2.5-flash
# GEMINI_MODEL=gemini-2.5-flash

# 2. 目標 Google Sheet ID（網址 /d/ 與 /edit 之間的那段代碼）
GOOGLE_SHEET_ID=your_google_sheet_id_here

# 3. Google Cloud Service Account 憑證（見下方設定步驟）
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# 4. 入口密碼（必填，未設定時所有頁面與 API 一律拒絕存取）
APP_PASSWORD=your_entry_password_here
```

### 3. 本地啟動預覽

```bash
npm run dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000)，輸入入口密碼後即可使用。

---

## 🔒 入口密碼

所有頁面與 API（含 `/api/data`、`/api/chat`、`/api/config`）都需先通過入口密碼。

- 登入時前端自動帶上當天日期（台北時間），後端確認密碼正確且日期與伺服器一致後，發出 httpOnly cookie
- token 為 `日期 + HMAC-SHA256(key=APP_PASSWORD, msg=日期)`，每次請求都以伺服器的台北日期重新計算比對，**跨日即失效**，需重新輸入密碼
- 修改 `APP_PASSWORD` 後，所有已發出的 token 立即失效
- 未設定 `APP_PASSWORD` 時一律拒絕存取

---

## 🔑 Google Cloud Service Account 設定教學

若要讓系統自動讀寫您的 Google Sheet，請依照以下步驟設定：

1. 前往 [Google Cloud Console](https://console.cloud.google.com/) 並建立新專案（或選擇現有專案）。
2. 在 **API 和服務 > 程式庫** 中，搜尋並啟用 **Google Sheets API**。
3. 前往 **IAM 與管理 > 服務帳戶 (Service Accounts)**，點擊「**建立服務帳戶**」：
   - 名稱可自訂（如 `training-sheet-bot`）。
   - 角色可選擇 `專案 > 編輯者` 或略過。
4. 建立完成後，點擊該服務帳戶進入詳情頁，切換到「**金鑰 (Keys)**」分頁：
   - 點擊「新增金鑰」>「建立新的金鑰」> 選擇 **JSON** 並下載。
5. **重要步驟（共用權限）**：
   - 開啟您的 [Google 試算表](https://docs.google.com/spreadsheets/d/your_google_sheet_id_here/edit)。
   - 點擊右上角「**共用**」。
   - 將剛才建立的服務帳戶 Email（如 `xxx@xxx.iam.gserviceaccount.com`）新增為 **「編輯者」**。
6. 將下載的 JSON 檔案中的 `client_email` 與 `private_key` 貼到 `.env.local` 即可！

---

## ☁️ Vercel 部署指南

1. 將專案推送到 GitHub / GitLab。
2. 登入 [Vercel](https://vercel.com/)，點擊 **Add New Project** 並匯入該 Repository。
3. 在 **Environment Variables** 區域新增下列 5 個環境變數：
   - `APP_PASSWORD`
   - `GEMINI_API_KEY`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`（請確保保留前後引號或換行字元）
4. 點擊 **Deploy**，約 1 分鐘後即可上線！

---
**最後更新**: 2026-09-24
**維護者**: 開發團隊
**文件版本**: v2.0
**變更記錄**（里程碑，最多 5 條）:
- v2.0 (2026-09-24): 新增入口密碼機制，所有頁面與 API 需登入，token 僅當日（台北時間）有效；新增必填環境變數 APP_PASSWORD
- v1.0 (2026-09-24): 移除 Gemini 模擬解析，未設定金鑰或解析失敗時不寫入試算表；新增選填環境變數 GEMINI_MODEL
