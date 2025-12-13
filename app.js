// ===== State =====
let token = localStorage.getItem("token") || null;
let categories = [];
let transactions = [];

// ===== DOM Elements =====
const landingSection = document.getElementById("landing-section");
const loginSection = document.getElementById("login-section");
const mainSection = document.getElementById("main-section");
const goLoginBtn = document.getElementById("go-login-btn");
const backToLandingBtn = document.getElementById("back-to-landing");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const logoutBtn = document.getElementById("logout-btn");
const welcomeMsg = document.getElementById("welcome-msg");

const btnAddTransaction = document.getElementById("btn-add-transaction");
const btnManageCategory = document.getElementById("btn-manage-category");
const transactionList = document.getElementById("transaction-list");
const transactionListTitle = document.getElementById("transaction-list-title");

const totalIncome = document.getElementById("total-income");
const totalExpense = document.getElementById("total-expense");

// 移除預算相關的 DOM 元素抓取，避免報錯
const budgetSection = document.getElementById("budget-section");
const budgetRemaining = document.getElementById("budget-remaining");
const budgetProgressBar = document.getElementById("budget-progress-bar");
const totalBudget = document.getElementById("total-budget");
const budgetPercent = document.getElementById("budget-percent");

// ===== API Helper =====
async function api(endpoint, options = {}) {
  // 請確認 config.js 裡的 CONFIG.API_BASE_URL 是正確的後端網址
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  // 處理非 JSON 的錯誤回傳 (例如 404 網頁)
  const text = await response.text();
  let data;
  try {
      data = JSON.parse(text);
  } catch (e) {
      // 如果回傳的不是 JSON (例如後端掛了)，就手動建立一個錯誤物件
      data = { message: text || `Server Error: ${response.status}` };
  }

  if (!response.ok) {
    throw new Error(data.message || "請求失敗");
  }

  return data;
}

// ===== Auth =====
async function login(username, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  token = data.token;
  localStorage.setItem("token", token);
  return data;
}

function logout() {
  token = null;
  localStorage.removeItem("token");
  showLanding();
}

async function validateToken() {
  if (!token) return false;
  // 簡單驗證：只要有 token 就視為有效，不再去打 API 檢查
  // 這樣可以避免因為後端 API 404 導致被踢出的問題
  return true;
}

// ===== Navigation =====
function showLanding() {
  landingSection.classList.remove("hidden");
  loginSection.classList.add("hidden");
  mainSection.classList.add("hidden");
}

function showLogin() {
  landingSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  mainSection.classList.add("hidden");
}

function showMain() {
  landingSection.classList.add("hidden");
  loginSection.classList.add("hidden");
  mainSection.classList.remove("hidden");
  loadData();
}

// ===== Data Loading =====
async function loadData() {
  try {
    // 移除 loadBudget()，只讀取類別和交易
    await Promise.all([loadCategories(), loadTransactions()]);
  } catch (error) {
    console.error("載入資料失敗:", error);
    // 只有在明確是權限錯誤 (401) 時才登出，其他錯誤 (如 404, 500) 則保留在畫面
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      logout();
    }
  }
}

async function loadCategories() {
  try {
    const data = await api("/api/categories");
    categories = data.data || [];
  } catch (e) {
    console.warn("無法讀取類別，使用預設值", e);
    // 如果後端沒有類別 API，就用預設的
    categories = [
        { id: "1", name: "有點好笑", color_hex: "#ff7675" },
        { id: "2", name: "很好笑", color_hex: "#fdcb6e" },
        { id: "3", name: "超好笑", color_hex: "#00cec9" }
    ]; 
  }
}

async function loadTransactions() {
  const data = await api("/api/transactions");
  transactions = data.data || [];
  renderTransactions();
  updateSummary();
}

// ===== Render Functions =====
function renderTransactions() {
  if (transactions.length === 0) {
    transactionList.innerHTML = `<div style="text-align:center; padding:20px; color:#9ca095;">
      🍃 這裡空空的，還沒有紀錄喔！
    </div>`;
    return;
  }

  // 按日期排序 (新的在前)
  const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  transactionList.innerHTML = sorted
    .map(
      (txn) => {
        // 設定表情符號
        let icon = "😐"; 
        const catName = (txn.category_name || "").trim();
        if (catName === "有點好笑") icon = "😏";
        else if (catName === "很好笑") icon = "😆";
        else if (catName === "超好笑") icon = "🤣";
        else if (catName === "笑到歪腰") icon = "🫠";

        // 🟢 檢查是否有回覆
        const replyHtml = txn.reply 
          ? `<div class="list-reply-preview">
               <span style="color:#ff2e63; font-weight:bold;">↳</span> ${txn.reply}
             </div>` 
          : "";

        return `
        <div class="transaction-item" onclick="window.viewTransaction('${txn.id}')" 
             style="cursor: pointer; flex-direction: column; align-items: stretch; gap: 0;">
          
          <div class="txn-main-row" style="display: flex; justify-content: space-between; align-items: center;">
              <div class="left">
                <div class="category-icon" style="background-color: ${txn.category_color_hex || "#333"}; color: white; font-size: 1.5rem; display: flex; align-items: center; justify-content: center;">
                  ${icon}
                </div>
                <div class="info">
                  <span class="note">${txn.title || "無標題"}</span>
                  <span class="meta">${txn.date} · ${txn.category_name || "一般"}</span>
                </div>
              </div>
              <div class="right">
                <span class="amount" style="font-size: 1rem; color: #555; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${txn.amount || ""}
                </span>
                <button class="edit-btn" onclick="event.stopPropagation(); window.editTransaction('${txn.id}')">✎</button>
                <button class="delete-btn" onclick="event.stopPropagation(); window.deleteTransaction('${txn.id}')">✕</button>
              </div>
          </div>

          ${replyHtml}

        </div>
      `;
      }
    )
    .join("");
}

function updateSummary() {
  // 1. 先取得目前的筆數
  const count = transactions.length;

  // 2. 先把百分比算好 (放在最前面，這樣後面大家都能用)
  let percent = count;
  let safePercent = Math.min(percent, 100); // 最多 100%

  // 3. 更新標題文字
  if(transactionListTitle) transactionListTitle.textContent = `近期紀錄 (共 ${count} 筆)`;
  
  // 4. 更新支出 (顯示筆數)
  if(totalExpense) totalExpense.textContent = count + " 筆";
  
  // 5. 更新中間的大字 (把 "count" 的引號拿掉，才會顯示數字)
  if(budgetRemaining) budgetRemaining.textContent = count; 

  // 6. 更新統計文字 (例如: 5 / 100)
  if(totalBudget) totalBudget.textContent = count + " / 100";

  // 7. 更新百分比文字 (例如: 5%)
  if(budgetPercent) budgetPercent.textContent = `${safePercent}%`;
  
  // 8. 最後更新進度條 (這時候 safePercent 已經算好了，不會報錯)
  if(budgetProgressBar) {
      budgetProgressBar.style.width = `${safePercent}%`;
      
      // 設定顏色
      budgetProgressBar.className = "progress-bar-fill"; // 重置
      if (safePercent < 20) {
        budgetProgressBar.classList.add("danger"); // 紅色
      } else if (safePercent < 50) {
        budgetProgressBar.classList.add("warning"); // 黃色
      }
  }
}

// ===== SweetAlert Flows =====

// 預算功能移除，點擊只顯示提示
async function openBudgetModal() {
    Swal.fire("提示", "快樂是無價的！不需要設定預算喔。", "info");
}

// 新增交易彈窗
async function openAddTransactionModal() {
  // 如果無法從後端讀到類別，就手動提供幾個選項
  const safeCategories = categories.length > 0 ? categories : [
      {name: "有點好笑"}, {name: "很好笑"}, {name: "笑到歪腰"}
  ];

  const categoryOptions = safeCategories
    .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
    .join("");

  const today = new Date().toISOString().split("T")[0];

  const { value: formValues } = await Swal.fire({
    title: "記一筆",
    html: `
      <form id="swal-txn-form" class="swal-form">
        <div class="form-group">
          <label>日期</label>
          <input type="date" id="swal-date" class="swal2-input" value="${today}" required>
        </div>
        
        <div class="form-group">
          <label>類別</label>
          <select id="swal-category" class="swal2-select">
            ${categoryOptions}
          </select>
        </div>
        
        <div class="form-group">
          <label>標題</label>
          <input type="text" id="swal-title" class="swal2-input" placeholder="例如：午餐發生的事" required>
        </div>
        
        <div class="form-group">
          <label>內容</label>
          <input type="text" id="swal-amount" class="swal2-input" placeholder="內容..." required>
        </div>
      </form>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "記錄！",
    cancelButtonText: "取消",
    confirmButtonColor: "#5abf98",
    preConfirm: () => {
      const date = document.getElementById("swal-date").value;
      const category = document.getElementById("swal-category").value;
      const title = document.getElementById("swal-title").value;
      const amount = document.getElementById("swal-amount").value;

      if (!title || !amount) {
        Swal.showValidationMessage("標題和內容都要填寫喔！");
      }

      return { date, category, title, amount };
    },
  });

  if (formValues) {
    Swal.fire({
      title: "處理中...",
      didOpen: () => Swal.showLoading(),
    });

    try {
      await createTransaction(formValues);
      Swal.fire("成功！", "已新增紀錄！", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
}

// 管理類別彈窗 (簡化版)
async function openManageCategoryModal() {
  Swal.fire("提示", "目前使用簡易模式，類別請直接在 Google Sheet 修改喔！", "info");
}

// ===== CRUD Operations =====
async function createTransaction(payload) {
  await api("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      id: `txn-${Date.now()}`,
      // 確保是傳送文字
      amount: String(payload.amount), 
      title: String(payload.title),
      category: String(payload.category)
    }),
  });
  await loadTransactions();
}

// 編輯交易
window.editTransaction = async function (id) {
  const txn = transactions.find((t) => t.id === id);
  if (!txn) return;
  Swal.fire("提示", `內容：${txn.amount}\n(目前僅支援查看，修改請去 Google Sheet)`, "info");
};

window.deleteTransaction = async function (id) {
    Swal.fire("提示", "請直接去 Google Sheet 刪除該行資料喔！", "info");
};

// ===== Event Listeners =====
goLoginBtn.addEventListener("click", showLogin);
backToLandingBtn.addEventListener("click", showLanding);

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  try {
    await login(username, password);
    showMain();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

logoutBtn.addEventListener("click", logout);
btnAddTransaction.addEventListener("click", openAddTransactionModal);
btnManageCategory.addEventListener("click", openManageCategoryModal);
if(budgetSection) budgetSection.addEventListener("click", openBudgetModal);

// ===== Initialize =====
async function init() {
  if (token) {
    const isValid = await validateToken();
    if (isValid) {
      showMain();
    } else {
      showLanding();
    }
  } else {
    showLanding();
  }
}

init();

// 🟢 新增：檢視詳細內容視窗
// 🟢 檢視詳細內容 + 回覆功能
window.viewTransaction = function (id) {
  const txn = transactions.find((t) => t.id === id);
  if (!txn) return;

  // 1. 準備回覆的 HTML (如果有回覆就顯示，沒有就空著)
  const replyHtml = txn.reply 
    ? `<div class="reply-box">
         <div class="reply-label">💬 刺頭的回覆：</div>
         <div class="reply-content">${txn.reply}</div>
       </div>`
    : "";

  Swal.fire({
    title: txn.title || "無標題",
    html: `
      <div style="text-align: left; font-size: 1.1rem; line-height: 1.8;">
        <div style="margin-bottom: 15px; color: #888; font-size: 0.9rem; border-bottom: 1px dashed #ccc; padding-bottom: 10px;">
          📅 日期：${txn.date} <br>
          🏷️ 類別：<span style="color: ${txn.category_color_hex || '#333'}; font-weight: bold;">${txn.category_name || txn.category}</span>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 15px; color: #333; font-weight: 500; white-space: pre-wrap; margin-bottom: 20px;">
          ${txn.amount} 
        </div>

        ${replyHtml}
      </div>
    `,
    width: 600,
    showCloseButton: true,
    showConfirmButton: true,
    confirmButtonText: "關閉",
    confirmButtonColor: "#5abf98",
    
    // 2. 新增回覆按鈕
    showDenyButton: true,
    denyButtonText: "💬 回覆 / 修改",
    denyButtonColor: "#74b9ff",
  }).then(async (result) => {
    // 3. 如果點了「回覆」按鈕
    if (result.isDenied) {
        const { value: text } = await Swal.fire({
            input: 'textarea',
            inputLabel: '寫下你的回覆',
            inputValue: txn.reply || "", // 如果原本有回覆，就帶入原本的內容
            inputPlaceholder: '例如：哈哈這真的超好笑...',
            showCancelButton: true,
            confirmButtonText: "送出回覆",
            cancelButtonText: "取消"
        });

        if (text !== undefined) { // 如果有點擊送出 (包含清空)
            try {
                // 呼叫後端 API 更新 reply
                await api(`/api/transactions/${id}`, {
                    method: "PUT",
                    body: JSON.stringify({ reply: text })
                });
                
                await loadTransactions(); // 重新讀取資料
                
                // 更新成功後，重新打開檢視視窗讓使用者看到結果
                window.viewTransaction(id);
                
                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                });
                Toast.fire({ icon: 'success', title: '回覆已儲存' });

            } catch (error) {
                Swal.fire("失敗", error.message, "error");
            }
        }
    }
  });
};