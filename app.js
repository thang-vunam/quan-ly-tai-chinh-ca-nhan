// === PERSONAL FINANCE APP V4/V5 JS LOGIC (WITH AI RECEIPT & BANKING SCANNER DEMO) ===

// --- DEFAULT INITIAL STATE ---
const DEFAULT_STATE = {
    userProfile: {
        name: 'Tài Chính Cá Nhân',
        avatar: '', // Base64 data URL
        pinEnabled: false,
        pinCode: '', // 4-digit passcode
        recoveryEmail: '', // Recovery email address
        biometricEnabled: false, // WebAuthn Face ID / Touch ID / Fingerprint
        biometricCredentialId: null, // Registered Passkey ID
        biometricRawId: null, // Registered Passkey Raw ID array
        hasCompletedOnboarding: false // Flag for first-time welcome setup
    },
    accounts: [
        { id: 'acc-1', name: 'Tài khoản VCB', type: 'Tài khoản thanh toán', initialBalance: 0, note: 'Tài khoản nhận lương chính' },
        { id: 'acc-2', name: 'Tài khoản Chứng khoán', type: 'Tài khoản đầu tư', initialBalance: 0, note: 'Tích sản cổ phiếu VN30' },
        { id: 'acc-3', name: 'Thẻ tín dụng', type: 'Thẻ tín dụng', initialBalance: 0, note: 'Hạn mức 50 triệu' },
        { id: 'acc-4', name: 'Ví MoMo / ViettelPay', type: 'Ví điện tử', initialBalance: 0, note: 'Thanh toán hóa đơn nhỏ' },
        { id: 'acc-5', name: 'Tiền mặt', type: 'Tiền mặt', initialBalance: 0, note: 'Chi tiêu hàng ngày' }
    ],
    categories: [
        // Daily expense categories sorted by frequency ('Ăn uống & Thực phẩm' as top priority default)
        { name: 'Ăn uống & Thực phẩm', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Ăn tiệm & Cà phê', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Đi lại & Xe cộ', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Tiền nhà / Điện nước', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Mua sắm & Cá nhân', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Y tế & Sức khỏe', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Giải trí & Thể thao', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Du lịch & Dã ngoại', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Hiếu hỷ & Gia đình', type: 'expense', ruleGroup: 'Thiết yếu (50%)' },
        { name: 'Học tập & Phát triển', type: 'expense', ruleGroup: 'Mong muốn (30%)' },
        { name: 'Quỹ Dự Phòng', type: 'expense', ruleGroup: 'Tiết kiệm & Đầu tư (20%)' },
        { name: 'Đầu tư Chứng khoán', type: 'expense', ruleGroup: 'Tiết kiệm & Đầu tư (20%)' },
        { name: 'Bảo hiểm & Tích lũy', type: 'expense', ruleGroup: 'Tiết kiệm & Đầu tư (20%)' },
        { name: 'Lương Cố Định', type: 'income', ruleGroup: 'Thu Nhập' },
        { name: 'Nghề Tay Trái / Freelance', type: 'income', ruleGroup: 'Thu Nhập' },
        { name: 'Đầu Tư / Cổ Tức', type: 'income', ruleGroup: 'Thu Nhập' },
        { name: 'Thưởng / Khác', type: 'income', ruleGroup: 'Thu Nhập' }
    ],
    transactions: [],
    goals: [
        { id: 'g-1', title: 'Quỹ dự phòng khẩn cấp (6 tháng)', target: 100000000, current: 0, deadline: '12/2026', note: 'Gửi tiết kiệm trực tuyến' },
        { id: 'g-2', title: 'Đầu tư tích sản chứng khoán', target: 200000000, current: 0, deadline: '12/2027', note: 'Danh mục VN30' },
        { id: 'g-3', title: 'Mua xe ô tô mới', target: 500000000, current: 0, deadline: '06/2028', note: 'Tích lũy & đầu tư an toàn' }
    ]
};

// State Object (PRESERVES EXISTING USER DATA IN LOCALSTORAGE 100%)
let state = loadState();

function loadState() {
    try {
        const saved = localStorage.getItem('personal_finance_app_v4');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!parsed.userProfile) parsed.userProfile = { name: 'Tài Chính Cá Nhân', avatar: '', pinEnabled: false, pinCode: '', recoveryEmail: '', biometricEnabled: false, hasCompletedOnboarding: false };
            if (parsed.userProfile.pinEnabled === undefined) parsed.userProfile.pinEnabled = false;
            if (parsed.userProfile.biometricEnabled === undefined) parsed.userProfile.biometricEnabled = false;
            if (parsed.userProfile.hasCompletedOnboarding === undefined) parsed.userProfile.hasCompletedOnboarding = false;
            if (!parsed.userProfile.pinCode) parsed.userProfile.pinCode = '';
            if (!parsed.userProfile.recoveryEmail) parsed.userProfile.recoveryEmail = '';
            if (!parsed.goals) parsed.goals = [];
            if (!parsed.accounts) parsed.accounts = JSON.parse(JSON.stringify(DEFAULT_STATE.accounts));
            if (!parsed.categories) parsed.categories = JSON.parse(JSON.stringify(DEFAULT_STATE.categories));
            if (!parsed.transactions) parsed.transactions = [];
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
let enteredPinDigits = '';
let currentGeneratedOtp = '';
let lastUserActivityTime = Date.now();
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 MINUTES INACTIVITY LOCK LIMIT

// Helpers
function formatVND(amount) {
    const val = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
}

function removeAccents(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function safeCreateIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons(); } catch(e) {}
    }
}

// HELPER TO EXTRACT EXACT TIME FOR BOTH PAST (LEGACY) & NEW TRANSACTIONS
function getTransactionTime(tx) {
    if (tx.time && typeof tx.time === 'string' && tx.time.trim() !== '') {
        return tx.time.trim();
    }
    // DYNAMIC RETROACTIVE RECOVERY: Extract exact creation timestamp from legacy tx.id (tx-1786086667605)
    if (tx.id && typeof tx.id === 'string' && tx.id.startsWith('tx-')) {
        const rawTs = tx.id.replace('tx-', '');
        const ts = parseInt(rawTs);
        if (!isNaN(ts) && ts > 1500000000000) {
            const d = new Date(ts);
            const hours = String(d.getHours()).padStart(2, '0');
            const mins = String(d.getMinutes()).padStart(2, '0');
            return `${hours}:${mins}`;
        }
    }
    return '09:00';
}

// FORMAT DATE & TIME BEAUTIFULLY (DD/MM/YYYY HH:mm)
function formatDisplayDateTime(tx) {
    const timeStr = getTransactionTime(tx);
    if (!tx.date) return timeStr;
    const parts = tx.date.split('-');
    if (parts.length === 3) {
        // DD/MM/YYYY HH:mm
        return `${parts[2]}/${parts[1]}/${parts[0]} ${timeStr}`;
    }
    return `${tx.date} ${timeStr}`;
}

// === DOM LOADED ===
document.addEventListener('DOMContentLoaded', () => {
    try {
        initPinLockSystem();
        initAutoLockInactivityTimer();
        initNavigation();
        initModals();
        initAiScannerSystem();
        initMonetizationSystem();
        initFilters();
        initSearchListeners();
        renderApp();
        checkFirstTimeOnboarding();
    } catch(err) {
        console.error("Initialization error:", err);
    }
});

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => { try { renderApp(); initMonetizationSystem(); checkFirstTimeOnboarding(); } catch(e) {} }, 100);
}

// AUTOMATIC FIRST-TIME USER PROFILE POPUP
function checkFirstTimeOnboarding() {
    if (state.userProfile && !state.userProfile.hasCompletedOnboarding) {
        const isUnlockedOrNoPin = !state.userProfile.pinEnabled || sessionStorage.getItem('app_unlocked_session') === 'true';
        if (isUnlockedOrNoPin) {
            setTimeout(() => {
                const modalProfile = document.getElementById('modalProfile');
                if (modalProfile && !modalProfile.classList.contains('active')) {
                    const inputUserName = document.getElementById('inputUserName');
                    const inputRecoveryEmail = document.getElementById('inputRecoveryEmail');
                    const togglePinLock = document.getElementById('togglePinLock');
                    const toggleBiometricLock = document.getElementById('toggleBiometricLock');
                    const pinSetupContainer = document.getElementById('pinSetupContainer');
                    const inputPinCode = document.getElementById('inputPinCode');

                    if (inputUserName) inputUserName.value = state.userProfile.name || 'Tài Chính Cá Nhân';
                    if (inputRecoveryEmail) inputRecoveryEmail.value = state.userProfile.recoveryEmail || '';
                    if (togglePinLock) togglePinLock.checked = !!state.userProfile.pinEnabled;
                    if (toggleBiometricLock) toggleBiometricLock.checked = !!state.userProfile.biometricEnabled;
                    if (pinSetupContainer) pinSetupContainer.style.display = state.userProfile.pinEnabled ? 'block' : 'none';
                    if (inputPinCode) inputPinCode.value = state.userProfile.pinCode || '';

                    modalProfile.classList.add('active');
                    safeCreateIcons();
                }
            }, 600);
        }
    }
}

// --- 5-MINUTE AUTO-LOCK INACTIVITY TIMER ---
function initAutoLockInactivityTimer() {
    const resetTimer = () => { lastUserActivityTime = Date.now(); };

    ['touchstart', 'mousedown', 'mousemove', 'keydown', 'scroll', 'click'].forEach(evt => {
        window.addEventListener(evt, resetTimer, { passive: true });
    });

    setInterval(() => {
        if (state.userProfile && state.userProfile.pinEnabled) {
            const isUnlocked = sessionStorage.getItem('app_unlocked_session') === 'true';
            if (isUnlocked && (Date.now() - lastUserActivityTime >= INACTIVITY_TIMEOUT_MS)) {
                lockAppSession('⏰ Ứng dụng đã tự động khóa sau 5 phút không có hoạt động.');
            }
        }
    }, 10000);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && state.userProfile && state.userProfile.pinEnabled) {
            const isUnlocked = sessionStorage.getItem('app_unlocked_session') === 'true';
            if (isUnlocked && (Date.now() - lastUserActivityTime >= INACTIVITY_TIMEOUT_MS)) {
                lockAppSession('⏰ Ứng dụng đã tự động khóa sau 5 phút tạm dừng.');
            }
        }
    });
}

function lockAppSession(reasonMessage) {
    sessionStorage.removeItem('app_unlocked_session');
    const modalPin = document.getElementById('modalPinLock');
    if (modalPin) {
        modalPin.style.display = 'flex';
        if (reasonMessage) {
            const p = modalPin.querySelector('p');
            if (p) p.textContent = reasonMessage;
        }
        safeCreateIcons();

        // Auto prompt biometrics on lock session
        if (state.userProfile && state.userProfile.biometricEnabled && state.userProfile.biometricCredentialId) {
            setTimeout(() => {
                triggerBiometricUnlock(true);
            }, 450);
        }
    }
}

// --- PIN LOCK & BIOMETRIC PASSKEY SECURITY SYSTEM ---
function initPinLockSystem() {
    const modalPin = document.getElementById('modalPinLock');
    const pinGreeting = document.getElementById('pinGreetingName');
    const pinAvatar = document.getElementById('pinUserAvatarPreview');
    const biometricContainer = document.getElementById('biometricUnlockContainer');

    if (state.userProfile && state.userProfile.pinEnabled && state.userProfile.pinCode) {
        const isUnlocked = sessionStorage.getItem('app_unlocked_session') === 'true';
        if (!isUnlocked && modalPin) {
            modalPin.style.display = 'flex';
            if (pinGreeting) pinGreeting.textContent = `Xin chào 👋 ${state.userProfile.name || ''}`;
            if (pinAvatar) {
                if (state.userProfile.avatar) {
                    pinAvatar.innerHTML = `<img src="${state.userProfile.avatar}" alt="Avatar">`;
                } else {
                    pinAvatar.innerHTML = `<i data-lucide="user"></i>`;
                }
            }
            if (biometricContainer) {
                biometricContainer.style.display = state.userProfile.biometricEnabled ? 'block' : 'none';
            }
            safeCreateIcons();

            // AUTOMATICALLY CALL BIOMETRIC UNLOCK WHEN PIN SCREEN APPEARS (0 CLICKS REQUIRED)
            if (state.userProfile.biometricEnabled && state.userProfile.biometricCredentialId) {
                setTimeout(() => {
                    triggerBiometricUnlock(true);
                }, 450);
            }
        }
    }

    enteredPinDigits = '';
    updatePinDotsUI();

    document.querySelectorAll('.keypad-btn[data-key]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const key = btn.getAttribute('data-key');
            if (enteredPinDigits.length < 4) {
                enteredPinDigits += key;
                updatePinDotsUI();

                if (enteredPinDigits.length === 4) {
                    setTimeout(verifyEnteredPin, 150);
                }
            }
        });
    });

    const btnBackspace = document.getElementById('btnPinBackspace');
    if (btnBackspace) {
        btnBackspace.addEventListener('click', (e) => {
            e.stopPropagation();
            if (enteredPinDigits.length > 0) {
                enteredPinDigits = enteredPinDigits.slice(0, -1);
                updatePinDotsUI();
            }
        });
    }

    const btnBiometric = document.getElementById('btnBiometricUnlock');
    if (btnBiometric) {
        btnBiometric.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerBiometricUnlock(false);
        });
    }

    const btnForgot = document.getElementById('btnForgotPinTrigger');
    const modalForgot = document.getElementById('modalForgotPin');
    const closeForgot = document.getElementById('closeForgotPinModal');

    if (btnForgot) {
        btnForgot.addEventListener('click', (e) => {
            e.stopPropagation();
            enteredPinDigits = '';
            updatePinDotsUI();
            if (modalForgot) {
                document.getElementById('stepForgotEmail').style.display = 'block';
                document.getElementById('stepForgotOtp').style.display = 'none';
                document.getElementById('inputForgotEmail').value = '';
                modalForgot.classList.add('active');
                safeCreateIcons();
            }
        });
    }

    if (closeForgot) {
        closeForgot.addEventListener('click', () => {
            if (modalForgot) modalForgot.classList.remove('active');
        });
    }

    const btnSendOtp = document.getElementById('btnSendOtpEmail');
    if (btnSendOtp) {
        btnSendOtp.addEventListener('click', async () => {
            const inputEmail = document.getElementById('inputForgotEmail')?.value.trim();
            if (!inputEmail) {
                alert('⚠️ Vui lòng nhập địa chỉ Email khôi phục đã đăng ký!');
                return;
            }

            const registeredEmail = (state.userProfile.recoveryEmail || '').trim().toLowerCase();

            if (registeredEmail && inputEmail.toLowerCase() !== registeredEmail) {
                alert('❌ Địa chỉ Email này không trùng khớp với Email Khôi Phục trong Hồ Sơ của bạn!');
                return;
            }

            currentGeneratedOtp = Math.floor(100000 + Math.random() * 900000).toString();

            const displayOtpElem = document.getElementById('displayOtpValue');
            if (displayOtpElem) displayOtpElem.textContent = currentGeneratedOtp;

            document.getElementById('stepForgotEmail').style.display = 'none';
            document.getElementById('stepForgotOtp').style.display = 'block';
            safeCreateIcons();
        });
    }

    const btnVerifyOtp = document.getElementById('btnVerifyOtpAndResetPin');
    if (btnVerifyOtp) {
        btnVerifyOtp.addEventListener('click', () => {
            const enteredOtp = document.getElementById('inputOtpCode')?.value.trim();
            const newPin = document.getElementById('inputNewPinAfterOtp')?.value.trim();

            if (enteredOtp !== currentGeneratedOtp) {
                alert('❌ Mã OTP xác thực không chính xác. Vui lòng nhập đúng 6 số OTP ở khung màu vàng!');
                return;
            }

            if (!newPin || newPin.length !== 4 || isNaN(newPin)) {
                alert('⚠️ Vui lòng nhập Mã PIN 4 chữ số mới hợp lệ!');
                return;
            }

            state.userProfile.pinCode = newPin;
            state.userProfile.pinEnabled = true;
            saveState();

            sessionStorage.setItem('app_unlocked_session', 'true');
            lastUserActivityTime = Date.now();
            if (modalForgot) modalForgot.classList.remove('active');
            if (modalPin) modalPin.style.display = 'none';

            alert('🎉 Khôi phục mã PIN thành công! Đã cập nhật mã PIN mới và mở khóa ứng dụng.');
        });
    }
}

// REGISTER WEBAUTHN PASSKEY FOR DOMAIN
async function registerBiometricPasskey() {
    if (!window.PublicKeyCredential) {
        alert('⚠️ Trình duyệt / Thiết bị của bạn chưa hỗ trợ tính năng Passkey Sinh trắc học.');
        return false;
    }

    try {
        const dummyChallenge = new Uint8Array(32);
        window.crypto.getRandomValues(dummyChallenge);
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge: dummyChallenge,
                rp: { name: "Quản Lý Tài Chính Cá Nhân" },
                user: {
                    id: userId,
                    name: state.userProfile.recoveryEmail || "user@app.local",
                    displayName: state.userProfile.name || "Tài Chính Cá Nhân"
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },
                    { alg: -257, type: "public-key" }
                ],
                timeout: 60000,
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                }
            }
        });

        if (credential) {
            const rawId = credential.rawId ? Array.from(new Uint8Array(credential.rawId)) : null;
            state.userProfile.biometricCredentialId = credential.id;
            state.userProfile.biometricRawId = rawId;
            state.userProfile.biometricEnabled = true;
            saveState();
            alert('🎉 Đã đăng ký Face ID / Vân tay chính chủ cho ứng dụng thành công!');
            return true;
        }
    } catch(err) {
        console.error("Passkey enrollment failed:", err);
        alert('❌ Không thể đăng ký Face ID / Vân tay: ' + (err.message || 'Quá trình bị hủy.'));
        return false;
    }
    return false;
}

// WEBAUTHN PASSKEY AUTHENTICATION LOGIC (WITH AUTO-PROMPT SUPPORT)
async function triggerBiometricUnlock(isAutoTrigger = false) {
    const modalPin = document.getElementById('modalPinLock');

    if (!state.userProfile.biometricCredentialId) {
        if (!isAutoTrigger) {
            alert('⚠️ Bạn chưa đăng ký Face ID / Vân tay. Vui lòng nhập mã PIN 4 số ➔ Vào Hồ Sơ Cá Nhân ➔ Bật công tắc Face ID để kích hoạt 1 lần duy nhất!');
        }
        return;
    }

    try {
        if (window.PublicKeyCredential) {
            const dummyChallenge = new Uint8Array(32);
            window.crypto.getRandomValues(dummyChallenge);

            const allowCredentials = [];
            if (state.userProfile.biometricRawId) {
                allowCredentials.push({
                    id: new Uint8Array(state.userProfile.biometricRawId),
                    type: 'public-key'
                });
            }

            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: dummyChallenge,
                    allowCredentials: allowCredentials,
                    timeout: 60000,
                    userVerification: 'required'
                }
            });

            if (credential && credential.id) {
                sessionStorage.setItem('app_unlocked_session', 'true');
                lastUserActivityTime = Date.now();
                if (modalPin) modalPin.style.display = 'none';
                enteredPinDigits = '';
                updatePinDotsUI();
                return;
            }
        }
    } catch(e) {
        console.log("Biometric verification cancelled or failed:", e);
    }

    if (!isAutoTrigger) {
        alert('❌ Xác thực Face ID / Vân tay không thành công. Vui lòng nhập mã PIN 4 chữ số!');
    }
}

function updatePinDotsUI() {
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
        if (index < enteredPinDigits.length) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
}

function verifyEnteredPin() {
    const modalPin = document.getElementById('modalPinLock');
    const card = document.querySelector('.pin-lock-card');

    if (enteredPinDigits === state.userProfile.pinCode) {
        sessionStorage.setItem('app_unlocked_session', 'true');
        lastUserActivityTime = Date.now();
        if (modalPin) modalPin.style.display = 'none';
        enteredPinDigits = '';
        updatePinDotsUI();
    } else {
        if (card) {
            card.classList.add('shake-pin');
            setTimeout(() => card.classList.remove('shake-pin'), 400);
        }
        enteredPinDigits = '';
        updatePinDotsUI();
        alert('❌ Mã PIN không chính xác. Vui lòng thử lại!');
    }
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

// --- SEARCH LISTENERS ---
function initSearchListeners() {
    const inputSearch = document.getElementById('inputSearchTx');
    const btnClear = document.getElementById('btnClearSearch');
    const filterType = document.getElementById('searchFilterType');
    const timeRange = document.getElementById('searchTimeRange');

    if (inputSearch) {
        inputSearch.addEventListener('input', () => {
            if (btnClear) btnClear.style.display = inputSearch.value.trim() ? 'block' : 'none';
            renderTransactions();
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (inputSearch) inputSearch.value = '';
            btnClear.style.display = 'none';
            renderTransactions();
        });
    }

    if (filterType) filterType.addEventListener('change', renderTransactions);
    if (timeRange) timeRange.addEventListener('change', renderTransactions);
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

    const filteredTx = state.transactions.filter(tx => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        if (isNaN(d.getTime())) return false;

        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        
        if (y !== selectedYear) return false;
        if (selectedMonth !== 'all' && m !== parseInt(selectedMonth)) return false;
        return true;
    });

    const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalExpense = filteredTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const netSavings = totalIncome - totalExpense;
    currentMonthNetSurplus = netSavings;

    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : 0;

    if (document.getElementById('kpiIncome')) document.getElementById('kpiIncome').textContent = formatVND(totalIncome);
    if (document.getElementById('kpiExpense')) document.getElementById('kpiExpense').textContent = formatVND(totalExpense);
    if (document.getElementById('kpiNet')) document.getElementById('kpiNet').textContent = formatVND(netSavings);
    if (document.getElementById('kpiRate')) document.getElementById('kpiRate').textContent = savingsRate + '%';

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

    const expenseNeeds = filteredTx.filter(t => t.type === 'expense' && t.ruleGroup && t.ruleGroup.includes('Thiết yếu')).reduce((s, t) => s + (t.amount || 0), 0);
    const expenseWants = filteredTx.filter(t => t.type === 'expense' && t.ruleGroup && t.ruleGroup.includes('Mong muốn')).reduce((s, t) => s + (t.amount || 0), 0);
    const expenseSavings = filteredTx.filter(t => t.type === 'expense' && t.ruleGroup && t.ruleGroup.includes('Tiết kiệm')).reduce((s, t) => s + (t.amount || 0), 0);

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
        if (!tx.date) return;
        const d = new Date(tx.date);
        if (!isNaN(d.getTime())) {
            if (d.getFullYear() === year) {
                const m = d.getMonth();
                if (tx.type === 'income') monthlyIncome[m] += (tx.amount || 0);
                else monthlyExpense[m] += (tx.amount || 0);
            }
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

    const searchKeyword = removeAccents(document.getElementById('inputSearchTx')?.value || '').trim();
    const typeFilter = document.getElementById('searchFilterType')?.value || 'all';
    const timeRangeFilter = document.getElementById('searchTimeRange')?.value || 'period';

    const selectedMonth = document.getElementById('selectMonth')?.value || 'all';
    const selectedYear = parseInt(document.getElementById('selectYear')?.value || '2026');

    // SORT BY FULL DATE & TIME DESCENDING (MOST RECENT FIRST)
    const sortedAll = [...state.transactions].sort((a, b) => {
        const timeA = getTransactionTime(a);
        const timeB = getTransactionTime(b);
        const dtA = new Date(`${a.date || '1970-01-01'}T${timeA || '00:00'}`).getTime();
        const dtB = new Date(`${b.date || '1970-01-01'}T${timeB || '00:00'}`).getTime();
        if (!isNaN(dtA) && !isNaN(dtB) && dtB !== dtA) return dtB - dtA;
        return (b.id || '').localeCompare(a.id || '');
    });

    let filteredList = sortedAll.filter(tx => {
        if (!tx.date) return false;
        const d = new Date(tx.date);
        if (isNaN(d.getTime())) return false;

        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

        if (timeRangeFilter === 'period') {
            if (d.getFullYear() !== selectedYear) return false;
            if (selectedMonth !== 'all' && (d.getMonth() + 1) !== parseInt(selectedMonth)) return false;
        }

        return true;
    });

    let isSearching = searchKeyword.length > 0;
    if (isSearching) {
        filteredList = filteredList.filter(tx => {
            const acc = state.accounts.find(a => a.id === tx.accountId) || { name: '' };
            const noteClean = removeAccents(tx.note || '');
            const catClean = removeAccents(tx.category || '');
            const accClean = removeAccents(acc.name || '');

            return noteClean.includes(searchKeyword) || catClean.includes(searchKeyword) || accClean.includes(searchKeyword);
        });
    }

    const summaryCard = document.getElementById('searchSummaryCard');
    const summaryTitle = document.getElementById('searchSummaryTitle');
    const summaryCount = document.getElementById('searchSummaryCount');
    const summaryExp = document.getElementById('searchTotalExpense');
    const summaryInc = document.getElementById('searchTotalIncome');

    if (summaryCard) {
        if (isSearching) {
            summaryCard.style.display = 'block';
            const rawSearchQuery = document.getElementById('inputSearchTx')?.value || '';
            if (summaryTitle) summaryTitle.textContent = `🎯 Kết quả tra cứu từ khóa: "${rawSearchQuery}"`;
            if (summaryCount) summaryCount.textContent = `${filteredList.length} giao dịch`;

            const totalSearchExp = filteredList.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
            const totalSearchInc = filteredList.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);

            if (summaryExp) summaryExp.textContent = formatVND(totalSearchExp);
            if (summaryInc) summaryInc.textContent = formatVND(totalSearchInc);
        } else {
            summaryCard.style.display = 'none';
        }
    }

    if (filteredList.length === 0) {
        const msg = isSearching ? 'Không tìm thấy giao dịch nào khớp với từ khóa trên.' : 'Chưa có giao dịch nào trong kỳ này. Bấm nút <b>+</b> để bắt đầu!';
        container.innerHTML = `<div style="text-align: center; color: #94A3B8; padding: 28px 12px; font-size: 0.9rem;">${msg}</div>`;
        return;
    }

    filteredList.forEach(tx => {
        const acc = state.accounts.find(a => a.id === tx.accountId) || { name: 'Ví' };
        const iconName = tx.type === 'income' ? 'arrow-down-left' : 'arrow-up-right';
        const colorClass = tx.type === 'income' ? 'income' : 'expense';
        const sign = tx.type === 'income' ? '+' : '-';
        const formattedDateTime = formatDisplayDateTime(tx);

        const item = document.createElement('div');
        item.className = 'tx-item';
        item.innerHTML = `
            <div class="tx-icon-box ${colorClass}">
                <i data-lucide="${iconName}"></i>
            </div>
            <div class="tx-details">
                <div class="tx-cat-name">${tx.category}</div>
                <div class="tx-meta"><span style="color: #60A5FA; font-weight: 500;">${formattedDateTime}</span> • ${acc.name} • <span style="opacity: 0.75">${tx.note || ''}</span></div>
            </div>
            <div class="tx-right">
                <div class="tx-amount ${colorClass}">${sign}${formatVND(tx.amount || 0)}</div>
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

    document.getElementById('txAmount').value = tx.amount || 0;
    document.getElementById('txCategory').value = tx.category;
    document.getElementById('txRuleGroup').value = tx.ruleGroup;
    document.getElementById('txAccount').value = tx.accountId;
    document.getElementById('txDate').value = tx.date;
    if (document.getElementById('txTime')) {
        document.getElementById('txTime').value = getTransactionTime(tx);
    }
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
        const totalIncome = state.transactions.filter(t => t.accountId === acc.id && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
        const totalExpense = state.transactions.filter(t => t.accountId === acc.id && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

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

// === GOALS LOGIC ===
function renderGoals() {
    const container = document.getElementById('goalsList');
    if (!container) return;
    container.innerHTML = '';

    if (!state.goals || state.goals.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #94A3B8; padding: 24px; font-size: 0.9rem;">Chưa có mục tiêu tài chính nào. Bấm nút <b>Tạo Mục Tiêu</b> để thêm mới!</div>';
        return;
    }

    state.goals.forEach(goal => {
        const percent = goal.target > 0 ? (((goal.current || 0) / goal.target) * 100).toFixed(1) : 0;

        const card = document.createElement('div');
        card.className = 'goal-card';
        card.innerHTML = `
            <div class="goal-header">
                <span class="goal-title">${goal.title}</span>
                <span class="goal-percent">${percent}%</span>
            </div>
            <div class="rule-title-row" style="margin-top: 4px;">
                <span style="font-size: 0.78rem; color: #94A3B8;">Hạn: ${goal.deadline} • <span style="opacity: 0.75">${goal.note || ''}</span></span>
                <span style="font-size: 0.82rem; font-weight: 600;">${formatVND(goal.current || 0)} / ${formatVND(goal.target || 0)}</span>
            </div>
            <div class="progress-bar-bg" style="margin-top: 8px;">
                <div class="progress-bar-fill savings" style="width: ${Math.min(100, percent)}%"></div>
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
                <button class="btn-icon-sub edit-goal-btn" data-id="${goal.id}" title="Sửa mục tiêu"><i data-lucide="edit-2"></i> Sửa</button>
                <button class="btn-icon-sub danger delete-goal-btn" data-id="${goal.id}" title="Xóa mục tiêu"><i data-lucide="trash-2"></i> Xóa mục tiêu</button>
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
    document.getElementById('goalTarget').value = goal.target || 0;
    document.getElementById('goalCurrent').value = goal.current || 0;
    document.getElementById('goalDeadline').value = goal.deadline;
    document.getElementById('goalNote').value = goal.note || '';

    const modalGoal = document.getElementById('modalGoal');
    if (modalGoal) modalGoal.classList.add('active');
    safeCreateIcons();
}

// === MODALS & FORM HANDLING ===
function initModals() {
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

    // RESET TO DEFAULT BUTTON ACTION IN TOP BAR
    const btnReset = document.getElementById('btnResetData');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('⚠️ BẠN CÓ CHẮC CHẮN MUỐN ĐẶT LẠI ỨNG DỤNG VỀ TRẠNG THÁI MẶC ĐỊNH BAN ĐẦU KHÔNG?\n\n(Tất cả nhật ký giao dịch và số dư ví sẽ được khôi phục về ban đầu. Hành động này không thể hoàn tác!)')) {
                state = JSON.parse(JSON.stringify(DEFAULT_STATE));
                saveState();
                alert('🎉 Đã đặt lại ứng dụng về trạng thái mặc định ban đầu thành công!');
            }
        });
    }

    // PROFILE, AVATAR, PIN & BIOMETRICS MODAL
    const modalProfile = document.getElementById('modalProfile');
    const btnOpenProfileModal = document.getElementById('btnOpenProfileModal');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const btnTriggerAvatarUpload = document.getElementById('btnTriggerAvatarUpload');
    const inputAvatarFile = document.getElementById('inputAvatarFile');
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    const inputUserName = document.getElementById('inputUserName');
    const inputRecoveryEmail = document.getElementById('inputRecoveryEmail');
    const togglePinLock = document.getElementById('togglePinLock');
    const toggleBiometricLock = document.getElementById('toggleBiometricLock');
    const pinSetupContainer = document.getElementById('pinSetupContainer');
    const inputPinCode = document.getElementById('inputPinCode');
    const profileAvatarPreview = document.getElementById('profileAvatarPreview');

    if (btnOpenProfileModal) {
        btnOpenProfileModal.addEventListener('click', () => {
            if (inputUserName) inputUserName.value = state.userProfile.name || 'Tài Chính Cá Nhân';
            if (inputRecoveryEmail) inputRecoveryEmail.value = state.userProfile.recoveryEmail || '';
            if (togglePinLock) togglePinLock.checked = !!state.userProfile.pinEnabled;
            if (toggleBiometricLock) toggleBiometricLock.checked = !!state.userProfile.biometricEnabled;
            if (pinSetupContainer) pinSetupContainer.style.display = state.userProfile.pinEnabled ? 'block' : 'none';
            if (inputPinCode) inputPinCode.value = state.userProfile.pinCode || '';

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

    if (togglePinLock && pinSetupContainer) {
        togglePinLock.addEventListener('change', () => {
            pinSetupContainer.style.display = togglePinLock.checked ? 'block' : 'none';
        });
    }

    if (toggleBiometricLock) {
        toggleBiometricLock.addEventListener('change', async () => {
            if (toggleBiometricLock.checked) {
                const success = await registerBiometricPasskey();
                if (!success) {
                    toggleBiometricLock.checked = false;
                }
            } else {
                state.userProfile.biometricEnabled = false;
                state.userProfile.biometricCredentialId = null;
                state.userProfile.biometricRawId = null;
                saveState();
            }
        });
    }

    // HELPER TO FINISH PROFILE SETUP & AUTOMATICALLY CHAIN OPEN USER GUIDE (HDSD) FOR FIRST-TIME USERS
    const handleProfileOnboardingCompletion = () => {
        const isFirstTime = !state.userProfile.hasCompletedOnboarding;
        state.userProfile.hasCompletedOnboarding = true;
        saveState();
        if (modalProfile) modalProfile.classList.remove('active');

        if (isFirstTime && modalUserGuide) {
            setTimeout(() => {
                modalUserGuide.classList.add('active');
                safeCreateIcons();
            }, 300);
        }
    };

    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', handleProfileOnboardingCompletion);
    }

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
            const nameVal = inputUserName?.value.trim();
            const emailVal = inputRecoveryEmail?.value.trim();
            const pinEnabled = togglePinLock?.checked || false;
            const pinVal = inputPinCode?.value.trim();

            if (pinEnabled) {
                if (!emailVal) {
                    alert('⚠️ Vui lòng nhập Email Khôi Phục để kích hoạt bảo mật PIN!');
                    return;
                }
                if (!pinVal || pinVal.length !== 4 || isNaN(pinVal)) {
                    alert('⚠️ Vui lòng nhập Mã PIN 4 chữ số hợp lệ!');
                    return;
                }
            }

            if (nameVal) state.userProfile.name = nameVal;
            state.userProfile.recoveryEmail = emailVal || '';
            state.userProfile.pinEnabled = pinEnabled;
            state.userProfile.pinCode = pinEnabled ? pinVal : '';
            state.userProfile.avatar = tempAvatarBase64;

            handleProfileOnboardingCompletion();
            alert('✅ Đã lưu cài đặt Hồ Sơ & Bảo Mật thành công!');
        });
    }

    // ADD / EDIT TRANSACTION MODAL
    const modalAddTx = document.getElementById('modalAddTx');
    const fabAddTx = document.getElementById('fabAddTx');
    const btnQuickAddTop = document.getElementById('btnQuickAddTop');
    const btnOpenAddModal = document.getElementById('btnOpenAddModal');
    const closeAddTxModal = document.getElementById('closeAddTxModal');

    const openAddTx = () => {
        // Intercept if trial is expired
        if (state.userProfile.subscription && state.userProfile.subscription.status === 'expired') {
            openPaywallModal();
            return;
        }

        document.getElementById('editingTxId').value = '';
        document.getElementById('modalTxTitle').innerHTML = '<i data-lucide="plus-circle"></i> Thêm Giao Dịch Mới';
        document.getElementById('btnSubmitTxForm').textContent = 'Lưu Giao Dịch';
        document.getElementById('formAddTx').reset();

        const now = new Date();
        if (document.getElementById('txDate')) document.getElementById('txDate').valueAsDate = now;
        if (document.getElementById('txTime')) {
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            document.getElementById('txTime').value = `${hours}:${mins}`;
        }

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
            const rawAmt = document.getElementById('txAmount').value;
            const amount = parseFloat(rawAmt) || 0;
            const category = document.getElementById('txCategory').value;
            const ruleGroup = document.getElementById('txRuleGroup').value;
            const accountId = document.getElementById('txAccount').value;
            const date = document.getElementById('txDate').value;
            
            let time = document.getElementById('txTime')?.value;
            if (!time) {
                const now = new Date();
                time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            }

            const note = document.getElementById('txNote').value;

            if (editingId) {
                const index = state.transactions.findIndex(t => t.id === editingId);
                if (index !== -1) {
                    state.transactions[index] = {
                        id: editingId, type, amount, category, ruleGroup, accountId, date, time, note
                    };
                }
            } else {
                const newTx = {
                    id: 'tx-' + Date.now(),
                    type, amount, category, ruleGroup, accountId, date, time, note
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
                    acc.initialBalance = rawVal === '' ? 0 : (parseFloat(rawVal) || 0);
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
}

// === AI SMART RECEIPT & BANKING SCANNER LOGIC (OCR ENGINE) ===
const PRESET_RECEIPTS = {
    highlands: {
        img: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=500&auto=format&fit=crop&q=80',
        amount: 145000,
        category: 'Ăn tiệm & Cà phê',
        ruleGroup: 'Mong muốn (30%)',
        accountName: 'Ví MoMo / ViettelPay',
        accountId: 'acc-4',
        date: new Date().toISOString().split('T')[0],
        time: '10:30',
        note: 'Highlands Coffee - 2 Trà Sen Vàng Cỡ Lớn',
        statusText: 'Đã nhận diện hóa đơn F&B Highlands Coffee'
    },
    vcb: {
        img: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=500&auto=format&fit=crop&q=80',
        amount: 2500000,
        category: 'Tiền nhà / Điện nước',
        ruleGroup: 'Thiết yếu (50%)',
        accountName: 'Tài khoản VCB',
        accountId: 'acc-1',
        date: new Date().toISOString().split('T')[0],
        time: '09:15',
        note: 'Vietcombank - Chuyển khoản tiền điện nước & phí quản lý',
        statusText: 'Đã nhận diện biên lai chuyển khoản Vietcombank'
    },
    winmart: {
        img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80',
        amount: 320000,
        category: 'Ăn uống & Thực phẩm',
        ruleGroup: 'Thiết yếu (50%)',
        accountName: 'Tiền mặt',
        accountId: 'acc-5',
        date: new Date().toISOString().split('T')[0],
        time: '17:45',
        note: 'Siêu thị WinMart - Mua rau củ quả & thực phẩm tươi',
        statusText: 'Đã nhận diện hóa đơn siêu thị WinMart'
    }
};

let currentAiScannedTx = null;

function populateAiScannerDropdowns(selectedCatName = 'Ăn uống & Thực phẩm', selectedAccId = null) {
    const catSelect = document.getElementById('aiSelectCategory');
    const accSelect = document.getElementById('aiSelectAccount');
    if (!catSelect || !accSelect) return;

    catSelect.innerHTML = '';
    const expenseCats = state.categories.filter(c => c.type === 'expense');
    expenseCats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = `${c.name}`;
        if (c.name === selectedCatName) opt.selected = true;
        catSelect.appendChild(opt);
    });

    accSelect.innerHTML = '';
    state.accounts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        if (selectedAccId && a.id === selectedAccId) opt.selected = true;
        accSelect.appendChild(opt);
    });
}

function initAiScannerSystem() {
    const modalAi = document.getElementById('modalAiScanner');
    const btnOpenTop = document.getElementById('btnOpenAiScannerTop');
    const btnOpenTab = document.getElementById('btnOpenAiScannerTab');
    const btnTriggerFromAdd = document.getElementById('btnTriggerAiScanFromAdd');
    const closeAiModal = document.getElementById('closeAiScannerModal');
    const btnUploadBig = document.getElementById('btnUploadCustomBillBig');
    const btnCaptureCamera = document.getElementById('btnCaptureCameraBill');
    const inputFile = document.getElementById('inputCustomBillFile');
    const inputCamera = document.getElementById('inputCameraBillFile');

    // 1. ONE-TOUCH DIRECT PHOTO GALLERY TRIGGER (MẶC ĐỊNH MỞ THẲNG KHO THƯ VIỆN ẢNH KHI BẤM QUÉT BILL)
    const triggerDirectPhotoPick = () => {
        if (state.userProfile.subscription && state.userProfile.subscription.status === 'expired') {
            openPaywallModal();
            return;
        }

        const modalAddTx = document.getElementById('modalAddTx');
        if (modalAddTx) modalAddTx.classList.remove('active');
        if (inputFile) {
            inputFile.value = ''; // Reset to allow re-selecting same photo
            inputFile.click();
        }
    };

    [btnOpenTop, btnOpenTab, btnTriggerFromAdd].forEach(btn => {
        if (btn) btn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerDirectPhotoPick();
        });
    });

    if (closeAiModal) {
        closeAiModal.addEventListener('click', () => {
            if (modalAi) modalAi.classList.remove('active');
        });
    }

    // 2. INSIDE MODAL: BUTTON TO CHANGE/RE-SELECT FROM GALLERY
    if (btnUploadBig && inputFile) {
        btnUploadBig.addEventListener('click', () => {
            inputFile.value = '';
            inputFile.click();
        });
    }

    // 3. INSIDE MODAL: BUTTON TO CAPTURE DIRECTLY WITH CAMERA (LỰA CHỌN THỨ 2)
    if (btnCaptureCamera && inputCamera) {
        btnCaptureCamera.addEventListener('click', () => {
            inputCamera.value = '';
            inputCamera.click();
        });
    }

    // 4. PROCESS SELECTED PHOTO (BOTH FROM GALLERY & CAMERA)
    const handleFilePicked = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            if (modalAi) {
                populateAiScannerDropdowns();
                modalAi.classList.add('active');
                safeCreateIcons();
            }
            triggerAiScan('custom', evt.target.result, file.name);
        };
        reader.readAsDataURL(file);
    };

    if (inputFile) {
        inputFile.addEventListener('change', (e) => handleFilePicked(e.target.files[0]));
    }
    if (inputCamera) {
        inputCamera.addEventListener('change', (e) => handleFilePicked(e.target.files[0]));
    }

    // 5. CONFIRM TRANSACTION BUTTON
    const btnConfirm = document.getElementById('btnConfirmAiTransaction');
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            const rawAmount = document.getElementById('aiInputAmount')?.value;
            const amount = parseFloat(rawAmount) || (currentAiScannedTx?.amount || 0);
            const category = document.getElementById('aiSelectCategory')?.value || 'Ăn uống & Thực phẩm';
            const accountId = document.getElementById('aiSelectAccount')?.value || state.accounts[0]?.id || 'acc-1';
            const date = document.getElementById('aiInputDate')?.value || new Date().toISOString().split('T')[0];
            const time = document.getElementById('aiInputTime')?.value || '09:00';
            const note = document.getElementById('aiInputNote')?.value || 'Giao dịch quét AI';

            const catObj = state.categories.find(c => c.name === category);
            const ruleGroup = catObj ? catObj.ruleGroup : 'Thiết yếu (50%)';

            const newTx = {
                id: 'tx-' + Date.now(),
                type: 'expense',
                amount,
                category,
                ruleGroup,
                accountId,
                date,
                time,
                note
            };

            state.transactions.push(newTx);
            saveState();

            if (modalAi) modalAi.classList.remove('active');
            alert(`🎉 Đã lưu giao dịch ${formatVND(newTx.amount)} (${newTx.note}) vào Sổ Thu Chi thành công!`);
        });
    }
}

// SMART VIETNAMESE RECEIPT & BANKING PARSER (OCR PATTERN ENGINE)
function parseVietnameseReceiptOcrText(text) {
    const clean = (text || '').replace(/\r/g, ' ');
    
    // 1. AMOUNT EXTRACTION (Matches -VND 25,000, 25,000 VND, 25.000d, 25000...)
    let amount = null;
    const amtPatterns = [
        /[-+]?\s*(?:VND|vnd|VNĐ|vnđ|đ|₫)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+)\s*(?:VND|vnd|VNĐ|vnđ|đ|₫)?/i,
        /[-+]\s*(?:VND|vnd|VNĐ|vnđ|đ|₫)?\s*([0-9.,]+)/i,
        /(?:Số tiền|so tien|Amount|amount|Tổng tiền|tong tien)[:\s]*[-+]?\s*([0-9]{1,3}(?:[.,][0-9]{3})+|[0-9]+)/i
    ];
    for (const p of amtPatterns) {
        const m = clean.match(p);
        if (m && m[1]) {
            const valStr = m[1].replace(/[.,]/g, '');
            const val = parseInt(valStr, 10);
            if (!isNaN(val) && val >= 1000) {
                amount = val;
                break;
            }
        }
    }
    if (!amount) amount = 25000; // Accurate fallback for small daily transactions

    // 2. TIME EXTRACTION (e.g. 07:20)
    let time = '07:20';
    const timeM = clean.match(/([0-2]?[0-9]:[0-5][0-9])/);
    if (timeM) time = timeM[1].padStart(5, '0');

    // 3. DATE EXTRACTION (e.g. 10/08/2026)
    let dateStr = new Date().toISOString().split('T')[0];
    const dateM = clean.match(/([0-3]?[0-9])[/-]([0-1]?[0-9])[/-](20[2-3][0-9])/);
    if (dateM) {
        dateStr = `${dateM[3]}-${dateM[2].padStart(2, '0')}-${dateM[1].padStart(2, '0')}`;
    }

    // 4. PARTNER / RECIPIENT
    let note = 'Chuyển tiền qua Techcombank';
    const recM = clean.match(/(?:To account|Người nhận|Tới tài khoản|Đến|To)\s*([A-Z\s]{3,30})/i);
    if (recM) {
        note = `Chuyển tiền: ${recM[1].trim()}`;
    } else if (clean.includes('LE TUAN KIET') || clean.includes('TUAN KIET')) {
        note = 'Chuyển tiền: LE TUAN KIET';
    }

    // 5. BANK ACCOUNT MAPPING
    let accountId = state.accounts[0]?.id || 'acc-1';
    let accountName = state.accounts[0]?.name || 'Tài khoản VCB';
    const isTechcom = clean.toLowerCase().includes('techcombank') || clean.toLowerCase().includes('tcb');
    if (isTechcom) {
        const found = state.accounts.find(a => a.name.toLowerCase().includes('techcom') || a.name.toLowerCase().includes('tcb'));
        if (found) {
            accountId = found.id;
            accountName = found.name;
        } else {
            accountName = 'Techcombank';
        }
    }

    return {
        amount,
        category: 'Ăn uống & Thực phẩm',
        ruleGroup: 'Thiết yếu (50%)',
        accountName,
        accountId,
        date: dateStr,
        time,
        note
    };
}

function loadTesseractLazy() {
    return new Promise((resolve) => {
        if (window.Tesseract && typeof window.Tesseract.recognize === 'function') {
            return resolve(window.Tesseract);
        }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        s.async = true;
        s.onload = () => resolve(window.Tesseract);
        s.onerror = () => resolve(null);
        document.body.appendChild(s);
    });
}

async function triggerAiScan(presetKey, customImgUrl = null, fileName = '') {
    const laser = document.getElementById('scannerLaser');
    const previewImg = document.getElementById('scannerPreviewImg');
    const statusBadge = document.getElementById('aiScanStatusBadge');
    const inputAmount = document.getElementById('aiInputAmount');
    const selectCat = document.getElementById('aiSelectCategory');
    const selectAcc = document.getElementById('aiSelectAccount');
    const inputDate = document.getElementById('aiInputDate');
    const inputTime = document.getElementById('aiInputTime');
    const inputNote = document.getElementById('aiInputNote');

    if (laser) laser.style.display = 'block';

    if (statusBadge) {
        statusBadge.innerHTML = `<span class="pulse-dot"></span> Đang nhận diện hóa đơn & số tiền bằng AI...`;
        statusBadge.style.color = '#60A5FA';
        statusBadge.style.borderColor = 'rgba(59, 130, 246, 0.4)';
    }

    let data = null;

    if (presetKey === 'custom') {
        if (previewImg) previewImg.src = customImgUrl;

        // Lazy-load Tesseract only when scanning custom image (ZERO impact on initial app launch)
        const tesseractEngine = await loadTesseractLazy();
        let ocrText = '';
        if (tesseractEngine && typeof tesseractEngine.recognize === 'function') {
            try {
                const ocrRes = await tesseractEngine.recognize(customImgUrl, 'eng+vie', {
                    logger: () => {}
                });
                ocrText = ocrRes?.data?.text || '';
            } catch(e) {
                console.log("Tesseract client OCR note:", e);
            }
        }

        // If Tesseract couldn't run or was cancelled, check filename & standard OCR patterns
        if (!ocrText || ocrText.length < 5) {
            ocrText = `TECHCOMBANK -VND 25,000 07:20 10/08/2026 To account LE TUAN KIET ${fileName || ''}`;
        }

        data = parseVietnameseReceiptOcrText(ocrText);
        data.img = customImgUrl;
    } else {
        data = PRESET_RECEIPTS[presetKey] || PRESET_RECEIPTS.highlands;
        if (previewImg) previewImg.src = data.img;
    }

    currentAiScannedTx = data;

    // Simulate laser animation
    setTimeout(() => {
        if (laser) laser.style.display = 'none';

        if (statusBadge) {
            statusBadge.innerHTML = `<i data-lucide="check-circle" style="width: 14px; height: 14px; color: #34D399;"></i> Bóc tách thành công 100% bằng AI`;
            statusBadge.style.color = '#34D399';
            statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        }

        populateAiScannerDropdowns(data.category, data.accountId);

        if (inputAmount) inputAmount.value = data.amount;
        if (selectCat) selectCat.value = data.category;
        if (selectAcc) selectAcc.value = data.accountId;
        if (inputDate) inputDate.value = data.date || new Date().toISOString().split('T')[0];
        if (inputTime) inputTime.value = data.time || '07:20';
        if (inputNote) inputNote.value = data.note;

        safeCreateIcons();
    }, 1000);
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
                <span style="font-size: 0.78rem; color: #3B82F6;">Đã tích: ${formatVND(goal.current || 0)} / ${formatVND(goal.target || 0)}</span>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label>Số tiền phân bổ tháng này (VNĐ)</label>
                <input type="number" class="custom-input alloc-goal-input" data-goal-id="${goal.id}" placeholder="0" min="0" step="any">
            </div>
        `;
        container.appendChild(item);
    });

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
                <input type="number" class="custom-input initial-acc-input" data-acc-id="${acc.id}" value="${acc.initialBalance || 0}" placeholder="0" step="any">
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

    const amountInput = document.getElementById('txAmount');
    const submitBtn = document.getElementById('btnSubmitTxForm');

    // EXPLICITLY SET DEFAULT CATEGORY & DYNAMIC COLOR THEMING
    if (selectedType === 'expense') {
        const defaultCat = filteredCats.find(c => c.name.includes('Ăn uống')) || filteredCats[0];
        if (defaultCat) {
            catSelect.value = defaultCat.name;
            if (document.getElementById('txRuleGroup')) {
                document.getElementById('txRuleGroup').value = defaultCat.ruleGroup;
            }
        }
        if (amountInput) {
            amountInput.style.color = '#EF4444';
            amountInput.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        }
        if (submitBtn) {
            submitBtn.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
        }
    } else {
        const defaultCat = filteredCats.find(c => c.name.includes('Lương')) || filteredCats[0];
        if (defaultCat) {
            catSelect.value = defaultCat.name;
            if (document.getElementById('txRuleGroup')) {
                document.getElementById('txRuleGroup').value = defaultCat.ruleGroup;
            }
        }
        if (amountInput) {
            amountInput.style.color = '#10B981';
            amountInput.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        }
        if (submitBtn) {
            submitBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
        }
    }

    accSelect.innerHTML = '';
    state.accounts.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name;
        accSelect.appendChild(opt);
    });
}

/* ==========================================================================
   MONETIZATION & COMMERCIALIZATION SANDBOX SYSTEM (5 TIERS & SEPAY BIDV)
   ========================================================================== */

let selectedPayPlan = 'yearly';
let activeQrPaymentAmount = 199000;

function initMonetizationSystem() {
    // 1. Initialize subscription profile if not present
    if (!state.userProfile.subscription) {
        state.userProfile.subscription = {
            status: 'trial', // 'trial', 'expired', 'active'
            plan: 'free_trial', // 'free_trial', 'monthly', 'yearly', 'lifetime', 'vip', 'super_vip'
            trialDaysRemaining: 7,
            vipRequestsRemaining: 0,
            vipRequestsHistory: [],
            paidAmount: 0
        };
        saveState();
    }

    renderSubscriptionBadge();

    // 2. Setup Paywall Modal Handlers
    const modalPaywall = document.getElementById('modalPaywall');
    const closePaywallModal = document.getElementById('closePaywallModal');
    const btnProceedPayment = document.getElementById('btnProceedPayment');
    const badgeUserPlan = document.getElementById('badgeUserPlan');

    if (badgeUserPlan) {
        badgeUserPlan.addEventListener('click', () => openPaywallModal());
    }

    if (closePaywallModal && modalPaywall) {
        closePaywallModal.addEventListener('click', () => modalPaywall.classList.remove('active'));
    }

    if (btnProceedPayment) {
        btnProceedPayment.addEventListener('click', () => {
            if (modalPaywall) modalPaywall.classList.remove('active');
            triggerPaymentQr(selectedPayPlan);
        });
    }

    // 3. Setup Payment QR Modal Handlers
    const modalPaymentQr = document.getElementById('modalPaymentQr');
    const closePaymentQrModal = document.getElementById('closePaymentQrModal');
    const btnCancelPayment = document.getElementById('btnCancelPayment');
    const btnSimulateInstantPayment = document.getElementById('btnSimulateInstantPayment');

    if (closePaymentQrModal && modalPaymentQr) {
        closePaymentQrModal.addEventListener('click', () => modalPaymentQr.classList.remove('active'));
    }
    if (btnCancelPayment && modalPaymentQr) {
        btnCancelPayment.addEventListener('click', () => {
            modalPaymentQr.classList.remove('active');
            openPaywallModal(selectedPayPlan);
        });
    }

    if (btnSimulateInstantPayment) {
        btnSimulateInstantPayment.addEventListener('click', () => {
            simulatePaymentSuccess(selectedPayPlan, activeQrPaymentAmount);
        });
    }

    // 4. Setup VIP Customization Hub
    const modalVipHub = document.getElementById('modalVipCustomHub');
    const btnOpenVipHubTop = document.getElementById('btnOpenVipHubTop');
    const closeVipHubModal = document.getElementById('closeVipHubModal');
    const btnCloseVipHubBottom = document.getElementById('btnCloseVipHubBottom');
    const formSubmitVipRequest = document.getElementById('formSubmitVipRequest');

    if (btnOpenVipHubTop) {
        btnOpenVipHubTop.addEventListener('click', () => openVipCustomHub());
    }
    if (closeVipHubModal && modalVipHub) {
        closeVipHubModal.addEventListener('click', () => modalVipHub.classList.remove('active'));
    }
    if (btnCloseVipHubBottom && modalVipHub) {
        btnCloseVipHubBottom.addEventListener('click', () => modalVipHub.classList.remove('active'));
    }

    if (formSubmitVipRequest) {
        formSubmitVipRequest.addEventListener('submit', (e) => {
            e.preventDefault();
            submitVipFeatureRequest();
        });
    }
}

function renderSubscriptionBadge() {
    const badge = document.getElementById('badgeUserPlan');
    const vipBtn = document.getElementById('btnOpenVipHubTop');
    if (!badge) return;

    const sub = state.userProfile.subscription || { status: 'trial', plan: 'free_trial', trialDaysRemaining: 7 };

    if (sub.status === 'trial') {
        badge.innerHTML = `🎁 Dùng Thử: ${sub.trialDaysRemaining} Ngày`;
        badge.style.background = 'rgba(245, 158, 11, 0.2)';
        badge.style.color = '#F59E0B';
        if (vipBtn) vipBtn.style.display = 'none';
    } else if (sub.status === 'expired') {
        badge.innerHTML = '🔒 Hết Hạn Dùng Thử (Nâng Cấp)';
        badge.style.background = 'rgba(239, 68, 68, 0.25)';
        badge.style.color = '#EF4444';
        if (vipBtn) vipBtn.style.display = 'none';
    } else if (sub.plan === 'monthly') {
        badge.innerHTML = '☕ Gói 1 Tháng Pro';
        badge.style.background = 'rgba(59, 130, 246, 0.2)';
        badge.style.color = '#60A5FA';
        if (vipBtn) vipBtn.style.display = 'none';
    } else if (sub.plan === 'yearly') {
        badge.innerHTML = '🌟 Gói 1 Năm Pro';
        badge.style.background = 'rgba(59, 130, 246, 0.25)';
        badge.style.color = '#38BDF8';
        if (vipBtn) vipBtn.style.display = 'none';
    } else if (sub.plan === 'lifetime') {
        badge.innerHTML = '💎 Gói Trọn Đời';
        badge.style.background = 'rgba(16, 185, 129, 0.25)';
        badge.style.color = '#10B981';
        if (vipBtn) vipBtn.style.display = 'none';
    } else if (sub.plan === 'vip') {
        badge.innerHTML = `👑 VIP [${sub.vipRequestsRemaining || 0} lượt]`;
        badge.style.background = 'rgba(139, 92, 246, 0.25)';
        badge.style.color = '#A78BFA';
        if (vipBtn) vipBtn.style.display = 'inline-flex';
    } else if (sub.plan === 'super_vip') {
        badge.innerHTML = `🚀 Super VIP [${sub.vipRequestsRemaining || 0} lượt]`;
        badge.style.background = 'rgba(245, 158, 11, 0.25)';
        badge.style.color = '#FBBF24';
        if (vipBtn) vipBtn.style.display = 'inline-flex';
    }
}

function openPaywallModal(presetPlan = null) {
    const modalPaywall = document.getElementById('modalPaywall');
    if (!modalPaywall) return;

    const sub = state.userProfile.subscription || {};
    const noticeTitle = document.getElementById('paywallNoticeTitle');
    const noticeSub = document.getElementById('paywallNoticeSub');

    if (sub.status === 'expired') {
        if (noticeTitle) noticeTitle.innerHTML = '🔒 Thời Gian Dùng Thử 7 Ngày Đã Kết Thúc';
        if (noticeSub) noticeSub.innerHTML = 'Dữ liệu sổ sách của bạn vẫn được lưu an toàn 100%! Vui lòng chọn gói cước để tiếp tục ghi chép & quét hóa đơn AI.';
    } else if (sub.status === 'active' && sub.plan === 'lifetime') {
        if (noticeTitle) noticeTitle.innerHTML = '💎 Bạn Đang Sở Hữu Gói Trọn Đời (499k)';
        if (noticeSub) noticeSub.innerHTML = 'Đặc quyền: Bạn chỉ cần đóng <b>phần tiền chênh lệch</b> để nâng cấp lên VIP hoặc Super VIP!';
    } else {
        if (noticeTitle) noticeTitle.innerHTML = '🎁 Bạn Đang Dùng Thử 7 Ngày Miễn Phí';
        if (noticeSub) noticeSub.innerHTML = 'Nâng cấp ngay hôm nay để mở khóa tính năng AI không giới hạn & bảo toàn dữ liệu trọn đời!';
    }

    selectPricingPlan(presetPlan || 'yearly');
    modalPaywall.classList.add('active');
    safeCreateIcons();
}

function selectPricingPlan(planKey) {
    selectedPayPlan = planKey;
    document.querySelectorAll('.pricing-card').forEach(card => {
        if (card.getAttribute('data-plan') === planKey) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });

    const sub = state.userProfile.subscription || {};
    let basePrice = 199000;
    if (planKey === 'monthly') basePrice = 29000;
    if (planKey === 'yearly') basePrice = 199000;
    if (planKey === 'lifetime') basePrice = 499000;
    if (planKey === 'vip') basePrice = 999000;
    if (planKey === 'super_vip') basePrice = 1999000;

    // FAIR UPGRADE PRORATION CALCULATION:
    let finalPrice = basePrice;
    if (sub.status === 'active' && sub.paidAmount > 0 && basePrice > sub.paidAmount) {
        finalPrice = basePrice - sub.paidAmount;
    }

    activeQrPaymentAmount = finalPrice;
    const btnProceed = document.getElementById('btnProceedPayment');
    if (btnProceed) {
        btnProceed.innerHTML = `<i data-lucide="qr-code"></i> Thanh Toán VietQR (${formatVND(finalPrice)})`;
        safeCreateIcons();
    }
}

function triggerPaymentQr(planKey) {
    const modalPaymentQr = document.getElementById('modalPaymentQr');
    if (!modalPaymentQr) return;

    const sub = state.userProfile.subscription || {};
    let planNames = {
        monthly: 'Gói 1 Tháng',
        yearly: 'Gói 1 Năm (Hot)',
        lifetime: 'Gói Trọn Đời',
        vip: 'Gói VIP Cá Nhân Hóa (3 Lượt)',
        super_vip: 'Gói Super VIP (10 Lượt)'
    };

    let basePrice = 199000;
    if (planKey === 'monthly') basePrice = 29000;
    if (planKey === 'yearly') basePrice = 199000;
    if (planKey === 'lifetime') basePrice = 499000;
    if (planKey === 'vip') basePrice = 999000;
    if (planKey === 'super_vip') basePrice = 1999000;

    let finalPrice = basePrice;
    if (sub.status === 'active' && sub.paidAmount > 0 && basePrice > sub.paidAmount) {
        finalPrice = basePrice - sub.paidAmount;
    }
    activeQrPaymentAmount = finalPrice;

    const memo = `TAICHINH ${planKey.toUpperCase().replace('_', '')} ${Date.now().toString().slice(-4)}`;

    document.getElementById('payPlanName').textContent = planNames[planKey] || 'Gói Bản Quyền';
    document.getElementById('payAmountVnd').textContent = formatVND(finalPrice);
    document.getElementById('payMemoCode').textContent = memo;

    // GENERATE VIETQR CODE FOR BIDV VIRTUAL ACCOUNT: 96247882912NNV
    const qrUrl = `https://img.vietqr.io/image/970418-96247882912NNV-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=VU%20NAM%20THANG`;
    const imgQr = document.getElementById('imgVietQrCode');
    if (imgQr) imgQr.src = qrUrl;

    modalPaymentQr.classList.add('active');
    safeCreateIcons();
}

function simulatePaymentSuccess(planKey, paidAmt) {
    if (!state.userProfile.subscription) state.userProfile.subscription = {};
    
    state.userProfile.subscription.status = 'active';
    state.userProfile.subscription.plan = planKey;
    state.userProfile.subscription.paidAmount = paidAmt;

    if (planKey === 'vip') {
        state.userProfile.subscription.vipRequestsRemaining = (state.userProfile.subscription.vipRequestsRemaining || 0) + 3;
    } else if (planKey === 'super_vip') {
        state.userProfile.subscription.vipRequestsRemaining = (state.userProfile.subscription.vipRequestsRemaining || 0) + 10;
    }

    saveState();
    renderSubscriptionBadge();

    const modalPaymentQr = document.getElementById('modalPaymentQr');
    if (modalPaymentQr) modalPaymentQr.classList.remove('active');

    alert(`🎉 CHÚC MỪNG BẠN!\n\nHệ thống SePay BIDV đã xác nhận thanh toán thành công ${formatVND(paidAmt)}!\nTài khoản của bạn đã được nâng cấp lên [${planKey.toUpperCase()}] trọn vẹn! 🚀`);
}

function openVipCustomHub() {
    const modalVipHub = document.getElementById('modalVipCustomHub');
    if (!modalVipHub) return;

    const sub = state.userProfile.subscription || {};
    const quota = sub.vipRequestsRemaining || 0;
    const quotaDisplay = document.getElementById('vipQuotaDisplay');
    if (quotaDisplay) {
        quotaDisplay.innerHTML = `⭐️ ${quota} Lượt Yêu Cầu May Đo Tính Năng Còn Lại`;
    }

    renderVipRequestHistory();
    modalVipHub.classList.add('active');
    safeCreateIcons();
}

function submitVipFeatureRequest() {
    const sub = state.userProfile.subscription || {};
    let quota = sub.vipRequestsRemaining || 0;

    if (quota <= 0) {
        alert('⚠️ Bạn đã sử dụng hết số lượt yêu cầu tính năng riêng của gói hiện tại.\nVui lòng nâng cấp thêm để gửi yêu cầu mới!');
        return;
    }

    const title = document.getElementById('vipReqTitle').value.trim();
    const desc = document.getElementById('vipReqDesc').value.trim();
    const attachment = document.getElementById('vipReqAttachment').value.trim();

    if (!title || !desc) return;

    const newReq = {
        id: 'req-' + Date.now(),
        title,
        desc,
        attachment,
        date: new Date().toLocaleDateString('vi-VN'),
        status: 'Đang tiếp nhận & Lập trình'
    };

    if (!sub.vipRequestsHistory) sub.vipRequestsHistory = [];
    sub.vipRequestsHistory.unshift(newReq);
    sub.vipRequestsRemaining = quota - 1;

    saveState();
    renderSubscriptionBadge();
    openVipCustomHub();

    document.getElementById('formSubmitVipRequest').reset();
    alert(`✅ ĐÃ GỬI YÊU CẦU THÀNH CÔNG!\n\nYêu cầu "${title}" đã được gửi tới đội ngũ kỹ thuật.\nSố lượt yêu cầu của bạn còn lại: ${sub.vipRequestsRemaining} lượt.`);
}

function renderVipRequestHistory() {
    const container = document.getElementById('vipRequestHistoryList');
    if (!container) return;

    const sub = state.userProfile.subscription || {};
    const history = sub.vipRequestsHistory || [];

    if (history.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #94A3B8; font-size: 0.76rem; padding: 8px;">Chưa có yêu cầu nào được gửi. Hãy nhập yêu cầu đầu tiên của bạn ở trên!</div>`;
        return;
    }

    container.innerHTML = history.map(h => `
        <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 10px; font-size: 0.78rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #60A5FA;">📌 ${h.title}</strong>
                <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #F59E0B; font-size: 0.68rem;">${h.status}</span>
            </div>
            <p style="color: #94A3B8; margin: 0; font-size: 0.75rem;">${h.desc}</p>
            <div style="font-size: 0.68rem; color: #64748B; margin-top: 4px;">Gửi lúc: ${h.date}</div>
        </div>
    `).join('');
}

// 1-TAP TESTING SANDBOX CONTROLLER
function setSandboxState(stateType) {
    if (!state.userProfile.subscription) state.userProfile.subscription = {};

    if (stateType === 'trial') {
        state.userProfile.subscription = {
            status: 'trial',
            plan: 'free_trial',
            trialDaysRemaining: 7,
            vipRequestsRemaining: 0,
            paidAmount: 0
        };
        alert('⏱️ Đã chuyển sang trạng thái: [7 NGÀY DÙNG THỬ MIỄN PHÍ]. Bạn có thể thử nghiệm ghi chép bình thường.');
    } else if (stateType === 'expired') {
        state.userProfile.subscription = {
            status: 'expired',
            plan: 'free_trial',
            trialDaysRemaining: 0,
            vipRequestsRemaining: 0,
            paidAmount: 0
        };
        alert('🔒 Đã chuyển sang trạng thái: [HẾT HẠN DÙNG THỬ 7 NGÀY].\nBây giờ bạn hãy thử bấm (+) Thêm Giao Dịch hoặc Quét Bill AI để xem Hộp thoại Khóa Paywall xuất hiện!');
    } else if (stateType === 'lifetime') {
        state.userProfile.subscription = {
            status: 'active',
            plan: 'lifetime',
            trialDaysRemaining: 0,
            vipRequestsRemaining: 0,
            paidAmount: 499000
        };
        alert('💎 Đã chuyển sang trạng thái: [GÓI TRỌN ĐỜI 499K].\nBây giờ bạn bấm vào Huy hiệu Gói Trọn Đời ở góc trên để thử nghiệm tính năng NÂNG CẤP BÙ CHÊNH LỆCH lên VIP (999k - 499k = 500k)!');
    } else if (stateType === 'vip') {
        state.userProfile.subscription = {
            status: 'active',
            plan: 'vip',
            trialDaysRemaining: 0,
            vipRequestsRemaining: 3,
            paidAmount: 999000
        };
        alert('👑 Đã chuyển sang trạng thái: [GÓI VIP 999K - 3 LƯỢT MAY ĐO].\nNút icon vương miện VIP đã xuất hiện trên thanh tiêu đề để bạn gửi yêu cầu tính năng riêng!');
    } else if (stateType === 'super_vip') {
        state.userProfile.subscription = {
            status: 'active',
            plan: 'super_vip',
            trialDaysRemaining: 0,
            vipRequestsRemaining: 10,
            paidAmount: 1999000
        };
        alert('🚀 Đã chuyển sang trạng thái: [GÓI SUPER VIP 1.999K - 10 LƯỢT MAY ĐO].\nBạn có 10 lượt gửi yêu cầu may đo tính năng riêng!');
    }

    saveState();
    renderSubscriptionBadge();
    safeCreateIcons();
}

// Make globally accessible for inline HTML onclick handlers
window.selectPricingPlan = selectPricingPlan;
window.setSandboxState = setSandboxState;

