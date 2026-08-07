/* ==========================================================================
   Focus Studio - Pomodoro Application Engine
   ========================================================================== */

class PomodoroApp {
  constructor() {
    // Default Settings
    this.settings = {
      workTime: 25,
      shortBreakTime: 5,
      longBreakTime: 15,
      autoStartBreaks: false,
      autoStartPomos: false,
      autoOpenPip: true,
      alarmSound: 'chime'
    };

    // State Variables
    this.currentMode = 'work'; // 'work' | 'shortBreak' | 'longBreak'
    this.timeLeft = this.settings.workTime * 60;
    this.totalTime = this.settings.workTime * 60;
    this.isRunning = false;
    this.timerInterval = null;
    this.completedPomos = 0;
    this.currentCycle = 1;

    // Tasks & Active Task
    this.tasks = [];
    this.activeTaskId = null;

    // Analytics Data
    this.stats = {}; // Format: { 'YYYY-MM-DD': { pomos: 0, focusMinutes: 0 } }
    this.documentPipWindow = null;

    // Init App
    this.init();
  }

  init() {
    this.loadLocalStorage();
    this.bindDOM();
    this.bindEvents();
    this.setupMediaSession();
    this.updateDisplay();
    this.renderTasks();
    this.renderStats();
    this.setupKeyboardShortcuts();
  }

  /* ------------------------------------------------------------------------
     Local Storage Persistence
     ------------------------------------------------------------------------ */
  loadLocalStorage() {
    const savedSettings = localStorage.getItem('pomodoro_settings');
    if (savedSettings) this.settings = { ...this.settings, ...JSON.parse(savedSettings) };

    const savedTasks = localStorage.getItem('pomodoro_tasks');
    if (savedTasks) this.tasks = JSON.parse(savedTasks);

    const savedStats = localStorage.getItem('pomodoro_stats');
    if (savedStats) this.stats = JSON.parse(savedStats);

    const savedTheme = localStorage.getItem('pomodoro_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    this.timeLeft = this.getModeDuration(this.currentMode) * 60;
    this.totalTime = this.timeLeft;
  }

  saveSettings() {
    localStorage.setItem('pomodoro_settings', JSON.stringify(this.settings));
  }

  saveTasks() {
    localStorage.setItem('pomodoro_tasks', JSON.stringify(this.tasks));
  }

  saveStats() {
    localStorage.setItem('pomodoro_stats', JSON.stringify(this.stats));
  }

  /* ------------------------------------------------------------------------
     DOM Elements Binding
     ------------------------------------------------------------------------ */
  bindDOM() {
    this.timerDisplay = document.getElementById('timer-display');
    this.sessionStatus = document.getElementById('session-status');
    this.cycleCountDisplay = document.getElementById('cycle-count-display');
    this.cyclesRemainingDisplay = document.getElementById('cycles-remaining-display');
    this.progressBar = document.getElementById('progress-bar');

    this.startPauseBtn = document.getElementById('start-pause-btn');
    this.startBtnText = document.getElementById('start-btn-text');
    this.startBtnIcon = document.getElementById('start-btn-icon');
    this.resetBtn = document.getElementById('reset-btn');
    this.skipBtn = document.getElementById('skip-btn');

    this.modeBtns = document.querySelectorAll('.mode-btn');
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    // Tasks Elements
    this.addTaskForm = document.getElementById('add-task-form');
    this.taskInput = document.getElementById('task-input');
    this.pomoEstInput = document.getElementById('pomo-est');
    this.tasksList = document.getElementById('tasks-list');
    this.tasksCounter = document.getElementById('tasks-counter');
    this.activeTaskBanner = document.getElementById('active-task-banner');
    this.activeTaskTitle = document.getElementById('active-task-title');

    // Modals
    this.settingsBtn = document.getElementById('settings-btn');
    this.settingsModal = document.getElementById('settings-modal');
    this.closeSettingsBtn = document.getElementById('close-settings-btn');
    this.saveSettingsBtn = document.getElementById('save-settings-btn');

    // PiP Elements
    this.pipBtn = document.getElementById('pip-btn');
    this.floatWidgetBtn = document.getElementById('float-widget-btn');
    this.pipCanvas = document.getElementById('pip-canvas');
    this.pipVideo = document.getElementById('pip-video');

    this.statsBtn = document.getElementById('stats-btn');
    this.statsModal = document.getElementById('stats-modal');
    this.closeStatsBtn = document.getElementById('close-stats-btn');

    // Settings Inputs
    this.workTimeInput = document.getElementById('work-time-input');
    this.shortBreakInput = document.getElementById('short-break-input');
    this.longBreakInput = document.getElementById('long-break-input');
    this.autoStartBreaksCheckbox = document.getElementById('auto-start-breaks');
    this.autoStartPomosCheckbox = document.getElementById('auto-start-pomos');
    this.autoOpenPipCheckbox = document.getElementById('auto-open-pip');
    this.alarmSoundSelect = document.getElementById('alarm-sound-select');
    this.requestNotificationBtn = document.getElementById('request-notification-btn');

    // Sound Sliders
    this.soundSliders = document.querySelectorAll('.sound-slider');
    this.masterSoundToggle = document.getElementById('master-sound-toggle');
  }

  /* ------------------------------------------------------------------------
     Event Listeners
     ------------------------------------------------------------------------ */
  bindEvents() {
    // Mode Switching
    this.modeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.currentTarget.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Control Buttons
    this.startPauseBtn.addEventListener('click', () => this.toggleTimer());
    this.resetBtn.addEventListener('click', () => this.resetTimer());
    this.skipBtn.addEventListener('click', () => this.skipSession());

    // Theme Toggle
    this.themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('pomodoro_theme', next);
    });

    // Tasks Form Submit
    this.addTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addTask(this.taskInput.value.trim(), parseInt(this.pomoEstInput.value));
      this.taskInput.value = '';
    });

    // Sound Sliders
    this.soundSliders.forEach(slider => {
      slider.addEventListener('input', (e) => {
        const soundKey = e.target.closest('.sound-item').dataset.sound;
        const volume = e.target.value;
        window.soundEngine.setAmbientVolume(soundKey, volume);
      });
    });

    this.masterSoundToggle.addEventListener('click', () => {
      this.soundSliders.forEach(slider => {
        slider.value = 0;
      });
      window.soundEngine.stopAllAmbient();
    });

    // Settings
    this.settingsBtn.addEventListener('click', () => this.openSettings());
    this.closeSettingsBtn.addEventListener('click', () => this.closeSettings());
    this.saveSettingsBtn.addEventListener('click', () => this.applySettings());

    // PiP Floating Window Triggers
    if (this.pipBtn) this.pipBtn.addEventListener('click', () => this.togglePictureInPicture());
    if (this.floatWidgetBtn) this.floatWidgetBtn.addEventListener('click', () => this.togglePictureInPicture());

    // Stats Modal
    this.statsBtn.addEventListener('click', () => {
      this.renderStats();
      this.statsModal.classList.remove('hidden');
    });
    this.closeStatsBtn.addEventListener('click', () => {
      this.statsModal.classList.add('hidden');
    });

    // Desktop Notification Request
    this.requestNotificationBtn.addEventListener('click', () => {
      if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            alert('Đã kích hoạt thông báo Desktop thành công!');
          }
        });
      }
    });

    // Close Modals on Overlay Click
    [this.settingsModal, this.statsModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
      });
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.toggleTimer();
      } else if (e.code === 'KeyR') {
        this.resetTimer();
      } else if (e.code === 'KeyS') {
        this.skipSession();
      }
    });
  }

  /* ------------------------------------------------------------------------
     Timer Core Logic
     ------------------------------------------------------------------------ */
  getModeDuration(mode) {
    switch (mode) {
      case 'shortBreak': return this.settings.shortBreakTime;
      case 'longBreak': return this.settings.longBreakTime;
      case 'work':
      default: return this.settings.workTime;
    }
  }

  switchMode(mode) {
    if (this.isRunning) this.pauseTimer();

    this.currentMode = mode;
    document.body.setAttribute('data-current-mode', mode);

    this.modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.totalTime = this.getModeDuration(mode) * 60;
    this.timeLeft = this.totalTime;
    this.updateDisplay();
  }

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    window.soundEngine.initContext();
    this.isRunning = true;
    this.updateStartBtnUI();

    // Auto open Floating Widget if enabled and not already open
    if (this.settings.autoOpenPip !== false && !this.documentPipWindow && !document.pictureInPictureElement) {
      this.togglePictureInPicture();
    }

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        this.onTimerComplete();
      }
    }, 1000);
  }

  pauseTimer() {
    this.isRunning = false;
    clearInterval(this.timerInterval);
    this.updateStartBtnUI();
  }

  resetTimer() {
    this.pauseTimer();
    this.timeLeft = this.totalTime;
    this.updateDisplay();
  }

  skipSession() {
    this.pauseTimer();
    this.handleNextSession();
  }

  onTimerComplete() {
    this.pauseTimer();

    // Play Alarm Sound
    window.soundEngine.playAlarm(this.settings.alarmSound);

    // Desktop Notification
    this.sendNotification();

    // Confetti Animation on Work Complete
    if (this.currentMode === 'work') {
      this.triggerConfetti();
      this.completedPomos++;
      this.recordStats(this.settings.workTime);

      // Increment active task pomos
      if (this.activeTaskId) {
        const task = this.tasks.find(t => t.id === this.activeTaskId);
        if (task) {
          task.completedPomos = (task.completedPomos || 0) + 1;
          this.saveTasks();
          this.renderTasks();
        }
      }
    }

    this.handleNextSession();
  }

  handleNextSession() {
    if (this.currentMode === 'work') {
      if (this.currentCycle % 4 === 0) {
        this.switchMode('longBreak');
      } else {
        this.switchMode('shortBreak');
      }
      this.currentCycle++;

      if (this.settings.autoStartBreaks) this.startTimer();
    } else {
      this.switchMode('work');
      if (this.settings.autoStartPomos) this.startTimer();
    }
  }

  sendNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = this.currentMode === 'work' ? '🎉 Đã hoàn thành Pomodoro!' : '🔔 Hết giờ nghỉ!';
      const body = this.currentMode === 'work' 
        ? 'Xuất sắc! Hãy nghỉ ngơi một chút nhé.' 
        : 'Sẵn sàng bắt đầu lượt làm việc tiếp theo!';
      
      new Notification(title, { body });
    }
  }

  /* ------------------------------------------------------------------------
     UI Updates & Renderers
     ------------------------------------------------------------------------ */
  updateDisplay() {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    this.timerDisplay.textContent = timeStr;

    // Browser Tab Title
    const modeLabel = this.currentMode === 'work' ? 'Làm việc' : 'Nghỉ ngơi';
    document.title = `(${timeStr}) ${modeLabel} - Focus Studio`;

    // Session Status Label
    if (this.currentMode === 'work') {
      this.sessionStatus.textContent = this.isRunning ? '🔥 Đang tập trung cao độ...' : 'Sẵn sàng tập trung!';
    } else if (this.currentMode === 'shortBreak') {
      this.sessionStatus.textContent = '☕ Thời gian nghỉ ngắn...';
    } else {
      this.sessionStatus.textContent = '🌴 Thời gian nghỉ dài...';
    }

    // Cycle Tracker
    this.cycleCountDisplay.textContent = `Lượt #${this.currentCycle}`;
    const rem = 4 - ((this.currentCycle - 1) % 4);
    this.cyclesRemainingDisplay.textContent = `${rem} lượt nữa tới Nghỉ dài`;

    // Progress Ring Fill Calculation
    const radius = 130;
    const circumference = 2 * Math.PI * radius; // 816.814
    const progress = this.totalTime > 0 ? (this.totalTime - this.timeLeft) / this.totalTime : 0;
    const offset = circumference * (1 - progress);
    this.progressBar.style.strokeDashoffset = offset;

    // Update PiP Floating Windows
    this.updatePipCanvas();
    this.updateDocumentPipUI();

    // MediaSession Metadata Update
    if ('mediaSession' in navigator) {
      const modeLabel = this.currentMode === 'work' ? '🔥 Làm việc' : (this.currentMode === 'shortBreak' ? '☕ Nghỉ ngắn' : '🌴 Nghỉ dài');
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${timeStr} - ${modeLabel}`,
        artist: 'Focus Studio Pomodoro',
        album: `Lượt #${this.currentCycle}`
      });
    }
  }

  updateStartBtnUI() {
    if (this.isRunning) {
      this.startBtnText.textContent = 'Tạm dừng';
      this.startBtnIcon.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    } else {
      this.startBtnText.textContent = 'Bắt đầu';
      this.startBtnIcon.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }
  }

  /* ------------------------------------------------------------------------
     Interactive Picture-in-Picture & Floating Window Engine
     ------------------------------------------------------------------------ */
  setupMediaSession() {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (!this.isRunning) this.startTimer();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (this.isRunning) this.pauseTimer();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          this.skipSession();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          this.resetTimer();
        });
      } catch (e) {
        console.log('MediaSession action handlers not supported:', e);
      }
    }
  }

  async togglePictureInPicture() {
    // 1. Try Document Picture-in-Picture API (Chrome 116+ / Edge 116+ Interactive Window)
    if ('documentPictureInPicture' in window) {
      if (this.documentPipWindow) {
        this.documentPipWindow.close();
        this.documentPipWindow = null;
        return;
      }

      try {
        this.documentPipWindow = await window.documentPictureInPicture.requestWindow({
          width: 250,
          height: 190
        });

        // Copy All Document Styles to Floating Window
        [...document.styleSheets].forEach((styleSheet) => {
          try {
            const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
            const style = document.createElement('style');
            style.textContent = cssRules;
            this.documentPipWindow.document.head.appendChild(style);
          } catch (e) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            this.documentPipWindow.document.head.appendChild(link);
          }
        });

        // Setup Floating Window Document Body
        this.documentPipWindow.document.body.className = 'pip-widget-body';
        this.documentPipWindow.document.body.innerHTML = `
          <div class="pip-widget-container" id="pip-container">
            <div class="pip-header">
              <span class="badge" id="pip-badge">🔥 Làm việc</span>
              <span class="cycle-tracker" id="pip-cycle">Lượt #1</span>
            </div>

            <div class="pip-timer-box">
              <div class="timer-digits" id="pip-digits">25:00</div>
              <div class="session-label" id="pip-status">Sẵn sàng tập trung!</div>
            </div>

            <div class="pip-controls">
              <button id="pip-btn-reset" class="control-btn secondary" title="Đặt lại (R)">🔄</button>
              <button id="pip-btn-main" class="control-btn primary">
                <span id="pip-main-icon">▶️</span>
                <span id="pip-main-text">Bắt đầu</span>
              </button>
              <button id="pip-btn-skip" class="control-btn secondary" title="Bỏ qua (S)">⏭️</button>
            </div>

            <div class="pip-active-task" id="pip-task">🎯 Chưa chọn task</div>
          </div>
        `;

        // Bind Interactive Event Handlers Directly Inside Floating Window
        const pipDoc = this.documentPipWindow.document;
        pipDoc.getElementById('pip-btn-main').addEventListener('click', () => this.toggleTimer());
        pipDoc.getElementById('pip-btn-reset').addEventListener('click', () => this.resetTimer());
        pipDoc.getElementById('pip-btn-skip').addEventListener('click', () => this.skipSession());

        // Clean up on close
        this.documentPipWindow.addEventListener('pagehide', () => {
          this.documentPipWindow = null;
        });

        this.updateDocumentPipUI();
        return;
      } catch (err) {
        console.warn('Document Picture-in-Picture fallback to Canvas Video PiP:', err);
      }
    }

    // 2. Video Picture-in-Picture Fallback (for older browsers)
    if (!('pictureInPictureEnabled' in document)) {
      alert('Trình duyệt của bạn chưa hỗ trợ tính năng Picture-in-Picture.');
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        this.updatePipCanvas();
        const stream = this.pipCanvas.captureStream(30);
        this.pipVideo.srcObject = stream;
        await this.pipVideo.play();
        await this.pipVideo.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Lỗi Picture-in-Picture:', err);
      alert('Vui lòng tương tác với giao diện trước khi bật cửa sổ nổi!');
    }
  }

  updateDocumentPipUI() {
    if (!this.documentPipWindow) return;
    const doc = this.documentPipWindow.document;

    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const digitsEl = doc.getElementById('pip-digits');
    const badgeEl = doc.getElementById('pip-badge');
    const statusEl = doc.getElementById('pip-status');
    const cycleEl = doc.getElementById('pip-cycle');
    const mainBtnText = doc.getElementById('pip-main-text');
    const mainBtnIcon = doc.getElementById('pip-main-icon');
    const taskEl = doc.getElementById('pip-task');
    const container = doc.getElementById('pip-container');

    if (digitsEl) digitsEl.textContent = timeStr;
    if (cycleEl) cycleEl.textContent = `Lượt #${this.currentCycle}`;

    if (container) container.setAttribute('data-current-mode', this.currentMode);

    if (this.currentMode === 'work') {
      if (badgeEl) badgeEl.textContent = '🔥 Làm việc';
      if (statusEl) statusEl.textContent = this.isRunning ? '🔥 Đang tập trung cao độ...' : 'Sẵn sàng tập trung!';
    } else if (this.currentMode === 'shortBreak') {
      if (badgeEl) badgeEl.textContent = '☕ Nghỉ ngắn';
      if (statusEl) statusEl.textContent = this.isRunning ? '☕ Đang nghỉ ngơi...' : 'Sẵn sàng nghỉ ngơi!';
    } else {
      if (badgeEl) badgeEl.textContent = '🌴 Nghỉ dài';
      if (statusEl) statusEl.textContent = this.isRunning ? '🌴 Đang nghỉ dài...' : 'Sẵn sàng nghỉ dài!';
    }

    if (this.isRunning) {
      if (mainBtnIcon) mainBtnIcon.textContent = '⏸️';
      if (mainBtnText) mainBtnText.textContent = 'Tạm dừng';
    } else {
      if (this.currentMode === 'work') {
        if (mainBtnIcon) mainBtnIcon.textContent = '▶️';
        if (mainBtnText) mainBtnText.textContent = 'Bắt đầu';
      } else {
        if (mainBtnIcon) mainBtnIcon.textContent = '☕';
        if (mainBtnText) mainBtnText.textContent = 'Bắt đầu nghỉ';
      }
    }

    const activeTask = this.tasks.find(t => t.id === this.activeTaskId);
    if (taskEl) {
      if (activeTask) {
        taskEl.textContent = `🎯 ${activeTask.title}`;
        taskEl.style.display = 'inline-block';
      } else {
        taskEl.style.display = 'none';
      }
    }
  }

  updatePipCanvas() {
    if (!this.pipCanvas) return;
    const ctx = this.pipCanvas.getContext('2d');
    const w = 400;
    const h = 400;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Dark Card Background
    ctx.fillStyle = '#0b0f19';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(10, 10, w - 20, h - 20, 32);
    } else {
      ctx.rect(10, 10, w - 20, h - 20);
    }
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Accent Colors
    let accent = '#f43f5e';
    let modeText = '🔥 LÀM VIỆC';
    if (this.currentMode === 'shortBreak') {
      accent = '#10b981';
      modeText = '☕ NGHỈ NGẮN';
    } else if (this.currentMode === 'longBreak') {
      accent = '#0ea5e9';
      modeText = '🌴 NGHỈ DÀI';
    }

    const centerX = w / 2;
    const centerY = h / 2 - 15;
    const radius = 135;

    // Progress Ring Background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress Arc Fill
    const progress = this.totalTime > 0 ? (this.totalTime - this.timeLeft) / this.totalTime : 0;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + progress * Math.PI * 2;

    ctx.strokeStyle = accent;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.stroke();

    // Time Digits
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 76px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, centerX, centerY - 10);

    // Mode Text
    ctx.fillStyle = accent;
    ctx.font = 'bold 22px Outfit, sans-serif';
    ctx.fillText(modeText, centerX, centerY + 50);

    // Footer Info
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    const cycleText = `Lượt #${this.currentCycle} · Focus Studio`;
    ctx.fillText(cycleText, centerX, h - 35);
  }

  /* ------------------------------------------------------------------------
     Tasks System
     ------------------------------------------------------------------------ */
  addTask(title, estPomos) {
    if (!title) return;

    const newTask = {
      id: Date.now().toString(),
      title,
      estPomos: estPomos || 1,
      completedPomos: 0,
      isDone: false
    };

    this.tasks.push(newTask);
    if (this.tasks.length === 1) this.activeTaskId = newTask.id;

    this.saveTasks();
    this.renderTasks();
  }

  toggleTaskDone(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.isDone = !task.isDone;
      this.saveTasks();
      this.renderTasks();
    }
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    if (this.activeTaskId === id) {
      this.activeTaskId = this.tasks.length > 0 ? this.tasks[0].id : null;
    }
    this.saveTasks();
    this.renderTasks();
  }

  setActiveTask(id) {
    this.activeTaskId = id;
    this.renderTasks();
  }

  renderTasks() {
    this.tasksList.innerHTML = '';
    const completedCount = this.tasks.filter(t => t.isDone).length;
    this.tasksCounter.textContent = `${completedCount}/${this.tasks.length}`;

    if (this.tasks.length === 0) {
      this.tasksList.innerHTML = `<li class="task-empty" style="color:var(--text-muted);font-size:0.85rem;text-align:center;padding:1rem;">Chưa có mục tiêu nào. Thêm ở trên!</li>`;
      this.activeTaskBanner.classList.add('hidden');
      return;
    }

    const activeTask = this.tasks.find(t => t.id === this.activeTaskId);
    if (activeTask) {
      this.activeTaskBanner.classList.remove('hidden');
      this.activeTaskTitle.textContent = `${activeTask.title} (${activeTask.completedPomos || 0}/${activeTask.estPomos} 🍅)`;
    } else {
      this.activeTaskBanner.classList.add('hidden');
    }

    this.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.isDone ? 'completed' : ''} ${task.id === this.activeTaskId ? 'active-task' : ''}`;
      
      li.innerHTML = `
        <div class="task-main">
          <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''}>
          <span class="task-title-text">${this.escapeHTML(task.title)}</span>
        </div>
        <div class="task-meta">
          <span class="task-pomo-count">🍅 ${task.completedPomos || 0}/${task.estPomos}</span>
          <button class="delete-task-btn">&times;</button>
        </div>
      `;

      // Checkbox event
      const checkbox = li.querySelector('.task-checkbox');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleTaskDone(task.id);
      });

      // Delete event
      const delBtn = li.querySelector('.delete-task-btn');
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteTask(task.id);
      });

      // Click select active task
      li.addEventListener('click', () => this.setActiveTask(task.id));

      this.tasksList.appendChild(li);
    });
  }

  escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  /* ------------------------------------------------------------------------
     Settings Modal Logic
     ------------------------------------------------------------------------ */
  openSettings() {
    this.workTimeInput.value = this.settings.workTime;
    this.shortBreakInput.value = this.settings.shortBreakTime;
    this.longBreakInput.value = this.settings.longBreakTime;
    this.autoStartBreaksCheckbox.checked = this.settings.autoStartBreaks;
    this.autoStartPomosCheckbox.checked = this.settings.autoStartPomos;
    if (this.autoOpenPipCheckbox) this.autoOpenPipCheckbox.checked = this.settings.autoOpenPip !== false;
    this.alarmSoundSelect.value = this.settings.alarmSound;

    this.settingsModal.classList.remove('hidden');
  }

  closeSettings() {
    this.settingsModal.classList.add('hidden');
  }

  applySettings() {
    this.settings.workTime = Math.max(1, parseInt(this.workTimeInput.value) || 25);
    this.settings.shortBreakTime = Math.max(1, parseInt(this.shortBreakInput.value) || 5);
    this.settings.longBreakTime = Math.max(1, parseInt(this.longBreakInput.value) || 15);
    this.settings.autoStartBreaks = this.autoStartBreaksCheckbox.checked;
    this.settings.autoStartPomos = this.autoStartPomosCheckbox.checked;
    if (this.autoOpenPipCheckbox) this.settings.autoOpenPip = this.autoOpenPipCheckbox.checked;
    this.settings.alarmSound = this.alarmSoundSelect.value;

    this.saveSettings();
    this.closeSettings();
    this.switchMode(this.currentMode);
  }

  /* ------------------------------------------------------------------------
     Analytics & Stats System
     ------------------------------------------------------------------------ */
  recordStats(minutes) {
    const today = new Date().toISOString().split('T')[0];
    if (!this.stats[today]) {
      this.stats[today] = { pomos: 0, focusMinutes: 0 };
    }
    this.stats[today].pomos += 1;
    this.stats[today].focusMinutes += minutes;
    this.saveStats();
  }

  renderStats() {
    const statTotalPomos = document.getElementById('stat-total-pomos');
    const statFocusTime = document.getElementById('stat-focus-time');
    const statStreak = document.getElementById('stat-streak');
    const barChart = document.getElementById('bar-chart');

    let totalPomos = 0;
    let totalMinutes = 0;

    Object.values(this.stats).forEach(day => {
      totalPomos += day.pomos || 0;
      totalMinutes += day.focusMinutes || 0;
    });

    statTotalPomos.textContent = totalPomos;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    statFocusTime.textContent = `${hours}h ${mins}m`;
    statStreak.textContent = `${this.calculateStreak()} ngày`;

    // 7 Day Chart
    barChart.innerHTML = '';
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }

    const maxMinutes = Math.max(...days.map(d => (this.stats[d] ? this.stats[d].focusMinutes : 0)), 60);

    days.forEach(d => {
      const dayData = this.stats[d] || { focusMinutes: 0 };
      const heightPercent = Math.min(100, Math.max(5, (dayData.focusMinutes / maxMinutes) * 100));
      const dayLabel = new Date(d).toLocaleDateString('vi-VN', { weekday: 'short' });

      const col = document.createElement('div');
      col.className = 'bar-column';
      col.innerHTML = `
        <div class="bar-fill" style="height: ${heightPercent}%;" title="${dayData.focusMinutes} phút"></div>
        <span class="bar-label">${dayLabel}</span>
      `;
      barChart.appendChild(col);
    });
  }

  calculateStreak() {
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = d.toISOString().split('T')[0];
      if (this.stats[key] && this.stats[key].pomos > 0) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  /* ------------------------------------------------------------------------
     Confetti Canvas Particles Animation
     ------------------------------------------------------------------------ */
  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#f43f5e', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 100
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        if (p.life > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2; // Gravity
          p.life -= 1.5;

          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / 100;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (alive) requestAnimationFrame(animate);
    }
    animate();
  }
}

// Initialize Application when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new PomodoroApp();
});
