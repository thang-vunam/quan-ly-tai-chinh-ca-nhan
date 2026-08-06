// === PERSONAL FINANCE APP V4 JS LOGIC (WITH FULL SURPLUS ALLOCATION & HDSD GUIDE) ===

// --- DEFAULT INITIAL STATE (CLEAN & READY FOR REAL TRANSACTIONS) ---
const DEFAULT_STATE = {
    userProfile: {
        name: 'Tài Chính Cá Nhân',
        avatar: '' // Base64 data URL
    },
    accounts: [
        { id: 'acc-1', name: 'Tài khoản VCB', type: 'Tài khoản thanh toán', initialBalance: 0, note: 'Tài khoản nhận lương chính' },
        { id: 'acc-2', name: 'Tài khoản Chứng khoán', type: 'Tài khoản đầu tư', initialBalance: 0, note: 'Tích sản cổ phiếu VN30' },
        { id: 'acc-3', name: 'Thẻ tín dụng', type: 'Thẻ tín dụng', initialBalance: 0, note: 'Hạn mức 50 triệu' },
        { id: 'acc-4', name: 'Ví MoMo / ViettelPay', type: 'Ví điện tử', initialBalance: 0, note: 'Thanh toán hóa đơn nhỏ' },
        { id: 'acc-5', name: 'Tiền mặt', type: 'Tiền mặt', initialBalance: 0, note: 'Chi tiêu hàng ngày' }
    ],
    categories: [
        { name: 'Tiền nhà / Điện nước', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Ăn uống & Thực phẩm', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Đi lại & Xe cộ', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Y tế & Sức khỏe', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Hiếu hỷ & Gia đình', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Giải trí & Thể thao', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Mua sắm & Cá nhân', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Ăn tiệm & Cà phê', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Du lịch & Dã ngoại', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Học tập & Phát triển', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Quỹ Dự Phòng', type: 'expense', ruleGroup: 'Tiết kiệm & Đầu tư (20%)' },
        { name: 'Đầu tư Chứng khoán', type: 'expense', ruleGroup: 'Tiết kiệm & Đầu tư (20%)' },
        { name: 'Bảo hiểm & Tích lũy', type: 'expense', ruleGroup: 'Tiết kiệm & Đầu tư (20%)' },
        { name: 'Lương Cố Định', type: 'income', ruleGroup: 'Thu Nhập' },
        { name: 'Nghề Tay Trái / Freelance', type: 'income', ruleGroup: 'Thu Nhập' },
        { name: 'Đầu Tư / Cổ Tức', type: 'income', ruleGroup: 'Thu Nhập' },
        { name: 'Thưởng / Khác', type: 'income', ruleGroup: 'Thu Nhập' }
    ],
    transactions: [], // CLEARED ALL SAMPLE TRANSACTIONS
    goals: [
        { id: 'g-1', title: 'Quỹ dự phòng khẩn cấp (6 tháng)', target: 100000000, current: 0, deadline: '12/2026', note: 'Gửi tiết kiệm trực tuyến' },
        { id: 'g-2', title: 'Đầu tư tích sản chứng khoán', target: 200000000, current: 0, deadline: '12/2027', note: 'Danh mục VN30' },
        { id: 'g-3', title: 'Mua xe ô tô mới', target: 500000000, current: 0, deadline: '06/2028', note: 'Tích lũy & đầu tư an toàn' }
    ]
};

// State Object
let state = loadState();

function loadState() {
    try {
        const saved = localStorage.getItem('personal_finance_app_v4');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!parsed.userProfile) parsed.userProfile = { name: 'Tài Chính Cá Nhân', avatar: '' };
            if (!parsed.goals) parsed.goals = [];
            return parsed;
        }
    } catch(e) {
        console.error("LocalStorage load error:", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
    try {
        localStorage.setItem('personal_finance_app_v4', JSON.stringify(state));
    } catch(e) {
        console.error("LocalStorage save error:", e);
    }
    renderApp();
}

// Global Variables
let chartInstance = null;
let tempAvatarBase64 = '';
let currentMonthNetSurplus = 0;

// Helpers
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

function safeCreateIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons(); } catch(e) {}
    }
}

// === DOM LOADED ===
document.addEventListener('DOMContentLoaded', () => {
    try {
        initNavigation();
        initModals();
        initFilters();
        renderApp();
    } catch(err) {
        console.error("Initialization error:", err);
    }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => { try { renderApp(); } catch(e) {} }, 100);
}

// --- NAVIGATION ---
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const tabId = item.getAttribute('data-tab');
            document.querySelectorAll('.tab-page').forEach(page => page.classList.remove('active'));
            const targetPage = document.getElementById(tabId);
            if (targetPage) targetPage.classList.add('active');

            renderApp();
        });
    });
}

// --- FILTERS ---
function initFilters() {
    const monthSel = document.getElementById('selectMonth');
    const yearSel = document.getElementById('selectYear');
    if (monthSel) monthSel.addEventListener('change', renderDashboard);
    if (yearSel) yearSel.addEventListener('change', renderDashboard);
}

// --- MAIN RENDER FUNCTION ---
function renderApp() {
    renderUserProfile();
    renderDashboard();
    renderTransactions();
    renderAccounts();
    renderGoals();
    populateAddTxCategorySelect();
    safeCreateIcons();
}

// === USER PROFILE & AVATAR RENDER ===
function renderUserProfile() {
    const headerName = document.getElementById('headerUserName');
    const headerAvatar = document.getElementById('headerAvatarContainer');

    if (headerName && state.userProfile) {
        headerName.textContent = state.userProfile.name || 'Tài Chính Cá Nhân';
    }

    if (headerAvatar && state.userProfile) {
        if (state.userProfile.avatar) {
            headerAvatar.innerHTML = `<img src="${state.userProfile.avatar}" alt="Avatar">`;
        } else {
            headerAvatar.innerHTML = `<i data-lucide="user"></i>`;
        }
    }
}

// === DASHBOARD LOGIC ===
function renderDashboard() {
    const selectedMonth = document.getElementById('selectMonth')?.value || 'all';
    const selectedYear = parseInt(document.getElementById('selectYear')?.value || '2026');

    // Filter transactions
    const filteredTx = state.transactions.filter(tx => {
        const d = new Date(tx.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        
        if (y !== selectedYear) return false;
        if (selectedMonth !== 'all' && m !== parseInt(selectedMonth)) return false;
        return true;
    });

    const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = filteredTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpense;
    currentMonthNetSurplus = netSavings;

    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    if (document.getElementById('kpiIncome')) document.getElementById('kpiIncome').textContent = formatVND(totalIncome);
    if (document.getElementById('kpiExpense')) document.getElementById('kpiExpense').textContent = formatVND(totalExpense);
    if (document.getElementById('kpiNet')) document.getElementById('kpiNet').textContent = formatVND(netSavings);
    if (document.getElementById('kpiRate')) document.getElementById('kpiRate').textContent = savingsRate + '%';

    // SMART SURPLUS ALLOCATION CARD DISPLAY
    const surplusCard = document.getElementById('surplusAllocationCard');
    const cardSurplusVal = document.getElementById('cardSurplusValue');
    if (surplusCard && cardSurplusVal) {
        if (netSavings > 0) {
            surplusCard.style.display = 'block';
            cardSurplusVal.textContent = formatVND(netSavings);
        } else {
            surplusCard.style.display = 'none';
        }
    }

    // 50/30/20 Rule Calculations
    const expenseNeeds = filteredTx.filter(t => t.type === 'expense' && t.ruleGroup.includes('Thiết yếu')).reduce((s, t) => s + t.amount, 0);
    const expenseWants = filteredTx.filter(t => t.type === 'expense' && t.ruleGroup.includes('Mong muốn')).reduce((s, t) => s + t.amount, 0);
    const expenseSavings = filteredTx.filter(t => t.type === 'expense' && t.ruleGroup.includes('Tiết kiệm')).reduce((s, t) => s + t.amount, 0);

    const budgetNeeds = totalIncome * 0.5;
    const budgetWants = totalIncome * 0.3;
    const budgetSavings = totalIncome * 0.2;

    if (document.getElementById('ruleNeedsAmount')) document.getElementById('ruleNeedsAmount').textContent = `${formatVND(expenseNeeds)} / ${formatVND(budgetNeeds)}`;
    if (document.getElementById('ruleWantsAmount')) document.getElementById('ruleWantsAmount').textContent = `${formatVND(expenseWants)} / ${formatVND(budgetWants)}`;
    if (document.getElementById('ruleSavingsAmount')) document.getElementById('ruleSavingsAmount').textContent = `${formatVND(expenseSavings)} / ${formatVND(budgetSavings)}`;

    if (document.getElementById('ruleNeedsBar')) document.getElementById('ruleNeedsBar').style.width = Math.min(100, budgetNeeds > 0 ? (expenseNeeds / budgetNeeds) * 100 : 0) + '%';
    if (document.getElementById('ruleWantsBar')) document.getElementById('ruleWantsBar').style.width = Math.min(100, budgetWants > 0 ? (expenseWants / budgetWants) * 100 : 0) + '%';
    if (document.getElementById('ruleSavingsBar')) document.getElementById('ruleSavingsBar').style.width = Math.min(100, budgetSavings > 0 ? (expenseSavings / budgetSavings) * 100 : 0) + '%';

    renderChart(selectedYear);
}

// === CHART.JS BAR CHART ===
function renderChart(year) {
    const canvas = document.getElementById('incomeExpenseChart');
    if (!canvas || !window.Chart) return;
    
    const ctx = canvas.getContext('2d');
    
    const monthlyIncome = Array(12).fill(0);
    const monthlyExpense = Array(12).fill(0);

    state.transactions.forEach(tx => {
        const d = new Date(tx.date);
        if (d.getFullYear() === year) {
            const m = d.getMonth();
            if (tx.type === 'income') monthlyIncome[m] += tx.amount;
            else monthlyExpense[m] += tx.amount;
        }
    });

    if (chartInstance) chartInstance.destroy();

    try {
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
                datasets: [
                    { label: 'Thu Nhập', data: monthlyIncome, backgroundColor: '#10B981', borderRadius: 6 },
                    { label: 'Chi Tiêu', data: monthlyExpense, backgroundColor: '#EF4444', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#94A3B8', font: { family: 'Plus Jakarta Sans' } } } },
                scales: {
                    x: { ticks: { color: '#94A3B8' }, grid: { display: false } },
                    y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                }
            }
        });
    } catch(e) {}
}

// === TRANSACTIONS LOG ===
function renderTransactions() {
    const container = document.getElementById('transactionList');
    if (!container) return;
    container.innerHTML = '';

    const sorted = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sorted.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94A3B8; padding: 28px 12px; font-size: 0.9rem;">Chưa có giao dịch nào. Bấm nút <b>+</b> bên dưới để bắt đầu nhập liệu!</div>';
        return;
    }

    sorted.forEach(tx => {
        const acc = state.accounts.find(a => a.id === tx.accountId) || { name: 'Ví' };
        const iconName = tx.type === 'income' ? 'arrow-down-left' : 'arrow-up-right';
        const colorClass = tx.type === 'income' ? 'income' : 'expense';
        const sign = tx.type === 'income' ? '+' : '-';

        const item = document.createElement('div');
        item.className = 'tx-item';
        item.innerHTML = `
            <div class="tx-icon-box ${colorClass}">
                <i data-lucide="${iconName}"></i>
            </div>
            <div class="tx-details">
                <div class="tx-cat-name">${tx.category}</div>
                <div class="tx-meta">${tx.date} • ${acc.name} • <span style="opacity: 0.7">${tx.note || ''}</span></div>
            </div>
            <div class="tx-right">
                <div class="tx-amount ${colorClass}">${sign}${formatVND(tx.amount)}</div>
                <div class="tx-actions">
                    <button class="btn-icon-sub edit-tx-btn" data-id="${tx.id}" title="Sửa"><i data-lucide="edit-2"></i> Sửa</button>
                    <button class="btn-icon-sub danger delete-tx-btn" data-id="${tx.id}" title="Xóa"><i data-lucide="trash-2"></i> Xóa</button>
                </div>
            </div>
        `;
        container.appendChild(item);
    });

    container.querySelectorAll('.delete-tx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const txId = btn.getAttribute('data-id');
            deleteTransaction(txId);
        });
    });

    container.querySelectorAll('.edit-tx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const txId = btn.getAttribute('data-id');
            openEditTransactionModal(txId);
        });
    });
}

function deleteTransaction(txId) {
    if (confirm('Bạn có chắc chắn muốn XÓA giao dịch này không?')) {
        state.transactions = state.transactions.filter(t => t.id !== txId);
        saveState();
    }
}

function openEditTransactionModal(txId) {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx) return;

    document.getElementById('editingTxId').value = tx.id;
    document.getElementById('modalTxTitle').innerHTML = '<i data-lucide="edit-3"></i> Chỉnh Sửa Giao Dịch';
    document.getElementById('btnSubmitTxForm').textContent = 'Lưu Thay Đổi';

    if (tx.type === 'income') {
        document.getElementById('typeIncome').checked = true;
    } else {
        document.getElementById('typeExpense').checked = true;
    }

    populateAddTxCategorySelect();

    document.getElementById('txAmount').value = tx.amount;
    document.getElementById('txCategory').value = tx.category;
    document.getElementById('txRuleGroup').value = tx.ruleGroup;
    document.getElementById('txAccount').value = tx.accountId;
    document.getElementById('txDate').value = tx.date;
    document.getElementById('txNote').value = tx.note || '';

    const modalAddTx = document.getElementById('modalAddTx');
    if (modalAddTx) modalAddTx.classList.add('active');
    safeCreateIcons();
}

// === ACCOUNTS & BALANCES ===
function renderAccounts() {
    const container = document.getElementById('accountsList');
    if (!container) return;
    container.innerHTML = '';

    let grandTotalAsset = 0;

    state.accounts.forEach(acc => {
        const totalIncome = state.transactions.filter(t => t.accountId === acc.id && t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpense = state.transactions.filter(t => t.accountId === acc.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);

        let currentBalance = 0;
        if (acc.type === 'Thẻ tín dụng') {
            currentBalance = (acc.initialBalance || 0) - totalExpense + totalIncome;
        } else {
            currentBalance = (acc.initialBalance || 0) + totalIncome - totalExpense;
        }

        grandTotalAsset += currentBalance;
        const isNegative = currentBalance < 0;

        const card = document.createElement('div');
        card.className = 'account-card';
        card.innerHTML = `
            <div class="account-info">
                <h4>${acc.name}</h4>
                <div class="account-type">${acc.type} • Đầu kỳ: ${formatVND(acc.initialBalance || 0)}</div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">Thu: +${formatVND(totalIncome)} | Chi: -${formatVND(totalExpense)}</div>
            </div>
            <div class="account-balance ${isNegative ? 'negative' : ''}">
                ${formatVND(currentBalance)}
            </div>
        `;
        container.appendChild(card);
    });

    if (document.getElementById('totalAssetValue')) {
        document.getElementById('totalAssetValue').textContent = formatVND(grandTotalAsset);
    }
}

// === GOALS LOGIC (WITH SURPLUS ALLOCATION & FULL EDIT/DELETE) ===
function renderGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    container.innerHTML = '';

    if (!state.goals || state.goals.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94A3B8; padding: 24px; font-size: 0.9rem;">Chưa có mục tiêu tài chính nào. Bấm nút <b>Tạo Mục Tiêu</b> để thêm mới!</div>';
        return;
    }

    state.goals.forEach(goal => {
        const percent = goal.target > 0 ? ((goal.current / goal.target) * 100).toFixed(1) : 0;

        const card = document.createElement('div');
        card.className = 'goal-card';
        card.innerHTML = `
            <div class="goal-header">
                <span class="goal-title">${goal.title}</span>
                <span class="goal-percent">${percent}%</span>
            </div>
            <div class="rule-title-row" style="margin-top: 4px;">
                <span style="font-size: 0.78rem; color: #94A3B8;">Hạn: ${goal.deadline} • <span style="opacity: 0.75">${goal.note || ''}</span></span>
                <span style="font-size: 0.82rem; font-weight: 600;">${formatVND(goal.current)} / ${formatVND(goal.target)}</span>
            </div>
            <div class="progress-bar-bg" style="margin-top: 8px;">
                <div class="progress-bar-fill savings" style="width: ${Math.min(100, percent)}%"></div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
                <button class="btn-icon-sub edit-goal-btn" data-id="${goal.id}" title="Sửa mục tiêu"><i data-lucide="edit-2"></i> Sửa</button>
                <button class="btn-icon-sub danger delete-goal-btn" data-id="${goal.id}" title="Xóa mục tiêu"><i data-lucide="trash-2"></i> Xóa</button>
            </div>
        `;
        container.appendChild(card);
    });

    container.querySelectorAll('.delete-goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const goalId = btn.getAttribute('data-id');
            deleteGoal(goalId);
        });
    });

    container.querySelectorAll('.edit-goal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const goalId = btn.getAttribute('data-id');
            openEditGoalModal(goalId);
        });
    });
}

function deleteGoal(goalId) {
    if (confirm('Bạn có chắc chắn muốn XÓA mục tiêu này không?')) {
        state.goals = state.goals.filter(g => g.id !== goalId);
        saveState();
    }
}

function openEditGoalModal(goalId) {
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal) return;

    document.getElementById('editingGoalId').value = goal.id;
    document.getElementById('modalGoalTitle').innerHTML = '<i data-lucide="edit-3"></i> Chỉnh Sửa Mục Tiêu';
    document.getElementById('btnSubmitGoalForm').textContent = 'Lưu Thay Đổi';

    document.getElementById('goalTitle').value = goal.title;
    document.getElementById('goalTarget').value = goal.target;
    document.getElementById('goalCurrent').value = goal.current;
    document.getElementById('goalDeadline').value = goal.deadline;
    document.getElementById('goalNote').value = goal.note || '';

    const modalGoal = document.getElementById('modalGoal');
    if (modalGoal) modalGoal.classList.add('active');
    safeCreateIcons();
}

// === MODALS & FORM HANDLING ===
function initModals() {
    // HDSD USER GUIDE MODAL
    const modalUserGuide = document.getElementById('modalUserGuide');
    const btnOpenGuideModal = document.getElementById('btnOpenGuideModal');
    const closeGuideModal = document.getElementById('closeGuideModal');
    const btnCloseGuideBottom = document.getElementById('btnCloseGuideBottom');

    if (btnOpenGuideModal) {
        btnOpenGuideModal.addEventListener('click', () => {
            if (modalUserGuide) modalUserGuide.classList.add('active');
            safeCreateIcons();
        });
    }

    [closeGuideModal, btnCloseGuideBottom].forEach(btn => {
        if (btn) btn.addEventListener('click', () => modalUserGuide.classList.remove('active'));
    });

    // PROFILE & AVATAR MODAL
    const modalProfile = document.getElementById('modalProfile');
    const btnOpenProfileModal = document.getElementById('btnOpenProfileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const btnTriggerAvatarUpload = document.getElementById('btnTriggerAvatarUpload');
    const inputAvatarFile = document.getElementById('inputAvatarFile');
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    const inputUserName = document.getElementById('inputUserName');
    const profileAvatarPreview = document.getElementById('profileAvatarPreview');

    if (btnOpenProfileModal) {
        btnOpenProfileModal.addEventListener('click', () => {
            if (inputUserName) inputUserName.value = state.userProfile.name || 'Tài Chính Cá Nhân';
            tempAvatarBase64 = state.userProfile.avatar || '';
            if (profileAvatarPreview) {
                if (tempAvatarBase64) {
                    profileAvatarPreview.innerHTML = `<img src="${tempAvatarBase64}" alt="Avatar">`;
                } else {
                    profileAvatarPreview.innerHTML = `<i data-lucide="user"></i>`;
                }
            }
            if (modalProfile) modalProfile.classList.add('active');
            safeCreateIcons();
        });
    }

    if (closeProfileModal) closeProfileModal.addEventListener('click', () => modalProfile.classList.remove('active'));

    if (btnTriggerAvatarUpload && inputAvatarFile) {
        btnTriggerAvatarUpload.addEventListener('click', () => inputAvatarFile.click());
        inputAvatarFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    tempAvatarBase64 = evt.target.result;
                    if (profileAvatarPreview) {
                        profileAvatarPreview.innerHTML = `<img src="${tempAvatarBase64}" alt="Avatar">`;
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnSaveProfile) {
        btnSaveProfile.addEventListener('click', () => {
            if (inputUserName && inputUserName.value.trim()) {
                state.userProfile.name = inputUserName.value.trim();
            }
            state.userProfile.avatar = tempAvatarBase64;
            saveState();
            if (modalProfile) modalProfile.classList.remove('active');
        });
    }

    // ADD / EDIT TRANSACTION MODAL
    const modalAddTx = document.getElementById('modalAddTx');
    const fabAddTx = document.getElementById('fabAddTx');
    const btnQuickAddTop = document.getElementById('btnQuickAddTop');
    const btnOpenAddModal = document.getElementById('btnOpenAddModal');
    const closeAddTxModal = document.getElementById('closeAddTxModal');

    const openAddTx = () => {
        document.getElementById('editingTxId').value = '';
        document.getElementById('modalTxTitle').innerHTML = '<i data-lucide="plus-circle"></i> Thêm Giao Dịch Mới';
        document.getElementById('btnSubmitTxForm').textContent = 'Lưu Giao Dịch';
        document.getElementById('formAddTx').reset();
        if (document.getElementById('txDate')) document.getElementById('txDate').valueAsDate = new Date();
        populateAddTxCategorySelect();
        if (modalAddTx) modalAddTx.classList.add('active');
        safeCreateIcons();
    };

    [fabAddTx, btnQuickAddTop, btnOpenAddModal].forEach(btn => {
        if (btn) btn.addEventListener('click', openAddTx);
    });

    if (closeAddTxModal) closeAddTxModal.addEventListener('click', () => modalAddTx.classList.remove('active'));

    document.querySelectorAll('input[name="txType"]').forEach(radio => {
        radio.addEventListener('change', populateAddTxCategorySelect);
    });

    const txCatElem = document.getElementById('txCategory');
    if (txCatElem) {
        txCatElem.addEventListener('change', (e) => {
            const catName = e.target.value;
            const catObj = state.categories.find(c => c.name === catName);
            if (catObj && document.getElementById('txRuleGroup')) {
                document.getElementById('txRuleGroup').value = catObj.ruleGroup;
            }
        });
    }

    const formAdd = document.getElementById('formAddTx');
    if (formAdd) {
        formAdd.addEventListener('submit', (e) => {
            e.preventDefault();
            const editingId = document.getElementById('editingTxId').value;
            const type = document.querySelector('input[name="txType"]:checked').value;
            const amount = parseFloat(document.getElementById('txAmount').value);
            const category = document.getElementById('txCategory').value;
            const ruleGroup = document.getElementById('txRuleGroup').value;
            const accountId = document.getElementById('txAccount').value;
            const date = document.getElementById('txDate').value;
            const note = document.getElementById('txNote').value;

            if (editingId) {
                const index = state.transactions.findIndex(t => t.id === editingId);
                if (index !== -1) {
                    state.transactions[index] = {
                        id: editingId, type, amount, category, ruleGroup, accountId, date, note
                    };
                }
            } else {
                const newTx = {
                    id: 'tx-' + Date.now(),
                    type, amount, category, ruleGroup, accountId, date, note
                };
                state.transactions.push(newTx);
            }

            saveState();
            if (modalAddTx) modalAddTx.classList.remove('active');
            formAdd.reset();
        });
    }

    // ADVANCED INITIAL BALANCE & ACCOUNT MANAGEMENT MODAL
    const modalInitial = document.getElementById('modalInitialBalance');
    const btnEditInitial = document.getElementById('btnEditInitialBalance');
    const closeInitial = document.getElementById('closeInitialModal');
    const btnSaveInitial = document.getElementById('btnSaveInitialBalances');
    const btnAddAccountInModal = document.getElementById('btnAddAccountInModal');

    if (btnEditInitial) {
        btnEditInitial.addEventListener('click', () => {
            renderInitialAccountModalForm();
            if (modalInitial) modalInitial.classList.add('active');
            safeCreateIcons();
        });
    }

    if (closeInitial) closeInitial.addEventListener('click', () => modalInitial.classList.remove('active'));

    if (btnAddAccountInModal) {
        btnAddAccountInModal.addEventListener('click', () => {
            const newAcc = {
                id: 'acc-' + Date.now(),
                name: 'Ví / Ngân Hàng Mới',
                type: 'Tài khoản thanh toán',
                initialBalance: 0,
                note: ''
            };
            state.accounts.push(newAcc);
            renderInitialAccountModalForm();
            safeCreateIcons();
        });
    }

    if (btnSaveInitial) {
        const handleSaveAccounts = (e) => {
            if (e) e.preventDefault();

            state.accounts.forEach(acc => {
                const nameInput = document.querySelector(`.acc-name-input[data-acc-id="${acc.id}"]`);
                const typeInput = document.querySelector(`.acc-type-input[data-acc-id="${acc.id}"]`);
                const initInput = document.querySelector(`.initial-acc-input[data-acc-id="${acc.id}"]`);
                
                if (nameInput && nameInput.value.trim()) {
                    acc.name = nameInput.value.trim();
                }
                if (typeInput) {
                    acc.type = typeInput.value;
                }
                if (initInput) {
                    const rawVal = initInput.value;
                    acc.initialBalance = rawVal === '' ? 0 : parseFloat(rawVal);
                }
            });

            saveState();
            if (modalInitial) modalInitial.classList.remove('active');
            alert('✅ Đã cập nhật ví và số dư đầu kỳ thành công!');
        };

        btnSaveInitial.addEventListener('click', handleSaveAccounts);
    }

    // FINANCIAL GOAL MODAL & FORMS
    const modalGoal = document.getElementById('modalGoal');
    const btnAddGoalModal = document.getElementById('btnAddGoalModal');
    const closeGoalModal = document.getElementById('closeGoalModal');
    const formGoal = document.getElementById('formGoal');

    if (btnAddGoalModal) {
        btnAddGoalModal.addEventListener('click', () => {
            document.getElementById('editingGoalId').value = '';
            document.getElementById('modalGoalTitle').innerHTML = '<i data-lucide="target"></i> Tạo Mục Tiêu Tài Chính Mới';
            document.getElementById('btnSubmitGoalForm').textContent = 'Lưu Mục Tiêu';
            formGoal.reset();
            if (modalGoal) modalGoal.classList.add('active');
            safeCreateIcons();
        });
    }

    if (closeGoalModal) closeGoalModal.addEventListener('click', () => modalGoal.classList.remove('active'));

    if (formGoal) {
        formGoal.addEventListener('submit', (e) => {
            e.preventDefault();
            const editingId = document.getElementById('editingGoalId').value;
            const title = document.getElementById('goalTitle').value.trim();
            const target = parseFloat(document.getElementById('goalTarget').value) || 0;
            const current = parseFloat(document.getElementById('goalCurrent').value) || 0;
            const deadline = document.getElementById('goalDeadline').value.trim();
            const note = document.getElementById('goalNote').value.trim();

            if (editingId) {
                const index = state.goals.findIndex(g => g.id === editingId);
                if (index !== -1) {
                    state.goals[index] = { id: editingId, title, target, current, deadline, note };
                }
            } else {
                const newGoal = {
                    id: 'g-' + Date.now(),
                    title, target, current, deadline, note
                };
                state.goals.push(newGoal);
            }

            saveState();
            if (modalGoal) modalGoal.classList.remove('active');
            formGoal.reset();
        });
    }

    // SMART SURPLUS ALLOCATION MODAL
    const modalAllocateSurplus = document.getElementById('modalAllocateSurplus');
    const btnOpenAllocateSurplusModal = document.getElementById('btnOpenAllocateSurplusModal');
    const closeAllocateSurplusModal = document.getElementById('closeAllocateSurplusModal');
    const btnConfirmSurplusAllocation = document.getElementById('btnConfirmSurplusAllocation');

    if (btnOpenAllocateSurplusModal) {
        btnOpenAllocateSurplusModal.addEventListener('click', () => {
            renderSurplusAllocationForm();
            if (modalAllocateSurplus) modalAllocateSurplus.classList.add('active');
            safeCreateIcons();
        });
    }

    if (closeAllocateSurplusModal) {
        closeAllocateSurplusModal.addEventListener('click', () => modalAllocateSurplus.classList.remove('active'));
    }

    if (btnConfirmSurplusAllocation) {
        btnConfirmSurplusAllocation.addEventListener('click', () => {
            state.goals.forEach(goal => {
                const allocInput = document.querySelector(`.alloc-goal-input[data-goal-id="${goal.id}"]`);
                if (allocInput) {
                    const allocVal = parseFloat(allocInput.value) || 0;
                    goal.current = (goal.current || 0) + allocVal;
                }
            });

            saveState();
            if (modalAllocateSurplus) modalAllocateSurplus.classList.remove('active');
            alert('🎉 Đã phân bổ thặng dư ròng vào các Mục Tiêu Tài Chính thành công!');
        });
    }

    // Export Data Backup
    const btnExp = document.getElementById('btnExportData');
    if (btnExp) {
        btnExp.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `Sao_Luu_Tai_Chinh_${new Date().toISOString().slice(0,10)}.json`);
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();
        });
    }

    // Reset Data Button
    const btnReset = document.getElementById('btnResetData');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Bạn có muốn đặt lại dữ liệu về mặc định ban đầu không?')) {
                state = JSON.parse(JSON.stringify(DEFAULT_STATE));
                saveState();
            }
        });
    }
}

// Render dynamic goal allocation inputs inside Surplus Modal
function renderSurplusAllocationForm() {
    const totalElem = document.getElementById('allocSurplusTotal');
    const remElem = document.getElementById('allocSurplusRemaining');
    const container = document.getElementById('allocSurplusGoalList');
    if (!container) return;

    if (totalElem) totalElem.textContent = formatVND(currentMonthNetSurplus);
    if (remElem) remElem.textContent = formatVND(currentMonthNetSurplus);

    container.innerHTML = '';

    if (!state.goals || state.goals.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94A3B8; padding: 20px;">Bạn chưa tạo Mục tiêu nào. Hãy vào tab Mục Tiêu tạo mục tiêu trước!</div>';
        return;
    }

    state.goals.forEach(goal => {
        const item = document.createElement('div');
        item.style.cssText = 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; margin-bottom: 12px;';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: 600; font-size: 0.9rem;">${goal.title}</span>
                <span style="font-size: 0.78rem; color: #3B82F6;">Đã tích: ${formatVND(goal.current)} / ${formatVND(goal.target)}</span>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label>Số tiền phân bổ tháng này (VNĐ)</label>
                <input type="number" class="custom-input alloc-goal-input" data-goal-id="${goal.id}" placeholder="0" min="0" step="100000">
            </div>
        `;
        container.appendChild(item);
    });

    // Real-time remaining surplus calculation
    container.querySelectorAll('.alloc-goal-input').forEach(input => {
        input.addEventListener('input', updateRemainingSurplusCalc);
    });
}

function updateRemainingSurplusCalc() {
    const remElem = document.getElementById('allocSurplusRemaining');
    if (!remElem) return;

    let allocatedSum = 0;
    document.querySelectorAll('.alloc-goal-input').forEach(input => {
        allocatedSum += parseFloat(input.value) || 0;
    });

    const rem = currentMonthNetSurplus - allocatedSum;
    remElem.textContent = formatVND(rem);
    if (rem < 0) {
        remElem.style.color = '#EF4444';
    } else {
        remElem.style.color = '#F59E0B';
    }
}

// Render dynamic forms inside Account Edit Modal
function renderInitialAccountModalForm() {
    const formList = document.getElementById('initialBalanceFormList');
    if (!formList) return;
    formList.innerHTML = '';

    const types = ['Tài khoản thanh toán', 'Ví điện tử', 'Thẻ tín dụng', 'Tài khoản đầu tư', 'Tiền mặt'];

    state.accounts.forEach(acc => {
        const item = document.createElement('div');
        item.style.cssText = 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; margin-bottom: 12px; position: relative;';
        
        let typeOpts = types.map(t => `<option value="${t}" ${t === acc.type ? 'selected' : ''}>${t}</option>`).join('');

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <label style="font-weight: 600; color: #3B82F6; font-size: 0.85rem;">Tên Ngân Hàng / Ví</label>
                <button type="button" class="btn-icon-sub danger delete-acc-btn" data-acc-id="${acc.id}" title="Xóa ví này"><i data-lucide="trash-2"></i> Xóa ví</button>
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <input type="text" class="custom-input acc-name-input" data-acc-id="${acc.id}" value="${acc.name}" placeholder="Ví dụ: Techcombank, VCB...">
            </div>
            <div class="form-group" style="margin-bottom: 8px;">
                <label>Loại Tài Khoản</label>
                <select class="custom-select acc-type-input" data-acc-id="${acc.id}">
                    ${typeOpts}
                </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label>Số Dư Đầu Kỳ (VNĐ)</label>
                <input type="number" class="custom-input initial-acc-input" data-acc-id="${acc.id}" value="${acc.initialBalance}" placeholder="0">
            </div>
        `;
        formList.appendChild(item);
    });

    formList.querySelectorAll('.delete-acc-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const accId = btn.getAttribute('data-acc-id');
            if (state.accounts.length <= 1) {
                alert('⚠️ Bạn phải giữ ít nhất 1 ví tài khoản!');
                return;
            }
            if (confirm('Bạn có chắc muốn xóa ví này không? Các giao dịch gắn với ví này có thể cần phân bổ lại.')) {
                state.accounts = state.accounts.filter(a => a.id !== accId);
                renderInitialAccountModalForm();
                safeCreateIcons();
            }
        });
    });
}

function populateAddTxCategorySelect() {
    const radioType = document.querySelector('input[name="txType"]:checked');
    if (!radioType) return;
    const selectedType = radioType.value;

    const catSelect = document.getElementById('txCategory');
    const accSelect = document.getElementById('txAccount');
    if (!catSelect || !accSelect) return;

    catSelect.innerHTML = '';
    const filteredCats = state.categories.filter(c => c.type === selectedType);

    filteredCats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        catSelect.appendChild(opt);
    });

    if (filteredCats.length > 0 && document.getElementById('txRuleGroup')) {
        document.getElementById('txRuleGroup').value = filteredCats[0].ruleGroup;
    }

    accSelect.innerHTML = '';
    state.accounts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        accSelect.appendChild(opt);
    });
}
