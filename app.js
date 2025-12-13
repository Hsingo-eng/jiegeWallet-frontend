// ===== State =====
let token = localStorage.getItem("token") || null;
let categories = [];
let transactions = [];
let budget = { id: "1", amount: "0" };

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

const budgetSection = document.getElementById("budget-section");
const budgetRemaining = document.getElementById("budget-remaining");
const budgetProgressBar = document.getElementById("budget-progress-bar");
const totalBudget = document.getElementById("total-budget");
const budgetPercent = document.getElementById("budget-percent");

// ===== API Helper =====
async function api(endpoint, options = {}) {
  // 記得確認 config.js 裡面的 CONFIG.API_BASE_URL 是否正確
  const url = `${CONFIG.API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

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
  try {
    // 試著打一支 API 驗證 token 是否有效
    await api("/api/categories");
    return true;
  } catch (error) {
    token = null;
    localStorage.removeItem("token");
    return false;
  }
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
    await Promise.all([loadCategories(), loadTransactions(), loadBudget()]);
  } catch (error) {
    if (error.message.includes("token") || error.message.includes("未授權")) {
      logout();
    }
  }
}

async function loadCategories() {
  const data = await api("/api/categories");
  categories = data.data || [];
}

async function loadTransactions() {
  const data = await api("/api/transactions");
  transactions = data.data || [];
  renderTransactions();
  updateSummary();
}

async function loadBudget() {
  const data = await api("/api/budget");
  budget = data.data || { id: "1", amount: "0" };
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
      (txn) => `
      <div class="transaction-item">
        <div class="left">
          <div class="category-icon" style="background-color: ${txn.category_color_hex || "#9E9E9E"}">
            ${txn.category_name ? txn.category_name.charAt(0) : "無"}
          </div>
          <div class="info">
            <span class="note">${txn.title || "無標題"}</span>
            <span class="meta">${txn.date} · ${txn.category_name || "一般"}</span>
          </div>
        </div>
        <div class="right">
          <span class="amount" style="font-size: 1rem; color: #555;">
            ${txn.amount || ""}
          </span>
          <button class="edit-btn" onclick="window.editTransaction('${txn.id}')">✎</button>
          <button class="delete-btn" onclick="window.deleteTransaction('${txn.id}')">✕</button>
        </div>
      </div>
    `
    )
    .join("");
}

function updateSummary() {
  // ⚠️ 修改：因為現在是記文字，所以不再計算金額總和，改顯示筆數
  const count = transactions.length;
  transactionListTitle.textContent = `近期紀錄 (共 ${count} 筆)`;
  
  // 為了避免版面壞掉，把原本顯示金額的地方改成顯示固定文字或統計筆數
  if(totalIncome) totalIncome.textContent = "-";
  if(totalExpense) totalExpense.textContent = count; // 把支出顯示區改成顯示筆數
  
  if(budgetRemaining) budgetRemaining.textContent = "Happy!";
  if(totalBudget) totalBudget.textContent = count + " 件事";
  if(budgetPercent) budgetPercent.textContent = "100%";
  if(budgetProgressBar) budgetProgressBar.style.width = "100%";
}

// ===== SweetAlert Flows =====

// 設定預算彈窗 (這個功能在笑話本可能用不到，先保留但不會壞掉)
async function openBudgetModal() {
    Swal.fire("提示", "快樂是無價的！不需要設定預算喔。", "info");
}

// 🟢 新增交易彈窗 (重點修復區)
async function openAddTransactionModal() {
  const categoryOptions = categories
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
          <input type="text" id="swal-title" class="swal2-input" placeholder="例如：午餐發生的事" required autofocus>
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
      // ⚠️ 修正：移除不存在的 swal-type，並加入 title
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

// 管理類別彈窗
async function openManageCategoryModal() {
  const categoryListHtml = categories
    .map(
      (cat) => `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding:8px; background:#f9f9f9; border-radius:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex:1;">
          <span style="width:12px; height:12px; border-radius:50%; background:${cat.color_hex || '#999'}"></span>
          <span>${cat.name}</span>
        </div>
        <button onclick="window.deleteCategory('${cat.id}')" style="border:none; background:none; color:red; cursor:pointer;">✕</button>
      </div>
    `
    )
    .join("");

  const { value: newCat } = await Swal.fire({
    title: "管理類別",
    html: `
      <div style="text-align:left; margin-bottom:16px;">
        <label style="font-weight:bold;">新增類別</label>
        <div style="display:flex; gap:8px; margin-top:8px;">
          <input id="swal-cat-name" class="swal2-input" placeholder="名稱" style="margin:0 !important;">
          <input id="swal-cat-color" type="color" value="#5abf98" style="height:46px; width:60px; padding:0; border:none;">
        </div>
      </div>
      <div style="text-align:left; max-height:200px; overflow-y:auto;">
        <label style="font-weight:bold; margin-bottom:8px; display:block;">現有類別</label>
        ${categoryListHtml}
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "新增",
    preConfirm: () => {
      const name = document.getElementById("swal-cat-name").value;
      const color = document.getElementById("swal-cat-color").value;
      if (!name) return null;
      return { name, color_hex: color };
    },
  });

  if (newCat) {
    try {
      await api("/api/categories", {
        method: "POST",
        body: JSON.stringify(newCat),
      });
      await loadCategories();
      Swal.fire("成功", "類別已新增！", "success").then(() => openManageCategoryModal());
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
}

// ===== CRUD Operations =====
async function createTransaction(payload) {
  await api("/api/transactions", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      id: `txn-${Date.now()}`,
      // ⚠️ 修正：絕對不要加 Number()，因為我們要傳送文字
      amount: payload.amount, 
      title: payload.title,
      category: payload.category
    }),
  });
  await loadTransactions();
}

// 編輯交易
window.editTransaction = async function (id) {
  const txn = transactions.find((t) => t.id === id);
  if (!txn) return;

  // 簡化編輯，只讓使用者改內容
  const { value: formValues } = await Swal.fire({
    title: "編輯",
    input: "text",
    inputLabel: "修改內容",
    inputValue: txn.amount, // 這裡顯示原本的文字內容
    showCancelButton: true,
  });

  if (formValues) {
     // 為了簡單起見，這裡先只做最基本的更新，若要完整功能需配合後端 PUT 邏輯
     Swal.fire("提示", "目前簡易版僅支援查看，若需修改請刪除後重新新增！", "info");
  }
};

window.deleteTransaction = async function (id) {
  const result = await Swal.fire({
    title: "確定刪除？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ff7675",
    confirmButtonText: "刪除",
  });

  if (result.isConfirmed) {
    try {
      await api(`/api/transactions/${id}`, { method: "DELETE" });
      await loadTransactions();
      Swal.fire("已刪除", "", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
};

window.deleteCategory = async function (id) {
  const result = await Swal.fire({
    title: "刪除類別？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ff7675",
    confirmButtonText: "刪除",
  });

  if (result.isConfirmed) {
    try {
      await api(`/api/categories/${id}`, { method: "DELETE" });
      await loadCategories();
      Swal.fire("已刪除", "", "success");
    } catch (error) {
      Swal.fire("失敗", error.message, "error");
    }
  }
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
budgetSection.addEventListener("click", openBudgetModal);

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