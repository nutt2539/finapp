// --- LocalStorage Cloud Sync Wrapper ---
window.showToast = function(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons({ root: toast });
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

window.updateAutosaveUI = function(status = 'saved', showToastPopup = false) {
    const indicators = document.querySelectorAll('.autosave-indicator');
    const now = new Date();
    const timeString = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0') + ':' +
                       now.getSeconds().toString().padStart(2, '0');
                       
    indicators.forEach(indicator => {
        if (status === 'saving') {
            indicator.innerHTML = `<i data-lucide="refresh-cw" class="spin" style="width: 14px; height: 14px;"></i> Saving...`;
        } else if (status === 'error') {
            indicator.innerHTML = `<i data-lucide="alert-triangle" style="width: 14px; height: 14px; color: var(--danger-color);"></i> Error Syncing`;
        } else {
            indicator.innerHTML = `<i data-lucide="cloud-lightning" style="width: 14px; height: 14px;"></i> Last saved: ${timeString}`;
        }
        lucide.createIcons({ root: indicator });
    });
    
    if (showToastPopup) {
        if (status === 'error') {
            window.showToast('Failed to save data to cloud.', 'error');
        } else if (status === 'saved') {
            const dateStr = now.toLocaleDateString('th-TH');
            window.showToast(`อัพเดทข้อมูลลง Cloud เรียบร้อยแล้ว (${timeString})`, 'success');
        } else if (status === 'saving') {
            window.showToast('กำลังบันทึกข้อมูล...', 'success');
        }
    }
};

const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
    try {
        originalSetItem.apply(this, arguments);
    } catch(err) {
        if (window.showToast) window.showToast('DEBUG: originalSetItem error ' + err.message, 'error');
    }
    
    if (key.startsWith('firebase:')) return;
    if (key === 'localCalendarEvents' || key === 'calendarStamps') return;
    
    if (window.isRestoringFromCloud) {
        if (window.showToast) window.showToast('DEBUG: ไม่ได้เซฟเพราะติดสถานะ กำลังโหลดจาก Cloud (อาจจะแคช)', 'error');
        return;
    }
    
    if (!window.syncDataToCloud) {
        if (window.showToast) window.showToast('DEBUG: ไม่ได้เซฟเพราะหาฟังก์ชัน syncDataToCloud ไม่เจอ', 'error');
        return;
    }

    const storedVal = localStorage.getItem(key);
    try {
        if (window.updateAutosaveUI) window.updateAutosaveUI('saving', true);
    } catch(e) {
        console.error(e);
    }
    
    try {
        window.syncDataToCloud(key, storedVal, true);
    } catch(e) {
        if (window.showToast) window.showToast('DEBUG: syncDataToCloud error ' + e.message, 'error');
    }
};

// Prevent page refresh if data is still saving
window.addEventListener('beforeunload', (e) => {
    if (window.isSavingToCloud) {
        e.preventDefault();
        e.returnValue = 'Data is still saving to the cloud. Are you sure you want to leave?';
        return e.returnValue;
    }
});

// Initialize Lucide icons
lucide.createIcons();

// --- Theme Management ---
const themeToggleBtn = document.getElementById('themeToggleBtn');
const htmlEl = document.documentElement;

let currentTheme = localStorage.getItem('finance_dashboard_theme') || 'dark';
htmlEl.setAttribute('data-theme', currentTheme);
updateThemeIcon();

themeToggleBtn.addEventListener('click', () => {
    htmlEl.classList.add('theme-transition');
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', currentTheme);
    localStorage.setItem('finance_dashboard_theme', currentTheme);
    updateThemeIcon();
    
    if(mainChartInstance || categoryChartInstance) {
        updateCharts();
    }
    
    setTimeout(() => {
        htmlEl.classList.remove('theme-transition');
    }, 400);
});

function updateThemeIcon() {
    if(currentTheme === 'dark') {
        themeToggleBtn.innerHTML = '<i data-lucide="sun"></i>';
    } else {
        themeToggleBtn.innerHTML = '<i data-lucide="moon"></i>';
    }
    lucide.createIcons();
}

// --- Avatar Management ---
const avatarContainer = document.getElementById('avatarContainer');
const avatarInput = document.getElementById('avatarInput');
const userAvatarImg = document.getElementById('userAvatarImg');

if (avatarContainer && avatarInput && userAvatarImg) {
    const savedAvatar = localStorage.getItem('userAvatar');
    if (savedAvatar) {
        userAvatarImg.src = savedAvatar;
    }

    avatarContainer.addEventListener('click', () => {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const dataUrl = event.target.result;
                userAvatarImg.src = dataUrl;
                localStorage.setItem('userAvatar', dataUrl);
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- Background Management ---
const bgInput = document.getElementById('bgInput');
const presetBtns = document.querySelectorAll('.bg-preset-btn');

function applyBackgroundState() {
    const savedBg = localStorage.getItem('userBackground');
    const savedTheme = localStorage.getItem('userTheme');
    
    // Clear all theme classes
    document.body.className = document.body.className.replace(/\bbg-theme-\S+/g, '').trim();
    document.body.style.backgroundImage = '';

    if (savedBg) {
        document.body.style.backgroundImage = `url(${savedBg})`;
    } else if (savedTheme) {
        document.body.classList.add(`bg-theme-${savedTheme}`);
    }
}

if (bgInput) {
    applyBackgroundState();

    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const themeId = e.currentTarget.getAttribute('data-theme-id');
            localStorage.removeItem('userBackground'); // Clear custom image
            if (themeId === 'none') {
                localStorage.removeItem('userTheme');
            } else {
                localStorage.setItem('userTheme', themeId);
            }
            applyBackgroundState();
            // Close modal if desired, or let user stay in modal
        });
    });

    bgInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const MAX_WIDTH = 1920;
                    let width = img.width;
                    let height = img.height;
                    
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    
                    try {
                        localStorage.setItem('userBackground', dataUrl);
                        localStorage.removeItem('userTheme'); // Clear preset theme
                        applyBackgroundState();
                    } catch (e) {
                        console.warn("Could not save background to localStorage", e);
                        alert("Image too large to save permanently, but it will be shown for this session.");
                        document.body.className = document.body.className.replace(/\bbg-theme-\S+/g, '').trim();
                        document.body.style.backgroundImage = `url(${dataUrl})`;
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

// --- Data Management (Local Storage) ---
const STORAGE_KEY = 'finance_dashboard_data_v3';
const FIXED_STORAGE_KEY = 'finance_dashboard_fixed_expenses';
const COMPLETED_FIXED_STORAGE_KEY = 'finance_dashboard_completed_fixed';
const FIXED_INCOME_STORAGE_KEY = 'finance_dashboard_fixed_incomes';
const COMPLETED_FIXED_INCOME_STORAGE_KEY = 'finance_dashboard_completed_fixed_incomes';
const INCOME_CAT_KEY = 'finance_dashboard_income_categories';
const EXPENSE_CAT_KEY = 'finance_dashboard_expense_categories';

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let fixedExpenses = JSON.parse(localStorage.getItem(FIXED_STORAGE_KEY)) || [];
let completedFixedExpenses = JSON.parse(localStorage.getItem(COMPLETED_FIXED_STORAGE_KEY)) || [];
let fixedIncomes = JSON.parse(localStorage.getItem(FIXED_INCOME_STORAGE_KEY)) || [];
let completedFixedIncomes = JSON.parse(localStorage.getItem(COMPLETED_FIXED_INCOME_STORAGE_KEY)) || [];

const defaultIncomeCategories = ['Salary', 'Freelance', 'Investment', 'Other'];
const defaultExpenseCategories = ['Installment', 'Subscription', 'Utilities', 'Transportation', 'Food & Dining', 'Shopping', 'Other'];

let incomeCategories = JSON.parse(localStorage.getItem(INCOME_CAT_KEY)) || [...defaultIncomeCategories];
let expenseCategories = JSON.parse(localStorage.getItem(EXPENSE_CAT_KEY)) || [...defaultExpenseCategories];

function saveTransactions() { localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions)); }
function saveFixedExpenses() { localStorage.setItem(FIXED_STORAGE_KEY, JSON.stringify(fixedExpenses)); }
function saveCompletedFixedExpenses() { localStorage.setItem(COMPLETED_FIXED_STORAGE_KEY, JSON.stringify(completedFixedExpenses)); }
function saveFixedIncomes() { localStorage.setItem(FIXED_INCOME_STORAGE_KEY, JSON.stringify(fixedIncomes)); }
function saveCompletedFixedIncomes() { localStorage.setItem(COMPLETED_FIXED_INCOME_STORAGE_KEY, JSON.stringify(completedFixedIncomes)); }

function saveCategories() {
    localStorage.setItem(INCOME_CAT_KEY, JSON.stringify(incomeCategories));
    localStorage.setItem(EXPENSE_CAT_KEY, JSON.stringify(expenseCategories));
}

const GOALS_STORAGE_KEY = 'finance_dashboard_goals';
let goals = JSON.parse(localStorage.getItem(GOALS_STORAGE_KEY)) || [];
let expectedIncomes = JSON.parse(localStorage.getItem('expectedIncomes')) || [];
function saveGoals() {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
}

function saveExpectedIncomes() {
    localStorage.setItem('expectedIncomes', JSON.stringify(expectedIncomes));
}

// --- App State ---
let activeTab = 'monthly';
let currentDate = new Date();
let selectedMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
let selectedYear = `${currentDate.getFullYear()}`;
let editingFixedExpenseId = null;
let editingFixedIncomeId = null;
let editingTransactionId = null;
let editingGoalId = null;
let activeCategoryTab = 'income'; // 'income' or 'expense'

// --- DOM Elements ---
const totalIncomeEl = document.getElementById('totalIncome');
const totalExpenseEl = document.getElementById('totalExpense');
const totalFixedExpenseEl = document.getElementById('totalFixedExpense');
const totalFixedIncomeEl = document.getElementById('totalFixedIncome');
const netBalanceEl = document.getElementById('netBalance');

const transactionListEl = document.getElementById('transactionList');
const activeFixedExpensesListEl = document.getElementById('activeFixedExpensesList');
const allFixedExpensesListEl = document.getElementById('allFixedExpensesList');
const activeFixedIncomesListEl = document.getElementById('activeFixedIncomesList');
const allFixedIncomesListEl = document.getElementById('allFixedIncomesList');
const periodLabels = document.querySelectorAll('.period-label');
const mainChartTitle = document.getElementById('mainChartTitle');

const tabBtns = document.querySelectorAll('.tab-btn');
const monthlySelectorContainer = document.getElementById('monthlySelectorContainer');
const yearlySelectorContainer = document.getElementById('yearlySelectorContainer');
const monthPicker = document.getElementById('monthPicker');
const yearPicker = document.getElementById('yearPicker');

const transactionModal = document.getElementById('transactionModal');
const addTransactionBtn = document.getElementById('addTransactionBtn');
const transactionForm = document.getElementById('transactionForm');
const radioTxIncome = document.getElementById('radioTxIncome');
const radioTxExpense = document.getElementById('radioTxExpense');
const txCategorySelect = document.getElementById('category');

const fixedExpenseModal = document.getElementById('fixedExpenseModal');
const manageFixedBtn = document.getElementById('manageFixedBtn');
const fixedExpenseForm = document.getElementById('fixedExpenseForm');
const feSubmitBtn = document.getElementById('feSubmitBtn');
const cancelFeEditBtn = document.getElementById('cancelFeEditBtn');
const feCategorySelect = document.getElementById('feCategory');

const fixedIncomeModal = document.getElementById('fixedIncomeModal');
const manageFixedIncomeBtn = document.getElementById('manageFixedIncomeBtn');
const fixedIncomeForm = document.getElementById('fixedIncomeForm');
const fiSubmitBtn = document.getElementById('fiSubmitBtn');
const cancelFiEditBtn = document.getElementById('cancelFiEditBtn');
const fiCategorySelect = document.getElementById('fiCategory');

// Category Management DOM
const categoryModal = document.getElementById('categoryModal');
const headerManageCategoriesBtn = document.getElementById('headerManageCategoriesBtn');
const tabIncomeCat = document.getElementById('tabIncomeCat');
const tabExpenseCat = document.getElementById('tabExpenseCat');
const categoryListBody = document.getElementById('categoryListBody');
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryNameInput = document.getElementById('newCategoryName');

const editCategoryModal = document.getElementById('editCategoryModal');
const editCategoryForm = document.getElementById('editCategoryForm');
const editCategoryOldName = document.getElementById('editCategoryOldName');
const editCategoryType = document.getElementById('editCategoryType');
const editCategoryNewName = document.getElementById('editCategoryNewName');

const goalModal = document.getElementById('goalModal');
const addGoalBtn = document.getElementById('addGoalBtn');
const goalForm = document.getElementById('goalForm');

const closeBtns = document.querySelectorAll('.close-modal');

let mainChartInstance = null;
let categoryChartInstance = null;
let trendChartInstance = null;
let dayOfWeekChartInstance = null;

// --- Category Logic ---
function renderCategoryDropdowns() {
    // 1. Transaction Form Dropdown (Depends on radio selection)
    txCategorySelect.innerHTML = '';
    const currentTxType = document.querySelector('input[name="type"]:checked').value;
    const txCats = currentTxType === 'income' ? incomeCategories : expenseCategories;
    txCats.forEach(cat => {
        txCategorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // 2. Fixed Income Dropdown
    fiCategorySelect.innerHTML = '';
    incomeCategories.forEach(cat => {
        fiCategorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });

    // 3. Fixed Expense Dropdown
    feCategorySelect.innerHTML = '';
    expenseCategories.forEach(cat => {
        feCategorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
    });
}

function renderCategoryManageList() {
    categoryListBody.innerHTML = '';
    const cats = activeCategoryTab === 'income' ? incomeCategories : expenseCategories;
    
    if(cats.length === 0) {
        categoryListBody.innerHTML = `<tr><td style="text-align:center; padding: 20px; color: var(--text-secondary);">No categories found.</td></tr>`;
        return;
    }

    cats.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div style="font-weight: 500;">${cat}</div></td>
            <td style="text-align: right; width: 100px;">
                <button class="icon-btn" onclick="openEditCategoryModal('${activeCategoryTab}', '${cat}')" title="Rename">
                    <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
                </button>
                <button class="icon-btn" onclick="deleteCategory('${activeCategoryTab}', '${cat}')" title="Delete">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px; color: var(--danger-color);"></i>
                </button>
            </td>
        `;
        categoryListBody.appendChild(tr);
    });
    lucide.createIcons();
}

window.openEditCategoryModal = (type, oldName) => {
    editCategoryOldName.value = oldName;
    editCategoryType.value = type;
    editCategoryNewName.value = oldName;
    editCategoryModal.classList.add('active');
};

editCategoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = editCategoryType.value;
    const oldName = editCategoryOldName.value;
    const newName = editCategoryNewName.value.trim();

    if(!newName || newName === oldName) {
        editCategoryModal.classList.remove('active');
        return;
    }

    // Check if new name already exists
    const list = type === 'income' ? incomeCategories : expenseCategories;
    if(list.includes(newName)) {
        alert('A category with this name already exists.');
        return;
    }

    // Update in Category List
    const index = list.indexOf(oldName);
    if(index > -1) {
        list[index] = newName;
        saveCategories();
    }

    // CASCADING UPDATE TO ALL PAST DATA
    updateCategoryInTransactions(type, oldName, newName);

    // Refresh UI
    editCategoryModal.classList.remove('active');
    renderCategoryManageList();
    renderCategoryDropdowns();
    updateDashboard(); // Re-render charts and lists if names changed
});

window.deleteCategory = (type, name) => {
    if(confirm(`Are you sure you want to delete "${name}"? Past transactions will keep this name as text, but it won't appear in dropdowns.`)) {
        if(type === 'income') {
            incomeCategories = incomeCategories.filter(c => c !== name);
        } else {
            expenseCategories = expenseCategories.filter(c => c !== name);
        }
        saveCategories();
        renderCategoryManageList();
        renderCategoryDropdowns();
    }
};

addCategoryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = newCategoryNameInput.value.trim();
    if(!newName) return;

    const list = activeCategoryTab === 'income' ? incomeCategories : expenseCategories;
    if(list.includes(newName)) {
        alert('Category already exists!');
        return;
    }

    list.push(newName);
    saveCategories();
    newCategoryNameInput.value = '';
    renderCategoryManageList();
    renderCategoryDropdowns();
});

function updateCategoryInTransactions(type, oldName, newName) {
    let modified = false;

    // Normal transactions
    transactions.forEach(t => {
        if(t.type === type && t.category === oldName) {
            t.category = newName;
            modified = true;
        }
    });

    // Fixed Items
    if(type === 'income') {
        fixedIncomes.forEach(fi => { if(fi.category === oldName) { fi.category = newName; modified = true; } });
        completedFixedIncomes.forEach(fi => { if(fi.category === oldName) { fi.category = newName; modified = true; } });
    } else {
        fixedExpenses.forEach(fe => { if(fe.category === oldName) { fe.category = newName; modified = true; } });
        completedFixedExpenses.forEach(fe => { if(fe.category === oldName) { fe.category = newName; modified = true; } });
    }

    if(modified) {
        saveTransactions();
        if(type === 'income') { saveFixedIncomes(); saveCompletedFixedIncomes(); }
        else { saveFixedExpenses(); saveCompletedFixedExpenses(); }
    }
}


// Listeners for Category Tabs
tabIncomeCat.addEventListener('click', () => {
    activeCategoryTab = 'income';
    tabIncomeCat.classList.add('active');
    tabExpenseCat.classList.remove('active');
    renderCategoryManageList();
});
tabExpenseCat.addEventListener('click', () => {
    activeCategoryTab = 'expense';
    tabExpenseCat.classList.add('active');
    tabIncomeCat.classList.remove('active');
    renderCategoryManageList();
});

// Update dropdown when Transaction Type changes
radioTxIncome.addEventListener('change', renderCategoryDropdowns);
radioTxExpense.addEventListener('change', renderCategoryDropdowns);


// --- Auto Cleanup (Settlement) ---
function autoCleanupFixedItems() {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let needsSaveExp = false;
    let needsSaveInc = false;
    
    // Clean Expenses
    for (let i = fixedExpenses.length - 1; i >= 0; i--) {
        const fe = fixedExpenses[i];
        if (fe.endDate) {
            const expireDate = new Date(fe.endDate);
            expireDate.setDate(expireDate.getDate() + 1);
            expireDate.setHours(0,0,0,0);
            
            if (today.getTime() >= expireDate.getTime()) {
                completedFixedExpenses.push(fe);
                fixedExpenses.splice(i, 1);
                needsSaveExp = true;
            }
        }
    }
    
    // Clean Incomes
    for (let i = fixedIncomes.length - 1; i >= 0; i--) {
        const fi = fixedIncomes[i];
        if (fi.endDate) {
            const expireDate = new Date(fi.endDate);
            expireDate.setDate(expireDate.getDate() + 1);
            expireDate.setHours(0,0,0,0);
            
            if (today.getTime() >= expireDate.getTime()) {
                completedFixedIncomes.push(fi);
                fixedIncomes.splice(i, 1);
                needsSaveInc = true;
            }
        }
    }
    
    if (needsSaveExp) {
        saveFixedExpenses();
        saveCompletedFixedExpenses();
    }
    if (needsSaveInc) {
        saveFixedIncomes();
        saveCompletedFixedIncomes();
    }
}

// --- Initialization & Setup ---
function initControls() {
    autoCleanupFixedItems();
    renderCategoryDropdowns();
    
    monthPicker.value = selectedMonth;

    const currentY = currentDate.getFullYear();
    for (let i = currentY - 5; i <= currentY + 5; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearPicker.appendChild(option);
    }
    yearPicker.value = selectedYear;
}

// --- Formatters ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB'
    }).format(amount);
};

const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
};

const formatMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// --- Data Logic ---
function isFixedItemActive(item, checkMonthStr) {
    if (!item.endDate) return true;
    const endMonthStr = item.endDate.substring(0, 7); // Extract YYYY-MM
    return checkMonthStr <= endMonthStr;
}

function getVirtualFixedTransactions() {
    let virtuals = [];
    const allFixedExp = [...fixedExpenses, ...completedFixedExpenses];
    const allFixedInc = [...fixedIncomes, ...completedFixedIncomes];
    
    if (activeTab === 'monthly') {
        allFixedExp.forEach(fe => {
            if (isFixedItemActive(fe, selectedMonth)) {
                virtuals.push({
                    id: `virtual_exp_${fe.id}_${selectedMonth}`,
                    type: 'expense', amount: fe.amount, category: fe.category,
                    date: `${selectedMonth}-01`, note: `${fe.name} (Fixed)`, isFixed: true
                });
            }
        });
        allFixedInc.forEach(fi => {
            if (isFixedItemActive(fi, selectedMonth)) {
                virtuals.push({
                    id: `virtual_inc_${fi.id}_${selectedMonth}`,
                    type: 'income', amount: fi.amount, category: fi.category,
                    date: `${selectedMonth}-01`, note: `${fi.name} (Fixed)`, isFixed: true
                });
            }
        });
    } else {
        for (let m = 1; m <= 12; m++) {
            const mStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
            allFixedExp.forEach(fe => {
                if (isFixedItemActive(fe, mStr)) {
                    virtuals.push({
                        id: `virtual_exp_${fe.id}_${mStr}`,
                        type: 'expense', amount: fe.amount, category: fe.category,
                        date: `${mStr}-01`, note: `${fe.name} (Fixed)`, isFixed: true
                    });
                }
            });
            allFixedInc.forEach(fi => {
                if (isFixedItemActive(fi, mStr)) {
                    virtuals.push({
                        id: `virtual_inc_${fi.id}_${mStr}`,
                        type: 'income', amount: fi.amount, category: fi.category,
                        date: `${mStr}-01`, note: `${fi.name} (Fixed)`, isFixed: true
                    });
                }
            });
        }
    }
    return virtuals;
}

function getFilteredTransactions() {
    const normal = transactions.filter(t => {
        const tDate = new Date(t.date);
        if (activeTab === 'monthly') {
            const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
            return tMonth === selectedMonth;
        } else {
            return tDate.getFullYear().toString() === selectedYear;
        }
    });
    // Find which months in 'normal' have AI extracted data
    const aiImportedMonths = new Set();
    normal.forEach(t => {
        if (t.note === 'AI Extracted Income' || t.note === 'AI Extracted Expense' || t.note === 'จากไฟล์ CSV (AI)') {
            const tDate = new Date(t.date);
            const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
            aiImportedMonths.add(tMonth);
        }
    });

    // Filter virtual fixed transactions: only include them if their month is NOT in aiImportedMonths
    const validVirtualFixed = getVirtualFixedTransactions().filter(v => {
        const vDate = new Date(v.date);
        const vMonth = `${vDate.getFullYear()}-${String(vDate.getMonth() + 1).padStart(2, '0')}`;
        return !aiImportedMonths.has(vMonth);
    });

    return [...normal, ...validVirtualFixed];
}


// --- Update UI ---
function updateSummary() {
    const filtered = getFilteredTransactions();
    const virtualFixed = getVirtualFixedTransactions();

    const income = filtered
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
    const expense = filtered
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const fixedExpTotal = virtualFixed.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const fixedIncTotal = virtualFixed.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        
    const balance = income - expense;

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpenseEl.textContent = formatCurrency(expense);
    totalFixedExpenseEl.textContent = formatCurrency(fixedExpTotal);
    totalFixedIncomeEl.textContent = formatCurrency(fixedIncTotal);
    netBalanceEl.textContent = formatCurrency(balance);

    const labelText = activeTab === 'monthly' ? formatMonthLabel(selectedMonth) : selectedYear;
    periodLabels.forEach(label => label.textContent = labelText);
    
    if (activeTab === 'monthly') {
        updateDailyInsight(balance, income, expense);
    }
}

let currentInsights = [];

function updateDailyInsight(netBalance, totalIncome, totalExpense) {
    const insightEl = document.getElementById('dailyInsightText');
    if (!insightEl) return;
    
    const now = new Date();
    const currentDay = now.getDate();
    
    currentInsights = [];
    
    if (netBalance < 0) {
        currentInsights.push(`⚠️ <b>ระวัง!</b> เดือนนี้ยอดใช้จ่ายเกินรายรับไปแล้ว (ติดลบ ${formatCurrency(Math.abs(netBalance))}) ลองตรวจสอบและคุมงบอีกนิดนะครับ`);
    }
    if (totalExpense > 0 && totalExpense < totalIncome * 0.5 && currentDay >= 15) {
        currentInsights.push(`🌟 <b>ยอดเยี่ยมมาก!</b> ผ่านมาครึ่งเดือนแล้ว คุณยังคุมค่าใช้จ่ายได้ต่ำกว่า 50% ของรายรับ เตรียมเก็บเงินก้อนใหญ่เข้าเป้าหมายได้เลยครับ`);
    }
    if (expectedIncomes.length > 0) {
        let totalExtra = expectedIncomes.reduce((sum, item) => sum + parseFloat(item.amount), 0);
        currentInsights.push(`🚀 <b>รอรับทรัพย์!</b> เดือนนี้คุณมีรายได้เสริมรออยู่ประมาณ ${formatCurrency(totalExtra)} สู้ๆ กับโปรเจกต์งานนะครับ`);
    }
    if (currentDay >= 25 && netBalance > 0) {
        currentInsights.push(`📅 <b>ใกล้สิ้นเดือนแล้ว!</b> คุณมียอดเงินคงเหลือ ${formatCurrency(netBalance)} สามารถโยกไปเข้าแผน DCA หรือ Sinking Funds ได้เลยนะ`);
    }
    
    currentInsights.push(`👋 <b>สวัสดีคุณนัท!</b> วันนี้เป็นวันดีในการจัดสรรเงิน Safe-to-Save เพื่อเป้าหมายของคุณครับ ✌️`);
    currentInsights.push(`💡 <b>เคล็ดลับ:</b> การจดบันทึกรายรับรายจ่ายทุกวัน ช่วยลดรายจ่ายที่ไม่จำเป็นได้ถึง 20% เลยนะ`);
    currentInsights.push(`🎯 <b>เป้าหมายมีไว้พุ่งชน!</b> อย่าลืมเช็ค To-Do List ของคุณและเคลียร์มันให้เสร็จนะครับ`);
    currentInsights.push(`📈 <b>พลังของเวลา:</b> เงิน ${formatCurrency(1000)} ที่ออมหรือลงทุนตั้งแต่วันนี้ จะเติบโตอย่างน่าทึ่งด้วยดอกเบี้ยทบต้น!`);
    
    displayRandomInsight();
}

function displayRandomInsight() {
    const insightEl = document.getElementById('dailyInsightText');
    if (!insightEl || currentInsights.length === 0) return;
    
    // Pick random and avoid repeating the exact same one if possible
    let newText = insightEl.innerHTML;
    let attempts = 0;
    while(newText === insightEl.innerHTML && attempts < 5 && currentInsights.length > 1) {
        const randomIndex = Math.floor(Math.random() * currentInsights.length);
        newText = currentInsights[randomIndex];
        attempts++;
    }
    insightEl.innerHTML = newText;
}

function renderTransactionList() {
    transactionListEl.innerHTML = '';
    let normalFiltered = getFilteredTransactions().filter(t => !t.isFixed);
    const sorted = [...normalFiltered].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sorted.length === 0) {
        transactionListEl.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">No one-off transactions this period.</td></tr>`;
        return;
    }

    sorted.forEach(t => {
        const tr = document.createElement('tr');
        const isIncome = t.type === 'income';
        const typeClass = isIncome ? 'income' : 'expense';
        const amountClass = isIncome ? 'amount-income' : 'amount-expense';
        const amountPrefix = isIncome ? '+' : '-';
        
        tr.innerHTML = `
            <td>
                <div class="type-indicator">
                    <div class="type-dot ${typeClass}"></div>
                    <div><div style="font-weight: 500;">${t.note || t.category}</div></div>
                </div>
            </td>
            <td style="color: var(--text-secondary);">${t.category}</td>
            <td style="color: var(--text-secondary);">${formatDate(t.date)}</td>
            <td class="${amountClass}">${amountPrefix}${formatCurrency(t.amount)}</td>
            <td>
                <button class="icon-btn" onclick="editTransaction('${t.id}')">
                    <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                </button>
                <button class="icon-btn" onclick="deleteTransaction('${t.id}')">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                </button>
            </td>
        `;
        transactionListEl.appendChild(tr);
    });
    lucide.createIcons();
}

function renderActiveFixedExpenses() {
    activeFixedExpensesListEl.innerHTML = '';
    let activeList = [];
    if (activeTab === 'monthly') {
        activeList = fixedExpenses.filter(fe => isFixedItemActive(fe, selectedMonth));
    } else {
        activeList = fixedExpenses.filter(fe => isFixedItemActive(fe, `${selectedYear}-01`));
    }
    if (activeList.length === 0) {
        activeFixedExpensesListEl.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-secondary);">No active fixed expenses.</td></tr>`;
        return;
    }
    activeList.forEach(fe => {
        const tr = document.createElement('tr');
        const endsText = fe.endDate ? formatDate(fe.endDate) : 'Ongoing';
        tr.innerHTML = `
            <td>
                <div style="font-weight: 500;">${fe.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${fe.category}</div>
            </td>
            <td class="amount-expense">-${formatCurrency(fe.amount)}/mo</td>
            <td style="color: var(--text-secondary); font-size: 13px;">${endsText}</td>
        `;
        activeFixedExpensesListEl.appendChild(tr);
    });
}

function renderActiveFixedIncomes() {
    activeFixedIncomesListEl.innerHTML = '';
    let activeList = [];
    if (activeTab === 'monthly') {
        activeList = fixedIncomes.filter(fi => isFixedItemActive(fi, selectedMonth));
    } else {
        activeList = fixedIncomes.filter(fi => isFixedItemActive(fi, `${selectedYear}-01`));
    }
    if (activeList.length === 0) {
        activeFixedIncomesListEl.innerHTML = `<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-secondary);">No active fixed incomes.</td></tr>`;
        return;
    }
    activeList.forEach(fi => {
        const tr = document.createElement('tr');
        const endsText = fi.endDate ? formatDate(fi.endDate) : 'Ongoing';
        tr.innerHTML = `
            <td>
                <div style="font-weight: 500;">${fi.name}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${fi.category}</div>
            </td>
            <td class="amount-income">+${formatCurrency(fi.amount)}/mo</td>
            <td style="color: var(--text-secondary); font-size: 13px;">${endsText}</td>
        `;
        activeFixedIncomesListEl.appendChild(tr);
    });
}

function renderAllFixedExpensesModal() {
    allFixedExpensesListEl.innerHTML = '';
    if (fixedExpenses.length === 0) {
        allFixedExpensesListEl.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">No fixed expenses added yet.</td></tr>`;
        return;
    }

    fixedExpenses.forEach(fe => {
        const tr = document.createElement('tr');
        const endsText = fe.endDate ? formatDate(fe.endDate) : 'Ongoing';
        tr.innerHTML = `
            <td><div style="font-weight: 500;">${fe.name}</div></td>
            <td style="color: var(--text-secondary);">${fe.category}</td>
            <td class="amount-expense">-${formatCurrency(fe.amount)}</td>
            <td style="color: var(--text-secondary);">${endsText}</td>
            <td style="display: flex; gap: 8px;">
                <button class="icon-btn" onclick="editFixedExpense('${fe.id}')" title="Edit">
                    <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
                </button>
                <button class="icon-btn" onclick="deleteFixedExpense('${fe.id}')" title="Delete">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px; color: var(--danger-color);"></i>
                </button>
            </td>
        `;
        allFixedExpensesListEl.appendChild(tr);
    });
    lucide.createIcons();
}

function renderAllFixedIncomesModal() {
    allFixedIncomesListEl.innerHTML = '';
    if (fixedIncomes.length === 0) {
        allFixedIncomesListEl.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: var(--text-secondary);">No fixed incomes added yet.</td></tr>`;
        return;
    }

    fixedIncomes.forEach(fi => {
        const tr = document.createElement('tr');
        const endsText = fi.endDate ? formatDate(fi.endDate) : 'Ongoing';
        tr.innerHTML = `
            <td><div style="font-weight: 500;">${fi.name}</div></td>
            <td style="color: var(--text-secondary);">${fi.category}</td>
            <td class="amount-income">+${formatCurrency(fi.amount)}</td>
            <td style="color: var(--text-secondary);">${endsText}</td>
            <td style="display: flex; gap: 8px;">
                <button class="icon-btn" onclick="editFixedIncome('${fi.id}')" title="Edit">
                    <i data-lucide="pencil" style="width: 16px; height: 16px;"></i>
                </button>
                <button class="icon-btn" onclick="deleteFixedIncome('${fi.id}')" title="Delete">
                    <i data-lucide="trash-2" style="width: 16px; height: 16px; color: var(--danger-color);"></i>
                </button>
            </td>
        `;
        allFixedIncomesListEl.appendChild(tr);
    });
    lucide.createIcons();
}


window.deleteTransaction = (id) => {
    if(confirm('Are you sure you want to delete this transaction?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        updateDashboard();
    }
}

// Fixed Expense Actions
window.deleteFixedExpense = (id) => {
    if(confirm('Are you sure you want to remove this fixed expense? It will be removed from all future and past calculations.')) {
        fixedExpenses = fixedExpenses.filter(fe => fe.id !== id);
        saveFixedExpenses();
        renderAllFixedExpensesModal();
        updateDashboard();
    }
}
window.editFixedExpense = (id) => {
    const fe = fixedExpenses.find(f => f.id === id);
    if (!fe) return;
    editingFixedExpenseId = fe.id;
    document.getElementById('feName').value = fe.name;
    document.getElementById('feAmount').value = fe.amount;
    document.getElementById('feCategory').value = fe.category;
    document.getElementById('feEndDate').value = fe.endDate || '';
    
    feSubmitBtn.innerHTML = '<i data-lucide="save"></i> Update Fixed Expense';
    cancelFeEditBtn.style.display = 'block';
    lucide.createIcons();
    fixedExpenseForm.scrollIntoView({ behavior: 'smooth' });
}
cancelFeEditBtn.addEventListener('click', () => { resetFixedExpenseForm(); });
function resetFixedExpenseForm() {
    editingFixedExpenseId = null;
    fixedExpenseForm.reset();
    feSubmitBtn.innerHTML = '<i data-lucide="plus"></i> Add Fixed Expense';
    cancelFeEditBtn.style.display = 'none';
    lucide.createIcons();
}

// Fixed Income Actions
window.deleteFixedIncome = (id) => {
    if(confirm('Are you sure you want to remove this fixed income? It will be removed from all future and past calculations.')) {
        fixedIncomes = fixedIncomes.filter(fi => fi.id !== id);
        saveFixedIncomes();
        renderAllFixedIncomesModal();
        updateDashboard();
    }
}
window.editFixedIncome = (id) => {
    const fi = fixedIncomes.find(f => f.id === id);
    if (!fi) return;
    editingFixedIncomeId = fi.id;
    document.getElementById('fiName').value = fi.name;
    document.getElementById('fiAmount').value = fi.amount;
    document.getElementById('fiCategory').value = fi.category;
    document.getElementById('fiEndDate').value = fi.endDate || '';
    
    fiSubmitBtn.innerHTML = '<i data-lucide="save"></i> Update Fixed Income';
    cancelFiEditBtn.style.display = 'block';
    lucide.createIcons();
    fixedIncomeForm.scrollIntoView({ behavior: 'smooth' });
}
cancelFiEditBtn.addEventListener('click', () => { resetFixedIncomeForm(); });
function resetFixedIncomeForm() {
    editingFixedIncomeId = null;
    fixedIncomeForm.reset();
    fiSubmitBtn.innerHTML = '<i data-lucide="plus"></i> Add Fixed Income';
    cancelFiEditBtn.style.display = 'none';
    lucide.createIcons();
}


// --- Charts ---
function updateCharts() {
    updateMainChart();
    updateCategoryChart();
}

function updateMainChart() {
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (mainChartInstance) mainChartInstance.destroy();

    const filtered = getFilteredTransactions();
    let labels = [];
    let incomeData = [];
    let expenseData = [];
    
    if (activeTab === 'monthly') {
        mainChartTitle.textContent = 'Weekly Overview';
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
        incomeData = [0, 0, 0, 0, 0];
        expenseData = [0, 0, 0, 0, 0];
        
        filtered.forEach(t => {
            const date = new Date(t.date);
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
            const offset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0, Tue=1, ..., Sun=6
            const week = Math.floor((date.getDate() - 1 + offset) / 7);
            const wIndex = week > 4 ? 4 : week;
            
            if (t.type === 'income') {
                incomeData[wIndex] += parseFloat(t.amount);
            } else {
                expenseData[wIndex] += parseFloat(t.amount);
            }
        });
    } else {
        mainChartTitle.textContent = 'Monthly Overview';
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        incomeData = new Array(12).fill(0);
        expenseData = new Array(12).fill(0);
        
        filtered.forEach(t => {
            const month = new Date(t.date).getMonth();
            if (t.type === 'income') {
                incomeData[month] += parseFloat(t.amount);
            } else {
                expenseData[month] += parseFloat(t.amount);
            }
        });
    }

    const trendData = [...expenseData];

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Outfit', sans-serif";

    mainChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Expense Trend',
                    data: trendData,
                    type: 'line',
                    borderColor: '#94a3b8',
                    backgroundColor: '#94a3b8',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    order: 1
                },
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 4,
                    order: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: textColor } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(128, 128, 128, 0.1)' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChartInstance) categoryChartInstance.destroy();

    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'expense');
    const categoryTotals = {};
    
    expenses.forEach(t => {
        if (categoryTotals[t.category]) {
            categoryTotals[t.category] += parseFloat(t.amount);
        } else {
            categoryTotals[t.category] = parseFloat(t.amount);
        }
    });
    
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#94a3b8';

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        color: textColor,
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
}



// --- Event Listeners ---

tabBtns.forEach(btn => {
    // Only target main dashboard tabs, not category tabs
    if(btn.id !== 'tabIncomeCat' && btn.id !== 'tabExpenseCat') {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.dashboard-controls .tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            activeTab = e.target.dataset.tab;
            
            if (activeTab === 'monthly') {
                monthlySelectorContainer.style.display = 'block';
                yearlySelectorContainer.style.display = 'none';
            } else {
                monthlySelectorContainer.style.display = 'none';
                yearlySelectorContainer.style.display = 'block';
            }
            updateDashboard();
        });
    }
});

monthPicker.addEventListener('change', (e) => {
    selectedMonth = e.target.value;
    updateDashboard();
});

yearPicker.addEventListener('change', (e) => {
    selectedYear = e.target.value;
    updateDashboard();
});

addTransactionBtn.addEventListener('click', () => {
    document.getElementById('date').valueAsDate = new Date();
    transactionModal.classList.add('active');
});

manageFixedBtn.addEventListener('click', () => {
    renderAllFixedExpensesModal();
    fixedExpenseModal.classList.add('active');
});

manageFixedIncomeBtn.addEventListener('click', () => {
    renderAllFixedIncomesModal();
    fixedIncomeModal.classList.add('active');
});

headerManageCategoriesBtn.addEventListener('click', () => {
    renderCategoryManageList();
    categoryModal.classList.add('active');
});


document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const overlay = e.target.closest('.modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        
        // Reset states
        editingFixedExpenseId = null;
        editingFixedIncomeId = null;
        editingTransactionId = null;
        editingGoalId = null;
        
        const txHeader = document.querySelector('#transactionModal .modal-header h2');
        if (txHeader) txHeader.textContent = 'Add Transaction';
        
        const goalHeader = document.querySelector('#goalModal .modal-header h2');
        if (goalHeader) goalHeader.textContent = 'Add Future Goal';
        
        if (typeof transactionForm !== 'undefined' && transactionForm) transactionForm.reset();
        if (typeof fixedExpenseForm !== 'undefined' && fixedExpenseForm) fixedExpenseForm.reset();
        if (typeof fixedIncomeForm !== 'undefined' && fixedIncomeForm) fixedIncomeForm.reset();
        if (typeof goalForm !== 'undefined' && goalForm) goalForm.reset();
        if (typeof expectedIncomeForm !== 'undefined' && expectedIncomeForm) expectedIncomeForm.reset();
    });
});

transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const note = document.getElementById('note').value;
    
    if (editingTransactionId) {
        const txIndex = transactions.findIndex(t => t.id === editingTransactionId);
        if (txIndex > -1) {
            transactions[txIndex] = {
                ...transactions[txIndex],
                type, amount: parseFloat(amount), category, date, note
            };
        }
        editingTransactionId = null;
    } else {
        transactions.push({
            id: Date.now().toString(),
            type, amount: parseFloat(amount), category, date, note
        });
    }
    
    saveTransactions();
    transactionModal.classList.remove('active');
    document.querySelector('#transactionModal .modal-header h2').textContent = 'Add Transaction';
    transactionForm.reset();
    updateDashboard();
});

fixedExpenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('feName').value;
    const amount = document.getElementById('feAmount').value;
    const category = document.getElementById('feCategory').value;
    const endDate = document.getElementById('feEndDate').value;
    
    if (editingFixedExpenseId) {
        const feIndex = fixedExpenses.findIndex(f => f.id === editingFixedExpenseId);
        if (feIndex > -1) {
            fixedExpenses[feIndex] = {
                ...fixedExpenses[feIndex],
                name, amount: parseFloat(amount), category, endDate
            };
        }
    } else {
        fixedExpenses.push({
            id: Date.now().toString(),
            name, amount: parseFloat(amount), category, endDate
        });
    }
    
    saveFixedExpenses();
    resetFixedExpenseForm();
    autoCleanupFixedItems();
    renderAllFixedExpensesModal(); 
    updateDashboard(); 
});

fixedIncomeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('fiName').value;
    const amount = document.getElementById('fiAmount').value;
    const category = document.getElementById('fiCategory').value;
    const endDate = document.getElementById('fiEndDate').value;
    
    if (editingFixedIncomeId) {
        const fiIndex = fixedIncomes.findIndex(f => f.id === editingFixedIncomeId);
        if (fiIndex > -1) {
            fixedIncomes[fiIndex] = {
                ...fixedIncomes[fiIndex],
                name, amount: parseFloat(amount), category, endDate
            };
        }
    } else {
        fixedIncomes.push({
            id: Date.now().toString(),
            name, amount: parseFloat(amount), category, endDate
        });
    }
    
    saveFixedIncomes();
    resetFixedIncomeForm();
    autoCleanupFixedItems();
    renderAllFixedIncomesModal(); 
    updateDashboard(); 
});

// --- Bootstrap ---
function updateDashboard() {
    updateSummary();
    renderTransactionList();
    renderActiveFixedExpenses();
    renderActiveFixedIncomes();
    updateCharts();
}

// Edit Transaction
window.editTransaction = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    
    editingTransactionId = id;
    document.querySelector('#transactionModal .modal-header h2').textContent = 'Edit Transaction';
    
    document.getElementById(tx.type === 'income' ? 'radioTxIncome' : 'radioTxExpense').checked = true;
    document.getElementById('amount').value = tx.amount;
    
    // We need to re-render category dropdowns just in case, but make sure the correct one is populated
    renderCategoryDropdowns();
    document.getElementById('category').value = tx.category;
    
    document.getElementById('date').value = tx.date;
    document.getElementById('note').value = tx.note || '';
    
    transactionModal.classList.add('active');
};

// Start the app
initControls();
updateDashboard();
renderCategoryDropdowns();

// --- Navigation & Planning Logic ---
const navItems = document.querySelectorAll('.nav-item[data-view]');
const viewSections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        viewSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetView) {
                section.classList.add('active');
            }
        });
        
        if (targetView === 'view-planning') {
            updatePlanningView();
        } else if (targetView === 'view-investment') {
            updateInvestmentView();
        } else if (targetView === 'view-schedule') {
            setTimeout(() => {
                if(typeof renderCalendar === 'function') renderCalendar();
            }, 50);
        }
    });
});

function calculateProjectedNetForMonth(targetDate) {
    const totalFixedIncome = fixedIncomes.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalFixedExpense = fixedExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    let totalExtraIncomes = 0;
    expectedIncomes.forEach(inc => {
        totalExtraIncomes += parseFloat(inc.amount) || 0;
    });
    const projectedIncome = totalFixedIncome + totalExtraIncomes;
    
    let totalRequiredPerMonth = 0;
    const now = new Date(); // use current date as baseline for monthsLeft
    goals.forEach(goal => {
        if (goal.type === 'installment') {
            const principal = goal.amount;
            const duration = goal.duration;
            const monthlyInterestPercent = goal.interest;
            const monthlyInterest = principal * (monthlyInterestPercent / 100);
            const totalDebt = principal + (monthlyInterest * duration);
            totalRequiredPerMonth += (totalDebt / duration);
        } else {
            const goalDate = new Date(goal.date + '-01');
            // Calculate months left from the targetDate of the projection
            let monthsLeft = (goalDate.getFullYear() - targetDate.getFullYear()) * 12 + (goalDate.getMonth() - targetDate.getMonth());
            if (monthsLeft < 0) monthsLeft = 0;
            const validMonths = monthsLeft > 0 ? monthsLeft : 1;
            totalRequiredPerMonth += (goal.amount / validMonths);
        }
    });
    
    const projectedExpense = totalFixedExpense + totalRequiredPerMonth;
    return projectedIncome - projectedExpense;
}

function getRealNetBalanceForMonthStr(monthStr) {
    const normal = transactions.filter(t => {
        if (!t.date) return false;
        const parts = t.date.split('-');
        if (parts.length >= 2) {
            const tMonth = `${parts[0]}-${parts[1]}`;
            return tMonth === monthStr;
        }
        return false;
    });
    
    let virtuals = [];
    const allFixedExp = [...fixedExpenses, ...completedFixedExpenses];
    const allFixedInc = [...fixedIncomes, ...completedFixedIncomes];
    
    allFixedExp.forEach(fe => {
        if (isFixedItemActive(fe, monthStr)) {
            virtuals.push({ type: 'expense', amount: fe.amount });
        }
    });
    allFixedInc.forEach(fi => {
        if (isFixedItemActive(fi, monthStr)) {
            virtuals.push({ type: 'income', amount: fi.amount });
        }
    });
    
    const combined = [...normal, ...virtuals];
    const income = combined.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const expense = combined.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    return income - expense;
}

function updatePlanningView() {
    // Basic Financial Health Calculation
    const totalFixedIncome = fixedIncomes.reduce((sum, f) => sum + parseFloat(f.amount), 0);
    const totalFixedExpense = fixedExpenses.reduce((sum, f) => sum + parseFloat(f.amount), 0);
    const safeToSave = totalFixedIncome - totalFixedExpense;
    
    document.getElementById('planAvgIncome').textContent = formatCurrency(totalFixedIncome);
    document.getElementById('planAvgExpense').textContent = formatCurrency(totalFixedExpense);
    
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthNet = getRealNetBalanceForMonthStr(currentMonthStr);
    
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthNet = calculateProjectedNetForMonth(nextMonthDate);
    
    document.getElementById('planCashFlowCurrent').textContent = formatCurrency(currentMonthNet);
    document.getElementById('planCashFlowNext').textContent = formatCurrency(nextMonthNet);
    
    const diff = nextMonthNet - currentMonthNet;
    const diffEl = document.getElementById('planCashFlowDiff');
    if (diff > 0) {
        diffEl.innerHTML = `<span style="color:var(--success); font-weight: 500;">+${formatCurrency(diff)}</span> vs This Month`;
    } else if (diff < 0) {
        diffEl.innerHTML = `<span style="color:var(--danger); font-weight: 500;">${formatCurrency(diff)}</span> vs This Month`;
    } else {
        diffEl.innerHTML = `<span style="color:rgba(255,255,255,0.7);">No Change</span> vs This Month`;
    }
    
    
    renderExpectedIncomesList();
    renderGoalsList(safeToSave);
    renderFinancialAnalysis(safeToSave);
}

function renderFinancialAnalysis(safeToSave) {
    const totalFixedIncome = fixedIncomes.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalFixedExpense = fixedExpenses.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    const now = new Date();
    // Use next month (month + 1). If month is 11 (Dec), it rolls over to next year January automatically in JS.
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    // 1. Calculate Expected Extra Incomes
    // User wants ALL Expected Extra Incomes included directly.
    let totalExtraIncomes = 0;
    expectedIncomes.forEach(inc => {
        totalExtraIncomes += parseFloat(inc.amount) || 0;
    });
    
    const projectedIncome = totalFixedIncome + totalExtraIncomes;
    
    // 2. Calculate Total Expenses for NEXT month
    let totalRequiredPerMonth = 0;
    goals.forEach(goal => {
        if (goal.type === 'installment') {
            const principal = goal.amount;
            const duration = goal.duration;
            const monthlyInterestPercent = goal.interest;
            const monthlyInterest = principal * (monthlyInterestPercent / 100);
            const totalDebt = principal + (monthlyInterest * duration);
            totalRequiredPerMonth += (totalDebt / duration);
        } else {
            const targetDate = new Date(goal.date + '-01');
            let monthsLeft = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
            if (monthsLeft < 0) monthsLeft = 0;
            const validMonths = monthsLeft > 0 ? monthsLeft : 1;
            totalRequiredPerMonth += (goal.amount / validMonths);
        }
    });
    
    const projectedExpense = totalFixedExpense + totalRequiredPerMonth;
    
    // 3. Net Cash Flow
    const netCashFlow = projectedIncome - projectedExpense;
    
    // 4. Update UI Elements
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const nextMonthName = `${monthNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;
    
    const incLabel = document.getElementById('analysisNextMonthIncomeLabel');
    const expLabel = document.getElementById('analysisNextMonthExpenseLabel');
    if (incLabel) incLabel.textContent = `Projected Income (${nextMonthName})`;
    if (expLabel) expLabel.textContent = `Projected Expenses (${nextMonthName})`;
    
    const incEl = document.getElementById('analysisNextMonthIncome');
    if (incEl) incEl.textContent = formatCurrency(projectedIncome);
    
    const expEl = document.getElementById('analysisNextMonthExpense');
    if (expEl) expEl.textContent = formatCurrency(projectedExpense);
    
    const netFlowEl = document.getElementById('analysisNextMonthNet');
    if (netFlowEl) {
        netFlowEl.textContent = (netCashFlow >= 0 ? '+' : '') + formatCurrency(netCashFlow);
        netFlowEl.style.color = netCashFlow >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    
    const statusEl = document.getElementById('analysisStatus');
    const recEl = document.getElementById('analysisRecommendation');
    const iconEl = document.getElementById('analysisIcon');
    
    if (netCashFlow > 0) {
        statusEl.textContent = "Looking Good!";
        statusEl.style.color = "var(--success)";
        iconEl.innerHTML = '<i data-lucide="thumbs-up"></i>';
        iconEl.style.color = "var(--success)";
        iconEl.style.background = "rgba(34, 197, 94, 0.1)";
        recEl.innerHTML = `Great news! In ${nextMonthName}, you are projected to have a surplus of <strong>${formatCurrency(netCashFlow)}</strong>. Consider putting this extra money towards your long-term savings or treating yourself to something nice!`;
    } else if (netCashFlow < 0) {
        statusEl.textContent = "Action Required";
        statusEl.style.color = "var(--danger)";
        iconEl.innerHTML = '<i data-lucide="alert-triangle"></i>';
        iconEl.style.color = "var(--danger)";
        iconEl.style.background = "rgba(239, 68, 68, 0.1)";
        recEl.innerHTML = `Watch out! In ${nextMonthName}, you are projected to fall short by <strong>${formatCurrency(Math.abs(netCashFlow))}</strong>. You may need to reduce your planned expenses, find extra income, or adjust your goal timelines.`;
    } else {
        statusEl.textContent = "Breaking Even";
        statusEl.style.color = "var(--warning)";
        iconEl.innerHTML = '<i data-lucide="scale"></i>';
        iconEl.style.color = "var(--warning)";
        iconEl.style.background = "rgba(245, 158, 11, 0.1)";
        recEl.innerHTML = `You are projected to break even exactly in ${nextMonthName}. Every baht is accounted for, but there's no room for unexpected expenses. Consider building an emergency fund if you haven't already.`;
    }
    
    lucide.createIcons();
}

function renderExpectedIncomesList() {
    const list = document.getElementById('expectedIncomeList');
    list.innerHTML = '';
    
    if (expectedIncomes.length === 0) {
        list.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-secondary);">No expected extra incomes added yet.</td></tr>`;
        return;
    }
    
    expectedIncomes.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(income => {
        list.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;">
                <td style="font-weight:500; text-align: left;">${income.name}</td>
                <td style="color:var(--text-secondary); text-align: center;">${income.date}</td>
                <td style="color:var(--success); font-weight: 600; text-align: right;">+${formatCurrency(income.amount)}</td>
                <td style="text-align: center;">
                    <div style="display:flex; gap: 8px; justify-content: center;">
                        <button class="icon-btn" onclick="editExpectedIncome('${income.id}')" title="Edit">
                            <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="icon-btn" onclick="deleteExpectedIncome('${income.id}')" title="Delete">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

function renderGoalsList(safeToSave) {
    const list = document.getElementById('goalList');
    list.innerHTML = '';
    
    if (goals.length === 0) {
        list.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--text-secondary);">No goals set yet. Click 'Add Goal' to start planning.</td></tr>`;
        return;
    }
    
    goals.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(goal => {
        let requiredPerMonth = 0;
        let infoHtml = '';
        let totalInterestStr = '-';
        
        const targetDate = new Date(goal.date + '-01'); // e.g. "2026-12-01"
        const now = new Date();
        let monthsLeft = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
        if (monthsLeft < 0) monthsLeft = 0;
        
        if (goal.type === 'installment') {
            // Flat rate credit card installment
            const principal = goal.amount;
            const duration = goal.duration;
            const monthlyInterestPercent = goal.interest;
            
            const monthlyInterest = principal * (monthlyInterestPercent / 100);
            const totalInterest = monthlyInterest * duration;
            const totalDebt = principal + totalInterest;
            requiredPerMonth = totalDebt / duration;
            totalInterestStr = formatCurrency(totalInterest);
            
            infoHtml = `
                <td style="color:var(--text-secondary); text-align: center;">${goal.date}</td>
                <td style="text-align: center;">${duration} months <br><small style="color:var(--text-secondary);">${monthlyInterestPercent}% int.</small></td>
                <td style="font-weight:600; text-align: right;">${formatCurrency(totalDebt)} <br><small style="color:var(--text-secondary);">(${formatCurrency(principal)} + Int.)</small></td>
                <td style="color:var(--danger); text-align: right;">${totalInterestStr}</td>
            `;
        } else {
            // Saving goal
            const validMonths = monthsLeft > 0 ? monthsLeft : 1;
            requiredPerMonth = goal.amount / validMonths;
            
            infoHtml = `
                <td style="color:var(--text-secondary); text-align: center;">${goal.date}</td>
                <td style="text-align: center;">${monthsLeft > 0 ? monthsLeft + ' months' : '<span style="color:var(--danger)">Due Now</span>'}</td>
                <td style="font-weight:600; text-align: right;">${formatCurrency(goal.amount)}</td>
                <td style="color:var(--text-secondary); text-align: right;">${totalInterestStr}</td>
            `;
        }

        // --- Feasibility Calculation with Expected Incomes ---
        const targetDateForGoal = new Date(goal.date + '-01');
        const nowForCalc = new Date();
        
        let sumExtraIncomes = 0;
        expectedIncomes.forEach(inc => {
            const incDate = new Date(inc.date + '-01');
            // If expected income is between now and the goal target date (inclusive)
            if (incDate >= new Date(nowForCalc.getFullYear(), nowForCalc.getMonth(), 1) && incDate <= targetDateForGoal) {
                sumExtraIncomes += parseFloat(inc.amount);
            }
        });

        // Add monthly boost if applicable
        const validMonthsForBoost = monthsLeft > 0 ? monthsLeft : 1;
        const monthlyBoost = sumExtraIncomes / validMonthsForBoost;
        const adjustedSafeToSave = safeToSave + monthlyBoost;

        const isFeasible = requiredPerMonth <= adjustedSafeToSave;
        
        let feasibilityHtml = '';
        if (isFeasible) {
            feasibilityHtml = `<span style="color:var(--success); font-weight: 500;"><i data-lucide="check-circle-2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>Feasible</span>`;
            if (monthlyBoost > 0 && requiredPerMonth > safeToSave) {
                // Feasible only because of extra income
                feasibilityHtml += `<br><span style="font-size: 11px; color: var(--success);">(w/ Extra Income)</span>`;
            }
        } else {
            const deficit = requiredPerMonth - adjustedSafeToSave;
            feasibilityHtml = `<span style="color:var(--danger); font-weight: 500;"><i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-right:4px;"></i>Needs +${formatCurrency(deficit)}/mo</span>`;
        }
            
        list.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;">
                <td style="font-weight:500; text-align: left;">
                    ${goal.name} 
                    ${goal.type === 'installment' ? '<br><span style="font-size:12px; padding:2px 6px; background: rgba(59, 130, 246, 0.2); color: var(--accent-primary); border-radius:4px; display:inline-block; margin-top:4px;">Installment</span>' : ''}
                </td>
                ${infoHtml}
                <td style="color:var(--accent-primary); font-weight: 500; text-align: right;">${formatCurrency(requiredPerMonth)} / mo</td>
                <td style="text-align: center;">${feasibilityHtml}</td>
                <td style="text-align: center;">
                    <div style="display:flex; gap: 8px; justify-content: center;">
                        <button class="icon-btn" onclick="editGoal('${goal.id}')" title="Edit">
                            <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="icon-btn" onclick="deleteGoal('${goal.id}')" title="Delete">
                            <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

// Goal Event Listeners
const radioTypeSaving = document.getElementById('radioTypeSaving');
const radioTypeInstallment = document.getElementById('radioTypeInstallment');
const installmentFields = document.getElementById('installmentFields');
const goalDateLabel = document.getElementById('goalDateLabel');

function toggleInstallmentFields() {
    if (radioTypeInstallment.checked) {
        installmentFields.style.display = 'block';
        goalDateLabel.textContent = 'Start Date (Month/Year)';
        document.getElementById('goalDuration').required = true;
        document.getElementById('goalInterest').required = true;
    } else {
        installmentFields.style.display = 'none';
        goalDateLabel.textContent = 'Target Date (Month/Year)';
        document.getElementById('goalDuration').required = false;
        document.getElementById('goalInterest').required = false;
    }
}

radioTypeSaving.addEventListener('change', toggleInstallmentFields);
radioTypeInstallment.addEventListener('change', toggleInstallmentFields);

addGoalBtn.addEventListener('click', () => {
    editingGoalId = null;
    document.querySelector('#goalModal .modal-header h2').textContent = 'Add Future Goal';
    goalForm.reset();
    goalModal.classList.add('active');
    toggleInstallmentFields();
});

goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const goalType = document.querySelector('input[name="goalType"]:checked').value;
    const goalData = {
        id: editingGoalId ? editingGoalId : Date.now().toString(),
        name: document.getElementById('goalName').value,
        amount: parseFloat(document.getElementById('goalAmount').value),
        date: document.getElementById('goalDate').value,
        type: goalType
    };
    
    if (goalType === 'installment') {
        goalData.duration = parseInt(document.getElementById('goalDuration').value);
        goalData.interest = parseFloat(document.getElementById('goalInterest').value);
    }
    
    if (editingGoalId) {
        const index = goals.findIndex(g => g.id === editingGoalId);
        if (index !== -1) {
            goals[index] = goalData;
        }
        editingGoalId = null;
    } else {
        goals.push(goalData);
    }
    
    saveGoals();
    goalModal.classList.remove('active');
    goalForm.reset();
    updatePlanningView();
});

window.editGoal = (id) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    editingGoalId = id;
    document.querySelector('#goalModal .modal-header h2').textContent = 'Edit Future Goal';

    if (goal.type === 'installment') {
        document.getElementById('radioTypeInstallment').checked = true;
        document.getElementById('goalDuration').value = goal.duration;
        document.getElementById('goalInterest').value = goal.interest;
    } else {
        document.getElementById('radioTypeSaving').checked = true;
    }
    
    toggleInstallmentFields();

    document.getElementById('goalName').value = goal.name;
    document.getElementById('goalAmount').value = goal.amount;
    document.getElementById('goalDate').value = goal.date;

    goalModal.classList.add('active');
};

window.deleteGoal = (id) => {
    if(confirm('Are you sure you want to delete this goal?')) {
        goals = goals.filter(g => g.id !== id);
        saveGoals();
        updatePlanningView();
    }
};

// Expected Income Logic
const addExpectedIncomeBtn = document.getElementById('addExpectedIncomeBtn');
const expectedIncomeModal = document.getElementById('expectedIncomeModal');
const expectedIncomeForm = document.getElementById('expectedIncomeForm');
let editingExpectedIncomeId = null;

addExpectedIncomeBtn.addEventListener('click', () => {
    editingExpectedIncomeId = null;
    document.getElementById('expectedIncomeModalTitle').textContent = 'Add Expected Income';
    expectedIncomeForm.reset();
    expectedIncomeModal.classList.add('active');
});

expectedIncomeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const incData = {
        id: editingExpectedIncomeId ? editingExpectedIncomeId : Date.now().toString(),
        name: document.getElementById('expectedIncomeName').value,
        amount: parseFloat(document.getElementById('expectedIncomeAmount').value),
        date: document.getElementById('expectedIncomeDate').value
    };
    
    if (editingExpectedIncomeId) {
        const index = expectedIncomes.findIndex(i => i.id === editingExpectedIncomeId);
        if (index !== -1) expectedIncomes[index] = incData;
        editingExpectedIncomeId = null;
    } else {
        expectedIncomes.push(incData);
    }
    
    saveExpectedIncomes();
    expectedIncomeModal.classList.remove('active');
    expectedIncomeForm.reset();
    updatePlanningView();
});

window.editExpectedIncome = (id) => {
    const inc = expectedIncomes.find(i => i.id === id);
    if (!inc) return;

    editingExpectedIncomeId = id;
    document.getElementById('expectedIncomeModalTitle').textContent = 'Edit Expected Income';
    document.getElementById('expectedIncomeName').value = inc.name;
    document.getElementById('expectedIncomeAmount').value = inc.amount;
    document.getElementById('expectedIncomeDate').value = inc.date;

    expectedIncomeModal.classList.add('active');
};

window.deleteExpectedIncome = (id) => {
    if(confirm('Are you sure you want to delete this expected income?')) {
        expectedIncomes = expectedIncomes.filter(i => i.id !== id);
        saveExpectedIncomes();
        updatePlanningView();
    }
};


// --- Calendar Logic ---
let calendar = null;
let calendarUrls = JSON.parse(localStorage.getItem('calendarUrls')) || { google: '', apple: '' };

const manageCalendarLinksBtn = document.getElementById('manageCalendarLinksBtn');
const calendarLinksModal = document.getElementById('calendarLinksModal');
const calendarLinksForm = document.getElementById('calendarLinksForm');
const googleCalendarUrlInput = document.getElementById('googleCalendarUrl');
const appleCalendarUrlInput = document.getElementById('appleCalendarUrl');
const calendarEl = document.getElementById('calendar');

if(manageCalendarLinksBtn) {
    manageCalendarLinksBtn.addEventListener('click', () => {
        googleCalendarUrlInput.value = calendarUrls.google || '';
        appleCalendarUrlInput.value = calendarUrls.apple || '';
        calendarLinksModal.classList.add('active');
    });
}

if(calendarLinksForm) {
    calendarLinksForm.addEventListener('submit', (e) => {
        e.preventDefault();
        calendarUrls.google = googleCalendarUrlInput.value.trim();
        calendarUrls.apple = appleCalendarUrlInput.value.trim();
        localStorage.setItem('calendarUrls', JSON.stringify(calendarUrls));
        calendarLinksModal.classList.remove('active');
        
        // Re-render calendar if active
        if (document.getElementById('view-schedule').classList.contains('active')) {
            renderCalendar();
        }
    });
}

const thaiHolidays2026 = {
    '2026-01-01': 'วันขึ้นปีใหม่',
    '2026-01-02': 'วันหยุดพิเศษ',
    '2026-03-03': 'วันมาฆบูชา',
    '2026-04-06': 'วันจักรี',
    '2026-04-13': 'วันสงกรานต์',
    '2026-04-14': 'วันสงกรานต์',
    '2026-04-15': 'วันสงกรานต์',
    '2026-05-01': 'วันแรงงานแห่งชาติ',
    '2026-05-04': 'วันฉัตรมงคล',
    '2026-05-31': 'วันวิสาขบูชา',
    '2026-06-01': 'วันหยุดชดเชยวันวิสาขบูชา',
    '2026-07-28': 'วันเฉลิมพระชนมพรรษา ร.10',
    '2026-07-29': 'วันอาสาฬหบูชา',
    '2026-07-30': 'วันเข้าพรรษา',
    '2026-08-12': 'วันเฉลิมพระชนมพรรษา พระพันปีหลวง / วันแม่',
    '2026-10-13': 'วันคล้ายวันสวรรคต ร.9',
    '2026-10-23': 'วันปิยมหาราช',
    '2026-12-05': 'วันพ่อแห่งชาติ',
    '2026-12-07': 'วันหยุดชดเชยวันพ่อแห่งชาติ',
    '2026-12-10': 'วันรัฐธรรมนูญ',
    '2026-12-31': 'วันสิ้นปี'
};

function getEventSources() {
    const sources = [];
    const proxy = 'https://corsproxy.io/?';
    if (calendarUrls.google) {
        let url = calendarUrls.google.replace(/^webcal:\/\//i, 'https://');
        url = url.startsWith('http') ? proxy + url : url;
        sources.push({ url: url, format: 'ics', color: '#4285F4' });
    }
    if (calendarUrls.apple) {
        let url = calendarUrls.apple.replace(/^webcal:\/\//i, 'https://');
        url = url.startsWith('http') ? proxy + url : url;
        sources.push({ url: url, format: 'ics', color: '#ff2d55' });
    }
    
    sources.push({
        events: localCalendarEvents,
        id: 'local-events'
    });
    return sources;
}

function renderCalendar() {
    if(!calendarEl) return;
    
    if (!calendar) {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prevYear,prev,next,nextYear today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
            },
            eventSources: getEventSources(),
            height: '100%',
            contentHeight: '100%',
            expandRows: true,
            displayEventTime: true,
            dayCellDidMount: function(arg) {
                const d = arg.date;
                const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                if (thaiHolidays2026[dateStr] || isWeekend) {
                    arg.el.classList.add('calendar-holiday-weekend');
                }
                
                if (thaiHolidays2026[dateStr]) {
                    const topEl = arg.el.querySelector('.fc-daygrid-day-top');
                    if (topEl) {
                        const holidaySpan = document.createElement('span');
                        holidaySpan.className = 'thai-holiday-label';
                        holidaySpan.textContent = thaiHolidays2026[dateStr];
                        topEl.append(holidaySpan);
                    }
                }
            },
            dateClick: function(info) {
                if (isStampMode && activeStamp && activeStamp.id !== 'eraser') {
                    // Prevent same stamp on same day
                    const isDuplicate = localCalendarEvents.some(e => e.start === info.dateStr && e.title === activeStamp.name);
                    if (isDuplicate) return;

                    const newEvent = {
                        id: 'evt_' + Date.now(),
                        title: activeStamp.name,
                        start: info.dateStr,
                        allDay: true,
                        backgroundColor: activeStamp.color,
                        borderColor: activeStamp.color
                    };
                    localCalendarEvents.push(newEvent);
                    saveLocalCalendarEvents();
                    
                    const source = calendar.getEventSourceById('local-events');
                    if (source) source.remove();
                    calendar.addEventSource({ events: localCalendarEvents, id: 'local-events' });
                }
            },
            eventClick: function(info) {
                if (isStampMode) {
                    if (info.event.id && info.event.id.startsWith('evt_')) {
                        localCalendarEvents = localCalendarEvents.filter(e => e.id !== info.event.id);
                        saveLocalCalendarEvents();
                        info.event.remove();
                    }
                } else if (info.event.url) {
                    window.open(info.event.url, '_blank');
                    info.jsEvent.preventDefault();
                }
            }
        });
        calendar.render();
    } else {
        // Update sources
        calendar.getEventSources().forEach(source => source.remove());
        getEventSources().forEach(source => calendar.addEventSource(source));
    }
}

// --- Stamp Mode Logic ---
let calendarStamps = JSON.parse(localStorage.getItem('calendarStamps')) || [];
let rawLocalEvents = JSON.parse(localStorage.getItem('localCalendarEvents')) || [];
// Deduplicate old duplicated events from previous bug
const uniqueEventsMap = new Map();
rawLocalEvents.forEach(e => uniqueEventsMap.set(e.start + '_' + e.title, e));
let localCalendarEvents = Array.from(uniqueEventsMap.values());
if (rawLocalEvents.length !== localCalendarEvents.length) {
    localStorage.setItem('localCalendarEvents', JSON.stringify(localCalendarEvents));
}
let isStampMode = false;
let activeStamp = null;

function saveStamps() {
    localStorage.setItem('calendarStamps', JSON.stringify(calendarStamps));
}

function saveLocalCalendarEvents() {
    localStorage.setItem('localCalendarEvents', JSON.stringify(localCalendarEvents));
}

function renderStamps() {
    const list = document.getElementById('stampList');
    if(!list) return;
    list.innerHTML = '';
    
    // Always add an Eraser button
    const eraserBtn = document.createElement('button');
    const isEraserActive = isStampMode && activeStamp && activeStamp.id === 'eraser';
    eraserBtn.className = `btn btn-sm ${isEraserActive ? 'active' : ''}`;
    eraserBtn.style.backgroundColor = 'var(--surface-color)';
    eraserBtn.style.color = 'var(--text-main)';
    eraserBtn.style.border = '1px solid var(--border-color)';
    if (isEraserActive) {
        eraserBtn.style.outline = '3px solid var(--text-main)';
        eraserBtn.style.outlineOffset = '2px';
    }
    eraserBtn.innerHTML = `<i data-lucide="eraser" style="width: 16px; height: 16px; margin-right: 4px;"></i> <span>Eraser</span>`;
    eraserBtn.onclick = () => activateStampMode({ id: 'eraser', name: 'Eraser', color: 'transparent' });
    list.appendChild(eraserBtn);

    calendarStamps.forEach(stamp => {
        const btn = document.createElement('button');
        btn.className = `btn btn-sm ${isStampMode && activeStamp && activeStamp.id === stamp.id ? 'active' : ''}`;
        btn.style.backgroundColor = stamp.color;
        btn.style.color = '#fff';
        btn.style.border = 'none';
        
        // Active indicator outline
        if (isStampMode && activeStamp && activeStamp.id === stamp.id) {
            btn.style.outline = '3px solid var(--text-main)';
            btn.style.outlineOffset = '2px';
        }

        btn.innerHTML = `<span>${stamp.name}</span> <span class="delete-stamp-btn" style="margin-left: 8px; cursor: pointer; display: inline-flex; align-items: center;"><i data-lucide="x" style="width: 14px; height: 14px;"></i></span>`;
        
        // Handle Delete Icon click separately
        btn.querySelector('.delete-stamp-btn').onclick = (e) => {
            e.stopPropagation();
            deleteStamp(stamp.id);
        };

        btn.onclick = (e) => {
            activateStampMode(stamp);
        };
        list.appendChild(btn);
    });
    
    if (calendarStamps.length === 0) {
        list.innerHTML = '<span style="color: var(--text-secondary); font-size: 14px; font-style: italic;">No stamps yet. Click "Add Stamp" to create one.</span>';
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openAddStampModal() {
    document.getElementById('addStampModal').classList.add('active');
}

document.getElementById('addStampForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('stampName').value;
    const color = document.getElementById('stampColor').value;
    
    calendarStamps.push({
        id: 'stamp_' + Date.now(),
        name: name,
        color: color
    });
    
    saveStamps();
    renderStamps();
    document.getElementById('addStampModal').classList.remove('active');
    e.target.reset();
});

function deleteStamp(id) {
    calendarStamps = calendarStamps.filter(s => s.id !== id);
    if(activeStamp && activeStamp.id === id) {
        exitStampMode();
    }
    saveStamps();
    renderStamps();
}

function activateStampMode(stamp) {
    isStampMode = true;
    activeStamp = stamp;
    document.getElementById('exitStampModeBtn').style.display = 'inline-flex';
    document.getElementById('calendar').style.cursor = 'crosshair';
    
    // Add visual cue to calendar
    const colorCue = stamp.id === 'eraser' ? 'var(--text-secondary)' : stamp.color;
    document.getElementById('calendar').style.border = `2px dashed ${colorCue}`;
    document.getElementById('calendar').style.borderRadius = '12px';
    
    // Close the stamp modal if open
    const modal = document.getElementById('stampModeModal');
    if (modal) modal.classList.remove('active');
    
    renderStamps(); // Re-render to show active state
}

function exitStampMode() {
    isStampMode = false;
    activeStamp = null;
    document.getElementById('exitStampModeBtn').style.display = 'none';
    document.getElementById('calendar').style.cursor = 'default';
    
    // Remove visual cue
    document.getElementById('calendar').style.border = 'none';
    
    renderStamps();
}

// Initial render of stamps
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderStamps);
} else {
    renderStamps();
}

// --- To-Do List Logic ---
let todos = JSON.parse(localStorage.getItem('todos')) || [];

const todoForm = document.getElementById('todoForm');
const todoInput = document.getElementById('todoInput');
const activeTodoList = document.getElementById('activeTodoList');
const completedTodoList = document.getElementById('completedTodoList');
const todoBadge = document.getElementById('todoBadge');

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function renderTodos() {
    if(!activeTodoList || !completedTodoList) return;
    
    activeTodoList.innerHTML = '';
    completedTodoList.innerHTML = '';
    
    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    // Update Badge
    if (todoBadge) {
        todoBadge.textContent = activeTodos.length;
        todoBadge.style.display = activeTodos.length > 0 ? 'inline-block' : 'none';
    }

    const createTodoHTML = (todo) => `
        <li class="todo-item ${todo.completed ? 'completed' : ''}">
            <div class="todo-content">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
                <span class="todo-text">${todo.text}</span>
            </div>
            <div class="todo-actions">
                <button class="icon-btn" onclick="deleteTodo(${todo.id})" title="Delete">
                    <i data-lucide="trash-2" style="color: var(--danger);"></i>
                </button>
            </div>
        </li>
    `;

    if(activeTodos.length === 0) {
        activeTodoList.innerHTML = `<li style="text-align: center; color: var(--text-secondary); padding: 20px;">No active tasks.</li>`;
    } else {
        activeTodoList.innerHTML = activeTodos.map(createTodoHTML).join('');
    }

    if(completedTodos.length === 0) {
        completedTodoList.innerHTML = `<li style="text-align: center; color: var(--text-secondary); padding: 20px;">No completed tasks yet.</li>`;
    } else {
        completedTodoList.innerHTML = completedTodos.map(createTodoHTML).join('');
    }

    lucide.createIcons();
}

if(todoForm) {
    todoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = todoInput.value.trim();
        if(text) {
            todos.push({
                id: Date.now(),
                text: text,
                completed: false
            });
            saveTodos();
            todoInput.value = '';
            renderTodos();
        }
    });
}

window.toggleTodo = (id) => {
    const todo = todos.find(t => t.id === id);
    if(todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
    }
};

window.deleteTodo = (id) => {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
};

// --- Routine Tasks Logic ---
let routines = JSON.parse(localStorage.getItem('routines')) || [];
const routineForm = document.getElementById('routineForm');
const routineInput = document.getElementById('routineInput');
const routineDaysSelector = document.getElementById('routineDaysSelector');
const routineList = document.getElementById('routineList');

let selectedRoutineDays = new Set();

if(routineDaysSelector) {
    routineDaysSelector.addEventListener('click', (e) => {
        if(e.target.classList.contains('routine-day-btn')) {
            const day = parseInt(e.target.dataset.day);
            if(selectedRoutineDays.has(day)) {
                selectedRoutineDays.delete(day);
                e.target.classList.remove('active');
            } else {
                selectedRoutineDays.add(day);
                e.target.classList.add('active');
            }
        }
    });
}

function saveRoutines() {
    localStorage.setItem('routines', JSON.stringify(routines));
}

function renderRoutines() {
    if(!routineList) return;
    
    routineList.innerHTML = '';
    
    const today = new Date();
    // Use local date string YYYY-MM-DD
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    
    let activeRoutinesCount = 0;

    const createRoutineHTML = (routine) => {
        const isCompleted = routine.lastCompleted === todayStr;
        if (!isCompleted) {
            activeRoutinesCount++;
        }
        
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const pillsHTML = routine.days.sort().map(d => `
            <div style="display: flex; align-items: center; gap: 4px;">
                <div class="day-pill" data-day="${d}"></div>
                <span style="font-size: 0.75rem; font-weight: 500; color: var(--color-day-${d});">${dayNames[d]}</span>
            </div>
        `).join('');
        
        return `
        <li class="todo-item ${isCompleted ? 'completed' : ''}">
            <div class="todo-content">
                <input type="checkbox" class="todo-checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleRoutine(${routine.id})">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span class="todo-text">${routine.text}</span>
                    <div class="routine-pills">${pillsHTML}</div>
                </div>
            </div>
            <div class="todo-actions">
                <button class="icon-btn" onclick="deleteRoutine(${routine.id})" title="Delete">
                    <i data-lucide="trash-2" style="color: var(--danger);"></i>
                </button>
            </div>
        </li>
        `;
    };

    if(routines.length === 0) {
        routineList.innerHTML = `<li style="text-align: center; color: var(--text-secondary); padding: 20px;">No routines created.</li>`;
    } else {
        routineList.innerHTML = routines.map(r => createRoutineHTML(r)).join('');
    }

    lucide.createIcons();
    
    // Update Badge
    if (todoBadge) {
        const activeTodosCount = todos.filter(t => !t.completed).length;
        const totalActive = activeTodosCount + activeRoutinesCount;
        todoBadge.textContent = totalActive;
        todoBadge.style.display = totalActive > 0 ? 'inline-block' : 'none';
    }
}

if(routineForm) {
    routineForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = routineInput.value.trim();
        if(text && selectedRoutineDays.size > 0) {
            routines.push({
                id: Date.now(),
                text: text,
                days: Array.from(selectedRoutineDays),
                lastCompleted: null
            });
            saveRoutines();
            routineInput.value = '';
            
            // Clear selection
            selectedRoutineDays.clear();
            document.querySelectorAll('.routine-day-btn').forEach(btn => btn.classList.remove('active'));
            
            renderRoutines();
        } else if (selectedRoutineDays.size === 0) {
            alert('Please select at least one day for the routine.');
        }
    });
}

window.toggleRoutine = (id) => {
    const routine = routines.find(r => r.id === id);
    if(routine) {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        if(routine.lastCompleted === todayStr) {
            routine.lastCompleted = null;
        } else {
            routine.lastCompleted = todayStr;
        }
        saveRoutines();
        renderRoutines();
    }
};

window.deleteRoutine = (id) => {
    if(confirm('Are you sure you want to delete this routine?')) {
        routines = routines.filter(r => r.id !== id);
        saveRoutines();
        renderRoutines();
    }
};

// Initial render
setTimeout(() => {
    renderTodos();
    renderRoutines();
    renderSubscriptions();
    renderFinancialHealth();
});

// --- Investment & Tax Chart Logic ---
let investmentChartInstance = null;
let taxChartInstance = null;

function updateInvestmentView() {
    const invMonthlyEl = document.getElementById('invMonthly');
    // Auto-fill monthly with Safe-to-Save (Next Month projected Net) if empty
    if (!invMonthlyEl.value || invMonthlyEl.value === "") {
        const now = new Date();
        const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const nextMonthNet = calculateProjectedNetForMonth(nextMonthDate);
        if (nextMonthNet > 0) {
            invMonthlyEl.value = Math.floor(nextMonthNet);
        }
    }
    calculateInvestment();
}

// --- Subscriptions Logic ---
let subscriptions = JSON.parse(localStorage.getItem('subscriptions')) || [];

function saveSubscriptions() {
    localStorage.setItem('subscriptions', JSON.stringify(subscriptions));
}

function renderSubscriptions() {
    const subList = document.getElementById('subList');
    const subMonthlyTotal = document.getElementById('subMonthlyTotal');
    const subYearlyTotal = document.getElementById('subYearlyTotal');
    
    if(!subList || !subMonthlyTotal || !subYearlyTotal) return;
    
    subList.innerHTML = '';
    
    let totalMonthly = 0;
    let totalYearly = 0;
    
    if(subscriptions.length === 0) {
        subList.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 20px;">No subscriptions tracked.</td></tr>`;
    } else {
        subscriptions.forEach(sub => {
            const cost = parseFloat(sub.cost);
            let monthlyEqv = 0;
            let yearlyEqv = 0;
            
            if(sub.cycle === 'monthly') {
                monthlyEqv = cost;
                yearlyEqv = cost * 12;
            } else {
                yearlyEqv = cost;
                monthlyEqv = cost / 12;
            }
            
            totalMonthly += monthlyEqv;
            totalYearly += yearlyEqv;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div style="font-weight: 500; display: flex; align-items: center; gap: 8px;">${sub.name}</div></td>
                <td><span style="padding: 4px 8px; border-radius: var(--radius-sm); background: var(--bg-primary); font-size: 0.85rem;">${sub.cycle === 'monthly' ? 'Monthly' : 'Yearly'}</span></td>
                <td>฿${cost.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                <td style="color: var(--text-secondary);">฿${monthlyEqv.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}/mo</td>
                <td>
                    <button class="icon-btn" onclick="deleteSubscription(${sub.id})" title="Delete">
                        <i data-lucide="trash-2" style="color: var(--danger);"></i>
                    </button>
                </td>
            `;
            subList.appendChild(tr);
        });
    }
    
    subMonthlyTotal.textContent = `฿${totalMonthly.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    subYearlyTotal.textContent = `฿${totalYearly.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    lucide.createIcons();
}

window.deleteSubscription = (id) => {
    if(confirm('Are you sure you want to delete this subscription?')) {
        subscriptions = subscriptions.filter(s => s.id !== id);
        saveSubscriptions();
        renderSubscriptions();
    }
};

const subForm = document.getElementById('subForm');
if(subForm) {
    subForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('subName').value.trim();
        const cost = parseFloat(document.getElementById('subCost').value);
        const cycle = document.getElementById('subCycle').value;
        
        if(name && !isNaN(cost) && cost > 0) {
            subscriptions.push({
                id: Date.now(),
                name,
                cost,
                cycle
            });
            saveSubscriptions();
            renderSubscriptions();
            subForm.reset();
        }
    });
}

function calculateInvestment() {
    const principal = parseFloat(document.getElementById('invPrincipal').value) || 0;
    const monthly = parseFloat(document.getElementById('invMonthly').value) || 0;
    const rate = parseFloat(document.getElementById('invRate').value) || 0;
    const years = parseInt(document.getElementById('invYears').value) || 0;

    const labels = [];
    const principalData = [];
    const interestData = [];

    let currentBalance = principal;
    let totalPrincipal = principal;
    const monthlyRate = (rate / 100) / 12;

    labels.push('Year 0');
    principalData.push(principal);
    interestData.push(0);

    for (let y = 1; y <= years; y++) {
        for (let m = 1; m <= 12; m++) {
            currentBalance += monthly;
            totalPrincipal += monthly;
            currentBalance += currentBalance * monthlyRate;
        }
        labels.push(`Year ${y}`);
        principalData.push(totalPrincipal);
        interestData.push(currentBalance - totalPrincipal);
    }

    const totalInterest = currentBalance - totalPrincipal;

    document.getElementById('invTotalPrincipal').textContent = formatCurrency(totalPrincipal);
    document.getElementById('invTotalInterest').textContent = formatCurrency(totalInterest);
    document.getElementById('invFinalBalance').textContent = formatCurrency(currentBalance);

    // Update Chart
    const ctx = document.getElementById('investmentChart').getContext('2d');
    if (investmentChartInstance) {
        investmentChartInstance.destroy();
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#1e293b';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

    investmentChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Principal',
                    data: principalData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                },
                {
                    label: 'Total Interest',
                    data: interestData,
                    backgroundColor: 'rgba(16, 185, 129, 0.8)',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    stacked: true,
                    ticks: { 
                        color: textColor,
                        callback: function(value) {
                            return '฿' + value.toLocaleString();
                        }
                    },
                    grid: { color: gridColor }
                }
            },
            plugins: {
                legend: {
                    labels: { color: textColor }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

document.getElementById('invPrincipal')?.addEventListener('input', calculateInvestment);
document.getElementById('invMonthly')?.addEventListener('input', calculateInvestment);
document.getElementById('invRate')?.addEventListener('input', calculateInvestment);
document.getElementById('invYears')?.addEventListener('input', calculateInvestment);
document.getElementById('taxIncType')?.addEventListener('change', calculateTax);
document.getElementById('taxDeductType')?.addEventListener('change', calculateTax);

// ---- DEBUG: Show a test toast on load so the user knows they have the latest code ----
setTimeout(() => {
    if (window.showToast) {
        window.showToast('✅ โค้ดเวอร์ชันล่าสุดทำงานแล้ว! (Test Pop-up)', 'success');
    }
}, 1500);

const refreshInsightBtn = document.getElementById('refreshInsightBtn');
if(refreshInsightBtn) {
    refreshInsightBtn.addEventListener('click', displayRandomInsight);
}

// --- Net Worth & Emergency Fund Logic ---
let netWorthData = JSON.parse(localStorage.getItem('netWorthData')) || { assets: 0, debts: 0 };
let emergencyData = JSON.parse(localStorage.getItem('emergencyData')) || { targetMonths: 6, saved: 0 };

function saveNetWorth() {
    localStorage.setItem('netWorthData', JSON.stringify(netWorthData));
}

function saveEmergency() {
    localStorage.setItem('emergencyData', JSON.stringify(emergencyData));
}

function calculateCurrentCash() {
    let cash = 0;
    transactions.forEach(t => {
        if(t.type === 'income') cash += t.amount;
        if(t.type === 'expense') cash -= t.amount;
    });
    return cash > 0 ? cash : 0;
}

function calculateCurrentInvestments() {
    // Basic sum from DCA plan
    const principal = parseFloat(document.getElementById('invPrincipal')?.value) || 0;
    return principal;
}
function calculateMonthlyAverages() {
    let totalExpense = 0;
    let expenseMonths = new Set();
    transactions.forEach(t => {
        if(t.type === 'expense') {
            totalExpense += t.amount;
            const d = new Date(t.date);
            expenseMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
        }
    });
    return {
        avgExpense: expenseMonths.size > 0 ? totalExpense / expenseMonths.size : 0
    };
}

function renderFinancialHealth() {
    // Net Worth
    const cash = calculateCurrentCash();
    const investments = calculateCurrentInvestments();
    const otherAssets = netWorthData.assets || 0;
    const debts = netWorthData.debts || 0;
    
    const totalAssets = cash + investments + otherAssets;
    const netWorth = totalAssets - debts;
    
    const nwTotalEl = document.getElementById('netWorthTotal');
    const nwAssetsEl = document.getElementById('netWorthAssets');
    const nwDebtsEl = document.getElementById('netWorthDebts');
    
    if(nwTotalEl) {
        nwTotalEl.textContent = `฿${netWorth.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        nwAssetsEl.textContent = `฿${totalAssets.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        nwDebtsEl.textContent = `฿${debts.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    
    // Emergency Fund
    const avgs = calculateMonthlyAverages();
    const avgExpense = avgs ? avgs.avgExpense : 0;
    const target = avgExpense * emergencyData.targetMonths;
    const saved = emergencyData.saved || 0;
    
    const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    
    const emCurrentEl = document.getElementById('emFundCurrent');
    const emTargetEl = document.getElementById('emFundTarget');
    const emPercentEl = document.getElementById('emFundPercent');
    const emProgressBar = document.getElementById('emFundProgressBar');
    const emStatusEl = document.getElementById('emFundStatus');
    
    if(emCurrentEl) {
        emCurrentEl.textContent = `฿${saved.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        emTargetEl.textContent = `฿${target.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        emPercentEl.textContent = `${percent}%`;
        emProgressBar.style.width = `${percent}%`;
        
        if (percent >= 100) {
            emProgressBar.style.background = 'var(--success)';
            emStatusEl.textContent = '🎉 Fully Funded! You are financially safe.';
            emPercentEl.style.color = 'var(--success)';
        } else if (percent >= 50) {
            emProgressBar.style.background = 'var(--warning)';
            emStatusEl.textContent = `Target: ${emergencyData.targetMonths} months of average expenses. Keep going!`;
            emPercentEl.style.color = 'var(--warning)';
        } else {
            emProgressBar.style.background = 'var(--danger)';
            emStatusEl.textContent = `Target: ${emergencyData.targetMonths} months of average expenses. Needs attention.`;
            emPercentEl.style.color = 'var(--danger)';
        }
    }
}

// Modal logic for Net Worth
window.openNetWorthModal = () => {
    document.getElementById('nwAssets').value = netWorthData.assets;
    document.getElementById('nwDebts').value = netWorthData.debts;
    const modal = document.getElementById('netWorthModal');
    if(modal) modal.classList.add('active');
};

const nwForm = document.getElementById('netWorthForm');
if(nwForm) {
    nwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        netWorthData.assets = parseFloat(document.getElementById('nwAssets').value) || 0;
        netWorthData.debts = parseFloat(document.getElementById('nwDebts').value) || 0;
        saveNetWorth();
        renderFinancialHealth();
        const modal = document.getElementById('netWorthModal');
        if(modal) modal.classList.remove('active');
    });
}

// Modal logic for Emergency Fund
window.openEmergencyModal = () => {
    document.getElementById('emMonths').value = emergencyData.targetMonths;
    document.getElementById('emSaved').value = emergencyData.saved;
    const modal = document.getElementById('emergencyModal');
    if(modal) modal.classList.add('active');
};

const emForm = document.getElementById('emergencyForm');
if(emForm) {
    emForm.addEventListener('submit', (e) => {
        e.preventDefault();
        emergencyData.targetMonths = parseInt(document.getElementById('emMonths').value) || 6;
        emergencyData.saved = parseFloat(document.getElementById('emSaved').value) || 0;
        saveEmergency();
        renderFinancialHealth();
        const modal = document.getElementById('emergencyModal');
        if(modal) modal.classList.remove('active');
    });
}

// --- Tax Planner Logic ---
let taxIncomes = JSON.parse(localStorage.getItem('taxIncomes')) || [];

function saveTaxIncomes() {
    localStorage.setItem('taxIncomes', JSON.stringify(taxIncomes));
}

function renderTaxIncomes() {
    const list = document.getElementById('taxIncomeList');
    if(!list) return;
    
    list.innerHTML = '';
    
    if(taxIncomes.length === 0) {
        list.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 12px; font-size: 0.9rem;">No income sources added yet.</div>';
    } else {
        taxIncomes.forEach(inc => {
            const el = document.createElement('div');
            el.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--bg-primary); border-radius: var(--radius-md); border: 1px solid var(--border-color);';
            
            // We calculate effective % contribution later, but for UI let's show amount
            el.innerHTML = `
                <div>
                    <div style="font-weight: 500;">${inc.name}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                        <span style="display: inline-block; padding: 2px 6px; background: var(--bg-secondary); border-radius: 4px; margin-right: 8px;">${inc.type}</span>
                        <span id="tax-percent-${inc.id}">Calculating...</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="text-align: right;">
                        <div style="font-weight: 600;">฿${parseFloat(inc.amount).toLocaleString('en-US', {minimumFractionDigits: 2})}/mo</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">฿${(parseFloat(inc.amount) * 12).toLocaleString('en-US', {minimumFractionDigits: 2})}/yr</div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="icon-btn" onclick="editTaxIncome(${inc.id})" title="Edit" style="color: var(--primary);"><i data-lucide="edit-2"></i></button>
                        <button class="icon-btn" onclick="deleteTaxIncome(${inc.id})" title="Delete" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
                    </div>
                </div>
            `;
            list.appendChild(el);
        });
    }
    lucide.createIcons();
    calculateTax();
}

window.deleteTaxIncome = (id) => {
    taxIncomes = taxIncomes.filter(i => i.id !== id);
    saveTaxIncomes();
    renderTaxIncomes();
};

window.editTaxIncome = (id) => {
    const item = taxIncomes.find(i => i.id === id);
    if(item) {
        document.getElementById('taxIncName').value = item.name;
        document.getElementById('taxIncType').value = item.type;
        document.getElementById('taxIncAmount').value = item.amount;
        
        // Remove old item to "move" it into edit mode
        taxIncomes = taxIncomes.filter(i => i.id !== id);
        saveTaxIncomes();
        renderTaxIncomes();
        
        document.getElementById('taxIncomeForm').scrollIntoView({ behavior: 'smooth' });
    }
};

const taxIncomeForm = document.getElementById('taxIncomeForm');
if(taxIncomeForm) {
    taxIncomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('taxIncName').value.trim();
        const type = document.getElementById('taxIncType').value;
        const freq = document.getElementById('taxIncFreq').value;
        const amount = parseFloat(document.getElementById('taxIncAmount').value) || 0;
        
        taxIncomes.push({ id: Date.now(), name, type, freq, amount });
        saveTaxIncomes();
        taxIncomeForm.reset();
        document.getElementById('taxIncType').value = '40(1)'; // reset default
        document.getElementById('taxIncFreq').value = 'monthly'; // reset default
        renderTaxIncomes();
    });
}

function calculateTax() {
    let income40_1_2 = 0; // Salary & Wages
    let income40_6 = 0;   // Medical
    let incomeOther = 0;  // 40(8) Others
    
    let totalGrossIncome = 0;
    
    taxIncomes.forEach(inc => {
        const annualAmount = (inc.freq === 'annually') ? inc.amount : (inc.amount * 12);
        totalGrossIncome += annualAmount;
        if(inc.type === '40(1)') income40_1_2 += annualAmount;
        else if(inc.type === '40(6)') income40_6 += annualAmount;
        else incomeOther += annualAmount;
    });

    const socialSecurity = parseFloat(document.getElementById('taxSocialSecurity')?.value) || 0;
    const gpf = parseFloat(document.getElementById('taxGPF')?.value) || 0;
    const insurance = parseFloat(document.getElementById('taxInsurance')?.value) || 0;
    const ssf = parseFloat(document.getElementById('taxSSF')?.value) || 0;
    const rmf = parseFloat(document.getElementById('taxRMF')?.value) || 0;
    const esg = parseFloat(document.getElementById('taxESG')?.value) || 0;
    const mortgage = parseFloat(document.getElementById('taxMortgage')?.value) || 0;
    const donation = parseFloat(document.getElementById('taxDonation')?.value) || 0;
    
    const maritalStatus = document.getElementById('taxMaritalStatus')?.value || 'single';
    const parents = parseInt(document.getElementById('taxParents')?.value || '0');

    // Standard Deductions Logic (Thai Tax Law)
    // 40(1) & (2) combined: 50% max 100,000
    const deduction40_1 = Math.min(income40_1_2 * 0.5, 100000);
    
    // 40(6) Medical: 60% flat (unlimited)
    const deduction40_6 = income40_6 * 0.6;
    
    // 40(8) Other: 60% standard deduction (Commerce/Online Selling)
    const deduction40_8 = incomeOther * 0.6;
    
    // Standard total deduction
    const standardDeduction = deduction40_1 + deduction40_6 + deduction40_8;
    const personalExemption = maritalStatus === 'married' ? 120000 : 60000;
    const parentDeduction = parents * 30000;
    
    // Validate Max Caps
    const validSocialSecurity = Math.min(socialSecurity, 9000);
    const validGPF = Math.min(gpf, totalGrossIncome * 0.3, 500000);
    const validInsurance = Math.min(insurance, 100000);
    const validSSF = Math.min(ssf, totalGrossIncome * 0.3, 200000);
    const validRMF = Math.min(rmf, totalGrossIncome * 0.3, 500000);
    const combinedRetirement = Math.min(validSSF + validRMF + validGPF, 500000);
    const validESG = Math.min(esg, totalGrossIncome * 0.3, 300000);
    const validMortgage = Math.min(mortgage, 100000);
    
    // Calculate Base Deductions
    let totalDeductions = standardDeduction + personalExemption + parentDeduction + validInsurance + combinedRetirement + validESG + validMortgage + validSocialSecurity;
    
    // Donation is capped at 10% of (Income - other deductions)
    let netBeforeDonation = Math.max(0, totalGrossIncome - totalDeductions);
    const validDonation = Math.min(donation, netBeforeDonation * 0.1);
    
    totalDeductions += validDonation;
    const netIncome = Math.max(0, totalGrossIncome - totalDeductions);
    
    // Tax Brackets 2024
    let taxPayable = 0;
    let marginalRate = 0;
    
    const brackets = [
        { max: 150000, rate: 0.00 },
        { max: 300000, rate: 0.05 },
        { max: 500000, rate: 0.10 },
        { max: 750000, rate: 0.15 },
        { max: 1000000, rate: 0.20 },
        { max: 2000000, rate: 0.25 },
        { max: 5000000, rate: 0.30 },
        { max: Infinity, rate: 0.35 }
    ];

    let previousMax = 0;
    let bracketVisualHtml = '';
    
    let chartDatasets = [];
    
    for (let i = 0; i < brackets.length; i++) {
        let b = brackets[i];
        let taxableInThisBracket = 0;
        let taxForBracket = 0;
        
        if (netIncome > previousMax) {
            taxableInThisBracket = Math.min(netIncome - previousMax, b.max - previousMax);
            taxForBracket = taxableInThisBracket * b.rate;
            taxPayable += taxForBracket;
            if(taxableInThisBracket > 0) marginalRate = b.rate * 100;
        }
        
        let labelMax = b.max === Infinity ? "Up" : (b.max / 1000) + "k";
        let labelMin = (previousMax / 1000) + "k";
        let label = `${labelMin} - ${labelMax} (${b.rate * 100}%)`;
        
        // Cool to Hot colors based on bracket (0 to 7)
        const gaugeColors = [
            '#22c55e', // 0% Green
            '#0ea5e9', // 5% Blue
            '#eab308', // 10% Yellow
            '#f59e0b', // 15% Amber
            '#f97316', // 20% Orange
            '#ef4444', // 25% Red
            '#b91c1c', // 30% Dark Red
            '#7f1d1d'  // 35% Very Dark Red
        ];
        
        if (taxableInThisBracket > 0 || (netIncome === 0 && i === 0)) {
            bracketVisualHtml += `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 8px;">
                <span>${label}</span>
                <span style="color: var(--text-secondary);">฿${taxForBracket.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>`;
        }
        
        // Visual width for gauge (cap highest bracket to 2M for proportion)
        let visualRangeWidth = b.max === Infinity ? 2000000 : (b.max - previousMax);
        let filledWidth = Math.min(taxableInThisBracket, visualRangeWidth);
        let unfilledWidth = visualRangeWidth - filledWidth;
        
        if (filledWidth > 0) {
            chartDatasets.push({
                label: label,
                data: [filledWidth],
                backgroundColor: gaugeColors[i],
                borderWidth: 0,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
                borderRadius: 0
            });
        }
        
        if (unfilledWidth > 0) {
            chartDatasets.push({
                label: label + ' (Unreached)',
                data: [unfilledWidth],
                backgroundColor: gaugeColors[i] + '33', // 20% opacity via hex
                borderWidth: 0,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
                borderRadius: 0
            });
        }
        
        previousMax = b.max;
    }
    
    // If we want a true gauge look, we might need a background "empty" segment to complete the half circle if they haven't maxed out.
    // However, since it represents their income distribution, standard doughnut proportions look best.
    
    // Render Results
    const taxResGross = document.getElementById('taxResGross');
    if(taxResGross) {
        taxResGross.textContent = `฿${totalGrossIncome.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('taxResDeductions').textContent = `-฿${totalDeductions.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('taxResNet').textContent = `฿${netIncome.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('taxResPayable').textContent = `฿${taxPayable.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const effectiveRate = totalGrossIncome > 0 ? (taxPayable / totalGrossIncome) * 100 : 0;
        document.getElementById('taxResRate').textContent = `${effectiveRate.toFixed(2)}%`;
        
        // Update Income percentages in UI
        taxIncomes.forEach(inc => {
            const pEl = document.getElementById(`tax-percent-${inc.id}`);
            if(pEl) {
                const percentOfIncome = totalGrossIncome > 0 ? (inc.amount / totalGrossIncome) * 100 : 0;
                // Proportional tax burden logic (simplistic)
                const proportionalTax = totalGrossIncome > 0 ? (inc.amount / totalGrossIncome) * taxPayable : 0;
                pEl.innerHTML = `${percentOfIncome.toFixed(1)}% of total income | Est. Tax Burden: ฿${proportionalTax.toLocaleString('en-US', {maximumFractionDigits:0})}`;
            }
        });
        
        // Suggestion Engine
        const suggestionEl = document.getElementById('taxSuggestion');
        if(totalGrossIncome === 0) {
            suggestionEl.innerHTML = `Enter your income to see personalized tax suggestions.`;
        } else if (marginalRate === 0) {
            suggestionEl.innerHTML = `<span style="color: var(--success);"><i data-lucide="check-circle" style="width:16px; display:inline-block; vertical-align:middle;"></i> You are in the 0% tax bracket! No further action needed.</span>`;
        } else {
            const nextTarget = brackets.find(b => b.rate * 100 === marginalRate - 5)?.max || 150000;
            const toDrop = netIncome - nextTarget;
            
            let suggText = `Your highest marginal tax rate is <strong>${marginalRate}%</strong>.<br><br>`;
            
            if (toDrop > 0 && marginalRate > 5) {
                suggText += `If you invest an additional <strong>฿${toDrop.toLocaleString()}</strong> in tax-deductible funds (like SSF, RMF, or Thai ESG), your marginal rate will drop to <strong>${marginalRate - 5}%</strong>!`;
            } else {
                suggText += `Try maximizing your Thai ESG (up to 300k) or SSF/RMF to reduce your payable tax of ฿${taxPayable.toLocaleString()}.`;
            }
            suggestionEl.innerHTML = suggText;
        }
        
        const bracketsBreakdownEl = document.getElementById('taxBracketsBreakdown');
        if (bracketsBreakdownEl) {
            bracketsBreakdownEl.innerHTML = bracketVisualHtml;
        }
        
        // Update Chart
        const ctx = document.getElementById('taxBracketChart');
        if (ctx) {
            if (taxChartInstance) {
                taxChartInstance.destroy();
            }
            taxChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Taxable Income'],
                    datasets: chartDatasets
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label.includes('Unreached')) {
                                        return label; // Just show label, no value
                                    }
                                    if (label) label += ': ';
                                    label += '฿' + context.raw.toLocaleString('en-US', {minimumFractionDigits: 2});
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            display: false // Hide axis for a cleaner gauge look
                        },
                        y: {
                            stacked: true,
                            display: false // Hide axis
                        }
                    }
                }
            });
        }
        
        lucide.createIcons();
    }
}

// Bind event listeners for Tax Planner
const taxInputs = ['taxMaritalStatus', 'taxParents', 'taxGPF', 'taxInsurance', 'taxSSF', 'taxRMF', 'taxESG', 'taxMortgage', 'taxDonation'];
taxInputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.addEventListener('input', calculateTax);
    }
});

// Initial Render for Tax Incomes
setTimeout(() => {
    // Load saved deductions
    const savedDeductions = JSON.parse(localStorage.getItem('taxDeductions'));
    if (savedDeductions) {
        taxInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el && savedDeductions[id] !== undefined) {
                el.value = savedDeductions[id];
            }
        });
    }
    renderTaxIncomes();
});

// Save deductions logic
const btnSaveDeductions = document.getElementById('btnSaveDeductions');
if (btnSaveDeductions) {
    btnSaveDeductions.addEventListener('click', () => {
        const deductions = {};
        taxInputs.forEach(id => {
        deductions[id] = document.getElementById(id).value;
        });
        localStorage.setItem('taxDeductions', JSON.stringify(deductions));
        
        const originalText = btnSaveDeductions.innerHTML;
        btnSaveDeductions.innerHTML = '<i data-lucide="check"></i> Saved!';
        btnSaveDeductions.classList.replace('btn-primary', 'btn-success');
        if(typeof lucide !== 'undefined') lucide.createIcons();
        
        setTimeout(() => {
            btnSaveDeductions.innerHTML = originalText;
            btnSaveDeductions.classList.replace('btn-success', 'btn-primary');
            if(typeof lucide !== 'undefined') lucide.createIcons();
        }, 2000);
    });
}

// --- Data Management (Backup, Restore, Export CSV) ---

function exportData() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
    }
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'findash-backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// --- AI Integrations ---
function saveGeminiApiKey() {
    const key = document.getElementById('geminiApiKeyInput').value;
    localStorage.setItem('geminiApiKey', key);
    alert('Gemini API Key saved locally!');
}

setTimeout(() => {
    const savedKey = localStorage.getItem('geminiApiKey');
    const inputEl = document.getElementById('geminiApiKeyInput');
    if (savedKey && inputEl) {
        inputEl.value = savedKey;
    }
}, 100);

let pendingImportTransactions = [];

async function handleBankCsvImport(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        alert('Please enter your Gemini API Key in the AI Integrations section first.');
        event.target.value = '';
        return;
    }

    document.getElementById('csvPreviewStatus').innerText = "🤖 AI is reading your file(s)... 0%";
    const progressContainer = document.getElementById('csvProgressBarContainer');
    const progressBar = document.getElementById('csvProgressBar');
    if (progressContainer) progressContainer.style.display = 'block';
    if (progressBar) progressBar.style.width = '0%';
    
    document.getElementById('csvPreviewTableBody').innerHTML = "";
    document.getElementById('btnConfirmCsvImport').disabled = true;
    document.getElementById('csvPreviewModal').classList.add('active');

    const isImage = files.some(file => file.type.startsWith('image/'));
    
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 90) {
            const increment = progress < 50 ? (Math.floor(Math.random() * 3) + 2) : 
                              progress < 80 ? (Math.floor(Math.random() * 2) + 1) : 
                              (Math.random() > 0.5 ? 1 : 0);
            
            progress += increment;
            if (progress > 90) progress = 90;
            
            let statusText = "🤖 AI is starting up...";
            if (progress >= 10) statusText = "📤 Reading file & sending to AI...";
            if (progress >= 40) statusText = "🤔 AI is analyzing transactions...";
            if (progress >= 70) statusText = "📊 Calculating monthly totals...";
            
            if (progressBar) progressBar.style.width = `${progress}%`;
            document.getElementById('csvPreviewStatus').innerText = `${statusText} ${progress}%`;
        }
    }, 150);

    async function animateProgressTo100() {
        return new Promise(resolve => {
            const finishInterval = setInterval(() => {
                progress += 3;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(finishInterval);
                    if (progressBar) progressBar.style.width = '100%';
                    document.getElementById('csvPreviewStatus').innerText = `✅ Analysis Complete! 100%`;
                    setTimeout(resolve, 600);
                } else {
                    if (progressBar) progressBar.style.width = `${progress}%`;
                    document.getElementById('csvPreviewStatus').innerText = `✨ Finalizing results... ${progress}%`;
                }
            }, 20);
        });
    }

    try {
        let monthlyData = [];
        
        if (isImage) {
            const imageFiles = files.filter(f => f.type.startsWith('image/')).slice(0, 15);
            
            const base64Images = await Promise.all(imageFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const r = new FileReader();
                    r.onload = e => {
                        const img = new Image();
                        img.onload = () => {
                            // Resize image to max 1500px width or height to save payload size
                            const MAX_DIM = 1500;
                            let width = img.width;
                            let height = img.height;
                            
                            if (width > MAX_DIM || height > MAX_DIM) {
                                if (width > height) {
                                    height = Math.round(height *= MAX_DIM / width);
                                    width = MAX_DIM;
                                } else {
                                    width = Math.round(width *= MAX_DIM / height);
                                    height = MAX_DIM;
                                }
                            }
                            
                            const canvas = document.createElement('canvas');
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            // Compress to JPEG with 0.8 quality
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            resolve({
                                mimeType: "image/jpeg",
                                data: dataUrl.split(',')[1]
                            });
                        };
                        img.onerror = () => reject(new Error("Failed to load image for compression"));
                        img.src = e.target.result;
                    };
                    r.onerror = err => reject(err);
                    r.readAsDataURL(file);
                });
            }));
            
            const aiPrompt = `You are a financial data extractor. I have attached screenshot(s) of a bank statement. 
Your task is to extract the TOTAL income (deposits) and TOTAL expense (withdrawals) for each month found in this statement.
1. Look for monthly summary sections if they exist. Do NOT add up individual transactions if a summary is provided.
2. If you must add them up manually, CRITICAL: IGNORE internal transfers between own accounts/pockets! If a row contains keywords like 'Move Money', 'Transfer to own account', 'แอบออม', skip it entirely. Do not count it as income or expense.
3. Output the result ONLY as a JSON array of objects EXACTLY like this: [{"month": "2024-05", "income": 1000.0, "expense": 500.0}]
4. If the year is Buddhist (e.g., 2567), you MUST subtract 543 to get the Gregorian year (e.g., 2024).
Return ONLY the raw JSON array. No markdown tags, no explanations.`;

            const parts = [{ text: aiPrompt }];
            for (const img of base64Images) {
                parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: parts }],
                    generationConfig: {
                        responseMimeType: "application/json"
                    }
                })
            });

            const data = await response.json();
            
            clearInterval(progressInterval);
            await animateProgressTo100();

            if (data.error) throw new Error(`Code ${data.error.code || 'API_ERROR'}: ${data.error.message}`);
            
            let responseText = data.candidates[0].content.parts[0].text;
            responseText = responseText.replace(/```json/g, '').replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();
            
            try {
                monthlyData = JSON.parse(responseText);
            } catch (err) {
                console.error("JSON Parse Error:", err, responseText);
                throw new Error("AI returned invalid JSON format from images.");
            }

        } else {
            // Process single CSV
            const file = files.find(f => f.name.toLowerCase().endsWith('.csv')) || files[0];
            const csvText = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = e => resolve(e.target.result);
                r.onerror = err => reject(err);
                r.readAsText(file);
            });
            
            function parseCSVToArray(text) {
                const lines = text.split('\n');
                return lines.map(line => {
                    const row = [];
                    let cur = '';
                    let inQuote = false;
                    for (let i = 0; i < line.length; i++) {
                        if (line[i] === '"') inQuote = !inQuote;
                        else if (line[i] === ',' && !inQuote) {
                            row.push(cur.trim());
                            cur = '';
                        } else {
                            cur += line[i];
                        }
                    }
                    row.push(cur.trim());
                    return row;
                });
            }

            const rows = parseCSVToArray(csvText);
            const sampleRows = rows.slice(0, 20);

            const prompt = `You are a JavaScript expert. I have a 2D array of strings representing a parsed bank statement CSV.
            I need you to write a JavaScript function body that processes the variable \`rows\` (a 2D array) and calculates the total income and expense for each month.
            
            Requirements:
            1. Loop through \`rows\`. Skip headers, summary rows, or empty rows (look for valid date patterns).
            2. Extract Date, Income, and Expense. Note that amounts might be empty strings if not applicable. Clean the amount strings (remove commas) and parse as floats.
            3. CRITICAL: IGNORE internal transfers between own accounts/pockets! If a row contains keywords like 'Move Money', 'Transfer to own account', 'แอบออม', or appears to be an internal transfer between pockets in the same app, skip it entirely. Do not count it as income or expense.
            4. Group the totals by month. The month string MUST be in "YYYY-MM" format. 
            5. If the year is Buddhist (e.g., 2567), you MUST subtract 543 to get the Gregorian year (e.g., 2024).
            6. Return an array of objects EXACTLY like this: \`[{"month": "2024-05", "income": 1000.0, "expense": 500.0}]\`.
            
            Here are the first 20 rows of the array to help you identify the column indices:
            ${JSON.stringify(sampleRows, null, 2)}
            
            Return ONLY the raw JavaScript function body code. No markdown tags, no explanations. 
            Your code will run inside \`new Function('rows', yourCode)\`.
            `;

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();
            
            clearInterval(progressInterval);
            await animateProgressTo100();

            if (data.error) throw new Error(`Code ${data.error.code || 'API_ERROR'}: ${data.error.message}`);
            
            let generatedCode = data.candidates[0].content.parts[0].text;
            // clean markdown
            generatedCode = generatedCode.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '').trim();

            try {
                const processFunction = new Function('rows', generatedCode);
                monthlyData = processFunction(rows);
            } catch (evalError) {
                console.error("AI Generated Code Error:", evalError, generatedCode);
                throw new Error("AI generated invalid JavaScript code.");
            }
        }

        const tbody = document.getElementById('csvPreviewTableBody');
        tbody.innerHTML = "";
        pendingImportTransactions = [];

        if (monthlyData && monthlyData.length > 0) {
            document.getElementById('csvPreviewStatus').innerText = `✅ AI successfully analyzed ${monthlyData.length} months.`;
            document.getElementById('btnConfirmCsvImport').disabled = false;

            // Sort ascending by month
            monthlyData.sort((a, b) => a.month.localeCompare(b.month));

            monthlyData.forEach(item => {
                const fakeId = "ai_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
                
                if (item.income > 0) {
                    pendingImportTransactions.push({
                        id: fakeId + "_in",
                        date: `${item.month}-01`,
                        amount: parseFloat(item.income),
                        category: "Salary",
                        type: "income",
                        note: "AI Extracted Income"
                    });
                }
                
                if (item.expense > 0) {
                    pendingImportTransactions.push({
                        id: fakeId + "_ex",
                        date: `${item.month}-01`,
                        amount: parseFloat(item.expense),
                        category: "Shopping",
                        type: "expense",
                        note: "AI Extracted Expense"
                    });
                }
            });

            pendingImportTransactions.slice(0, 50).forEach(t => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${t.date}</td>
                    <td>${t.type === 'income' ? 'Income' : 'Expense'}</td>
                    <td class="${t.type === 'income' ? 'amount-positive' : 'amount-negative'}">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                    </td>
                    <td>${t.note}</td>
                `;
                tbody.appendChild(tr);
            });
            
            if (pendingImportTransactions.length > 50) {
                tbody.innerHTML += `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">... and ${pendingImportTransactions.length - 50} more</td></tr>`;
            }

        } else {
            throw new Error("No monthly data found in the response.");
        }

    } catch (error) {
        clearInterval(progressInterval);
        const progressContainer = document.getElementById('csvProgressBarContainer');
        if (progressContainer) progressContainer.style.display = 'none';
        console.error("AI Parse Error:", error);
        document.getElementById('csvPreviewStatus').innerText = `❌ Error: ${error.message}`;
        alert(`🚨 AI Processing Failed\n\n${error.message}\n\nPlease check your API Key and try again.`);
    }
    
    event.target.value = '';
}

document.getElementById('btnConfirmCsvImport')?.addEventListener('click', () => {
    if (pendingImportTransactions.length > 0) {
        // Clear all previously imported AI data before adding new ones
        transactions = transactions.filter(t => t.note !== 'จากไฟล์ CSV (AI)' && t.note !== 'AI Extracted Income' && t.note !== 'AI Extracted Expense');
        
        transactions = [...transactions, ...pendingImportTransactions];
        // Sort by date descending
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Auto-switch dashboard to the month of the newly imported data
        pendingImportTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const newestDate = pendingImportTransactions[0].date;
        selectedMonth = newestDate.substring(0, 7);
        selectedYear = newestDate.substring(0, 4);
        
        const monthPickerEl = document.getElementById('monthPicker');
        const yearPickerEl = document.getElementById('yearPicker');
        if (monthPickerEl) monthPickerEl.value = selectedMonth;
        if (yearPickerEl) {
            let hasYear = false;
            for(let i=0; i<yearPickerEl.options.length; i++) {
                if(yearPickerEl.options[i].value === selectedYear) { hasYear = true; break; }
            }
            if(!hasYear) {
                const opt = document.createElement('option');
                opt.value = selectedYear;
                opt.textContent = selectedYear;
                yearPickerEl.appendChild(opt);
            }
            yearPickerEl.value = selectedYear;
        }
        
        saveTransactions();
        updateDashboard();
        document.getElementById('csvPreviewModal').classList.remove('active');
        pendingImportTransactions = [];
        
        // Switch to dashboard tab to see results
        document.querySelector('.nav-item[data-view="view-dashboard"]').click();
    }
});

function importData() {
    const fileInput = document.getElementById('importDataFile');
    const file = fileInput.files[0];
    if (!file) {
        alert('Please select a .json backup file first.');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm('Are you sure you want to restore data? This will overwrite your current data!')) {
                localStorage.clear();
                window.isRestoringFromCloud = true;
                for (let key in data) {
                    localStorage.setItem(key, data[key]);
                }
                window.isRestoringFromCloud = false;
                if (window.syncDataToCloud) {
                    window.syncDataToCloud().then((success) => {
                        if (success) {
                            alert('Data restored and synced to cloud successfully! The page will now reload.');
                            location.reload();
                        }
                    });
                } else {
                    alert('Data restored successfully! The page will now reload.');
                    location.reload();
                }
            }
        } catch (error) {
            alert('Error reading the backup file. Ensure it is a valid JSON file.');
        }
    };
    reader.readAsText(file);
}

function exportTransactionsCSV() {
    const rawData = localStorage.getItem('finance_dashboard_data_v3');
    let transactions = [];
    if (rawData) {
        try {
            const parsed = JSON.parse(rawData);
            transactions = parsed.transactions || [];
        } catch (e) {}
    }
    
    if (transactions.length === 0) {
        alert('No transactions to export.');
        return;
    }
    
    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // CSV Header (with BOM for Excel UTF-8 support)
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Date,Type,Amount,Category,Note\n';
    
    transactions.forEach(t => {
        const date = t.date;
        const type = t.type;
        const amount = t.amount;
        const category = `"${(t.category || '').replace(/"/g, '""')}"`;
        const note = `"${(t.note || '').replace(/"/g, '""')}"`;
        
        csvContent += `${date},${type},${amount},${category},${note}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'transactions.csv');
    link.click();
}

// --- Weather Widget Logic ---
async function loadWeather() {
    const tempEl = document.getElementById('weatherTemp');
    const descEl = document.getElementById('weatherDesc');
    const locEl = document.getElementById('weatherLocation');
    const iconEl = document.getElementById('weatherIcon');
    
    if(!tempEl) return;
    
    // Default to Bangkok
    let lat = 13.75;
    let lon = 100.5167;
    locEl.innerText = "กรุงเทพมหานคร";
    
    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
        const data = await res.json();
        
        const temp = data.current.temperature_2m;
        const code = data.current.weather_code;
        
        tempEl.innerText = `${Math.round(temp)}°C`;
        
        // Map WMO weather codes to descriptions and lucide icons
        let desc = "Clear";
        let icon = "sun";
        
        if (code === 0) { desc = "ท้องฟ้าแจ่มใส"; icon = "sun"; }
        else if (code >= 1 && code <= 3) { desc = "มีเมฆบางส่วน"; icon = "cloud-sun"; }
        else if (code >= 45 && code <= 48) { desc = "มีหมอก"; icon = "cloud-fog"; }
        else if (code >= 51 && code <= 67) { desc = "ฝนตก"; icon = "cloud-rain"; }
        else if (code >= 71 && code <= 77) { desc = "หิมะตก"; icon = "snowflake"; }
        else if (code >= 80 && code <= 82) { desc = "ฝนตกหนัก"; icon = "cloud-rain"; }
        else if (code >= 95 && code <= 99) { desc = "พายุฝนฟ้าคะนอง"; icon = "cloud-lightning"; }
        else { desc = "มีเมฆมาก"; icon = "cloud"; }
        
        descEl.innerText = desc;
        iconEl.innerHTML = `<i data-lucide="${icon}"></i>`;
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
    } catch (err) {
        console.error("Weather error:", err);
    }
}

function clearAIImportedData() {
    const aiTransactions = transactions.filter(t => t.note === 'จากไฟล์ CSV (AI)' || t.note === 'AI Extracted Income' || t.note === 'AI Extracted Expense');
    if (aiTransactions.length === 0) {
        alert("ไม่พบข้อมูลที่เคยนำเข้าด้วย AI ครับ (No AI imported data found).");
        return;
    }
    
    if (confirm(`คุณต้องการลบข้อมูลที่นำเข้าด้วย AI จำนวน ${aiTransactions.length} รายการ ใช่หรือไม่?\n(Are you sure you want to delete ${aiTransactions.length} AI imported transactions?)`)) {
        transactions = transactions.filter(t => t.note !== 'จากไฟล์ CSV (AI)' && t.note !== 'AI Extracted Income' && t.note !== 'AI Extracted Expense');
        saveTransactions();
        updateDashboard();
        updatePlanningView();
        alert("ลบข้อมูลเรียบร้อยแล้วครับ (Deleted successfully).");
    }
}

loadWeather();

// --- Mobile Menu Toggle ---
const logoContainer = document.querySelector('.logo-container');
const navMenu = document.querySelector('.nav-menu');
if (logoContainer && navMenu) {
    logoContainer.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            navMenu.classList.toggle('mobile-open');
        }
    });
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                navMenu.classList.remove('mobile-open');
            }
        });
    });
}

// --- Lucky Colors Widget ---
const LUCKY_COLORS = {
    0: { // Sunday
        name: 'อาทิตย์',
        categories: [
            { name: 'งานปัง', colors: [{name: 'ชมพู', hex: '#f472b6'}, {name: 'โอรส', hex: '#fb923c'}] },
            { name: 'โชคดี', colors: [{name: 'เขียว', hex: '#4ade80'}, {name: 'มิ้นท์', hex: '#5eead4'}] },
            { name: 'ร่ำรวย', colors: [{name: 'ดำ', hex: '#27272a'}, {name: 'ม่วง', hex: '#a855f7'}] },
            { name: 'เมตตา', colors: [{name: 'เทา', hex: '#9ca3af'}, {name: 'ทอง', hex: '#eab308'}] },
            { name: 'ฉุดดวง', colors: [{name: 'ฟ้า', hex: '#7dd3fc'}, {name: 'น้ำเงิน', hex: '#3b82f6'}] }
        ]
    },
    1: { // Monday
        name: 'จันทร์',
        categories: [
            { name: 'งานปัง', colors: [{name: 'เขียว', hex: '#4ade80'}, {name: 'ใบเตย', hex: '#86efac'}] },
            { name: 'โชคดี', colors: [{name: 'ม่วง', hex: '#a855f7'}, {name: 'เทาดำ', hex: '#4b5563'}] },
            { name: 'ร่ำรวย', colors: [{name: 'ส้ม', hex: '#f97316'}, {name: 'น้ำตาล', hex: '#92400e'}] },
            { name: 'เมตตา', colors: [{name: 'ฟ้า', hex: '#7dd3fc'}, {name: 'น้ำเงิน', hex: '#3b82f6'}] },
            { name: 'ฉุดดวง', colors: [{name: 'แดง', hex: '#ef4444'}, {name: 'เลือดหมู', hex: '#991b1b'}] }
        ]
    },
    2: { // Tuesday
        name: 'อังคาร',
        categories: [
            { name: 'งานปัง', colors: [{name: 'ม่วง', hex: '#a855f7'}, {name: 'เทาดำ', hex: '#4b5563'}] },
            { name: 'โชคดี', colors: [{name: 'ส้ม', hex: '#f97316'}, {name: 'น้ำตาล', hex: '#92400e'}] },
            { name: 'ร่ำรวย', colors: [{name: 'ดำ', hex: '#27272a'}, {name: 'เทา', hex: '#9ca3af'}] },
            { name: 'เมตตา', colors: [{name: 'แดง', hex: '#ef4444'}, {name: 'ชมพู', hex: '#f472b6'}] },
            { name: 'ฉุดดวง', colors: [{name: 'ขาว', hex: '#f8fafc'}, {name: 'เหลือง', hex: '#fde047'}] }
        ]
    },
    3: { // Wednesday
        name: 'พุธ',
        categories: [
            { name: 'งานปัง', colors: [{name: 'ส้ม', hex: '#f97316'}, {name: 'น้ำตาล', hex: '#92400e'}] },
            { name: 'โชคดี', colors: [{name: 'เทา', hex: '#9ca3af'}, {name: 'ทอง', hex: '#eab308'}] },
            { name: 'ร่ำรวย', colors: [{name: 'ฟ้า', hex: '#7dd3fc'}, {name: 'น้ำเงิน', hex: '#3b82f6'}] },
            { name: 'เมตตา', colors: [{name: 'เหลือง', hex: '#fde047'}, {name: 'ขาว', hex: '#f8fafc'}] },
            { name: 'ฉุดดวง', colors: [{name: 'ชมพู', hex: '#f472b6'}, {name: 'บานเย็น', hex: '#d946ef'}] }
        ]
    },
    4: { // Thursday
        name: 'พฤหัสบดี',
        categories: [
            { name: 'งานปัง', colors: [{name: 'ฟ้า', hex: '#7dd3fc'}, {name: 'น้ำเงิน', hex: '#3b82f6'}] },
            { name: 'โชคดี', colors: [{name: 'แดง', hex: '#ef4444'}, {name: 'เลือดหมู', hex: '#991b1b'}] },
            { name: 'ร่ำรวย', colors: [{name: 'เหลือง', hex: '#fde047'}, {name: 'ครีม', hex: '#fef3c7'}] },
            { name: 'เมตตา', colors: [{name: 'เขียว', hex: '#4ade80'}, {name: 'ใบเตย', hex: '#86efac'}] },
            { name: 'ฉุดดวง', colors: [{name: 'ดำ', hex: '#27272a'}, {name: 'เทาดำ', hex: '#4b5563'}] }
        ]
    },
    5: { // Friday
        name: 'ศุกร์',
        categories: [
            { name: 'งานปัง', colors: [{name: 'เหลือง', hex: '#fde047'}, {name: 'ขาว', hex: '#f8fafc'}] },
            { name: 'โชคดี', colors: [{name: 'ชมพู', hex: '#f472b6'}, {name: 'บานเย็น', hex: '#d946ef'}] },
            { name: 'ร่ำรวย', colors: [{name: 'เขียว', hex: '#4ade80'}, {name: 'มิ้นท์', hex: '#5eead4'}] },
            { name: 'เมตตา', colors: [{name: 'ส้ม', hex: '#f97316'}, {name: 'น้ำตาล', hex: '#92400e'}] },
            { name: 'ฉุดดวง', colors: [{name: 'เทา', hex: '#9ca3af'}, {name: 'ทอง', hex: '#eab308'}] }
        ]
    },
    6: { // Saturday
        name: 'เสาร์',
        categories: [
            { name: 'งานปัง', colors: [{name: 'น้ำตาลเข้ม', hex: '#451a03'}, {name: 'เทา', hex: '#9ca3af'}] },
            { name: 'โชคดี', colors: [{name: 'ฟ้า', hex: '#7dd3fc'}, {name: 'น้ำเงิน', hex: '#3b82f6'}] },
            { name: 'ร่ำรวย', colors: [{name: 'แดง', hex: '#ef4444'}, {name: 'ชมพู', hex: '#f472b6'}] },
            { name: 'เมตตา', colors: [{name: 'ชมพู', hex: '#f472b6'}, {name: 'โอรส', hex: '#fb923c'}] },
            { name: 'ฉุดดวง', colors: [{name: 'เขียว', hex: '#4ade80'}, {name: 'เขียวเข้ม', hex: '#15803d'}] }
        ]
    }
};

let currentLuckyCategoryIndex = 0;

function renderLuckyColors() {
    const container = document.getElementById('luckyColorsContainer');
    const dayNameSpan = document.getElementById('luckyDayName');
    if (!container || !dayNameSpan) return;

    const today = new Date().getDay();
    const luckyData = LUCKY_COLORS[today];
    
    dayNameSpan.textContent = `(${luckyData.name})`;
    
    container.innerHTML = '';
    
    const cat = luckyData.categories[currentLuckyCategoryIndex];
    
    const catDiv = document.createElement('div');
    catDiv.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        background: transparent;
        padding: 4px;
        width: 100%;
    `;
    
    const catName = document.createElement('div');
    catName.textContent = cat.name;
    catName.style.cssText = 'font-size: 13px; color: var(--text-primary); margin-bottom: 8px; font-weight: 500; text-align: center;';
    
    const colorsWrapper = document.createElement('div');
    colorsWrapper.style.cssText = 'display: flex; gap: 8px; justify-content: center;';
    
    cat.colors.forEach(color => {
        const colorDot = document.createElement('div');
        colorDot.title = color.name;
        colorDot.style.cssText = `
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background-color: ${color.hex};
            border: 1px solid rgba(0,0,0,0.1);
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        `;
        if (color.hex === '#f8fafc' || color.hex === '#ffffff' || color.hex === '#fef3c7') {
            colorDot.style.border = '1px solid rgba(0,0,0,0.2)';
        }
        colorsWrapper.appendChild(colorDot);
    });
    
    catDiv.appendChild(catName);
    catDiv.appendChild(colorsWrapper);
    container.appendChild(catDiv);
}

function nextLuckyCategory() {
    const today = new Date().getDay();
    const categoriesLength = LUCKY_COLORS[today].categories.length;
    currentLuckyCategoryIndex = (currentLuckyCategoryIndex + 1) % categoriesLength;
    renderLuckyColors();
}

function prevLuckyCategory() {
    const today = new Date().getDay();
    const categoriesLength = LUCKY_COLORS[today].categories.length;
    currentLuckyCategoryIndex = (currentLuckyCategoryIndex - 1 + categoriesLength) % categoriesLength;
    renderLuckyColors();
}

// Render on load
renderLuckyColors();

// --- Insight Background Modal ---
function openInsightBgModal() {
    document.getElementById('insightBgModal').classList.add('active');
}

function closeInsightBgModal() {
    document.getElementById('insightBgModal').classList.remove('active');
}

function setInsightBackground(url) {
    const card = document.querySelector('.insight-card');
    if (card) {
        card.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url('${url}')`;
        card.style.backgroundSize = 'cover';
        card.style.backgroundPosition = 'center';
        card.classList.remove('bg-gradient-insight');
        // Save to local storage
        localStorage.setItem('insightBg', url);
    }
}

function removeInsightBackground() {
    const card = document.querySelector('.insight-card');
    if (card) {
        card.style.backgroundImage = '';
        card.classList.add('bg-gradient-insight');
        localStorage.removeItem('insightBg');
    }
}

function handleInsightBgUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result;
            setInsightBackground(dataUrl);
        };
        reader.readAsDataURL(file);
    }
}

// Load saved insight background on init
document.addEventListener('DOMContentLoaded', () => {
    const savedBg = localStorage.getItem('insightBg');
    if (savedBg) {
        setInsightBackground(savedBg);
    }
});
