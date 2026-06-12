import { firebaseConfig } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {

  // --- Configuration Check ---
  const isFirebaseActive = 
    firebaseConfig && 
    firebaseConfig.projectId && 
    !firebaseConfig.projectId.startsWith('YOUR_');

  // Local Mode Sync Channel
  let localChannel = null;

  // --- State Variables ---
  let currentUser = 'Priya'; // Active user identity
  let activeAssignee = ''; // Holds selected assignee during task compose
  let tasks = [];
  let previousTasksState = []; // Used to track changes for notification triggers
  let isInitialLoad = true; // Prevents spamming notifications for old tasks on boot

  // Google Calendar access token
  let gcalAccessToken = localStorage.getItem('gcal_access_token') || null;

  // Firebase references
  let auth = null;
  let db = null;
  let firestoreUnsubscribe = null;
  let galleriesUnsubscribe = null;
  let contactsUnsubscribe = null;
  let bookingsUnsubscribe = null;
  let shootsUnsubscribe = null;
  let albumsUnsubscribe = null;
  let galleries = [];
  let contacts = [];
  let bookings = [];
  let shoots = [];
  let albums = [];
  let searchFilter = '';

  // --- UI Elements ---
  const loginOverlay = document.getElementById('login-overlay');
  const loginCredentialsCard = document.getElementById('login-credentials-card');
  const loginProfileCard = document.getElementById('login-profile-card');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginStatusMsg = document.getElementById('login-status-msg');
  const dashboardApp = document.getElementById('dashboard-app');
  const identityPillsContainer = document.getElementById('identity-pills-container');
  const identityPills = document.querySelectorAll('.identity-pill');
  const assigneePills = document.querySelectorAll('.assignee-pill');
  const myTasksList = document.getElementById('my-tasks-list');
  const sentTasksList = document.getElementById('sent-tasks-list');
  const myTaskCount = document.getElementById('my-task-count');
  const taskForm = document.getElementById('task-form');
  const taskText = document.getElementById('task-text');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userDisplayLabel = document.getElementById('user-display-label');
  
  // Settings Modal Elements
  const settingsModal = document.getElementById('settings-modal');
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const changePasswordForm = document.getElementById('change-password-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const settingsStatusMsg = document.getElementById('settings-status-msg');

  // Backup Modal Elements
  const backupModal = document.getElementById('backup-modal');
  const backupBtn = document.getElementById('backup-btn');
  const closeBackupBtn = document.getElementById('close-backup-btn');
  const exportExcelBtn = document.getElementById('export-excel-btn');
  const restoreFileInput = document.getElementById('restore-file-input');
  const restoreMergeBtn = document.getElementById('restore-merge-btn');
  const restoreOverwriteBtn = document.getElementById('restore-overwrite-btn');
  const backupStatusMsg = document.getElementById('backup-status-msg');

  // Bookings Tab & Modal Elements
  const tabBookings = document.getElementById('tab-bookings');
  const bookingsSection = document.getElementById('bookings-section');
  const bookingsGrid = document.getElementById('bookings-grid');
  const addBookingBtn = document.getElementById('add-booking-btn');
  const bookingModal = document.getElementById('booking-modal');
  const closeBookingBtn = document.getElementById('close-booking-btn');
  const addBookingForm = document.getElementById('add-booking-form');
  const bookingClientName = document.getElementById('booking-client-name');
  const bookingPhone = document.getElementById('booking-phone');
  const bookingShootType = document.getElementById('booking-shoot-type');
  const bookingDate = document.getElementById('booking-date');
  const bookingTimeHour = document.getElementById('booking-time-hour');
  const bookingTimeMinute = document.getElementById('booking-time-minute');
  const bookingTimeAmpm = document.getElementById('booking-time-ampm');
  const bookingPackage = document.getElementById('booking-package');
  const bookingAdvance = document.getElementById('booking-advance');
  const bookingStatusMsg = document.getElementById('booking-status-msg');

  // Album Tab & Modal Elements
  const addAlbumBtn = document.getElementById('add-album-btn');
  const albumModal = document.getElementById('album-modal');
  const closeAlbumBtn = document.getElementById('close-album-btn');
  const addAlbumForm = document.getElementById('add-album-form');
  const albumClientName = document.getElementById('album-client-name');
  const albumNotesInput = document.getElementById('album-notes-input');
  const albumStatusMsg = document.getElementById('album-status-msg');

  const editAlbumModal = document.getElementById('edit-album-modal');
  const closeEditAlbumBtn = document.getElementById('close-edit-album-btn');
  const editAlbumForm = document.getElementById('edit-album-form');
  const editAlbumId = document.getElementById('edit-album-id');
  const editAlbumClientName = document.getElementById('edit-album-client-name');
  const editAlbumNotesInput = document.getElementById('edit-album-notes-input');
  const editAlbumStatusSelect = document.getElementById('edit-album-status-select');
  const editAlbumDeliveryContainer = document.getElementById('edit-album-delivery-container');
  const editAlbumDeliveryMethod = document.getElementById('edit-album-delivery-method');
  const bookingShootTypeCustomContainer = document.getElementById('booking-shoot-type-custom-container');
  const bookingShootTypeCustom = document.getElementById('booking-shoot-type-custom');
  const bookingPaymentAccount = document.getElementById('booking-payment-account');
  
  const editBookingModal = document.getElementById('edit-booking-modal');
  const closeEditBookingBtn = document.getElementById('close-edit-booking-btn');
  const editBookingForm = document.getElementById('edit-booking-form');
  const editBookingId = document.getElementById('edit-booking-id');
  const editBookingClientName = document.getElementById('edit-booking-client-name');
  const editBookingPhone = document.getElementById('edit-booking-phone');
  const editBookingShootType = document.getElementById('edit-booking-shoot-type');
  const editBookingDate = document.getElementById('edit-booking-date');
  const editBookingTimeHour = document.getElementById('edit-booking-time-hour');
  const editBookingTimeMinute = document.getElementById('edit-booking-time-minute');
  const editBookingTimeAmpm = document.getElementById('edit-booking-time-ampm');
  const editBookingPackage = document.getElementById('edit-booking-package');
  const editBookingAdvance = document.getElementById('edit-booking-advance');
  const editBookingStatusMsg = document.getElementById('edit-booking-status-msg');
  const editBookingShootTypeCustomContainer = document.getElementById('edit-booking-shoot-type-custom-container');
  const editBookingShootTypeCustom = document.getElementById('edit-booking-shoot-type-custom');
  const editBookingPaymentAccount = document.getElementById('edit-booking-payment-account');

  // Shoots Tracker UI Elements
  const shootsGrid = document.getElementById('completed-shoots-grid');
  const pendingShootsGrid = document.getElementById('pending-shoots-grid');
  const addShootBtn = document.getElementById('add-shoot-btn');
  const shootModal = document.getElementById('shoot-modal');
  const closeShootBtn = document.getElementById('close-shoot-btn');
  const addShootForm = document.getElementById('add-shoot-form');

  const shootBookingId = document.getElementById('shoot-booking-id');
  const shootClientName = document.getElementById('shoot-client-name');
  const shootDate = document.getElementById('shoot-date');
  const shootTimeHour = document.getElementById('shoot-time-hour');
  const shootTimeMinute = document.getElementById('shoot-time-minute');
  const shootTimeAmpm = document.getElementById('shoot-time-ampm');
  const shootPhotosCount = document.getElementById('shoot-photos-count');
  const shootAdvanceAmount = document.getElementById('shoot-advance-amount');
  const shootAdvanceAccount = document.getElementById('shoot-advance-account');
  const shootBalanceAmount = document.getElementById('shoot-balance-amount');
  const shootBalanceAccount = document.getElementById('shoot-balance-account');
  const shootSpecialRequests = document.getElementById('shoot-special-requests');
  const shootAlbumIncluded = document.getElementById('shoot-album-included');

  const editShootModal = document.getElementById('edit-shoot-modal');
  const closeEditShootBtn = document.getElementById('close-edit-shoot-btn');
  const editShootForm = document.getElementById('edit-shoot-form');

  const editShootId = document.getElementById('edit-shoot-id');
  const editShootClientName = document.getElementById('edit-shoot-client-name');
  const editShootDate = document.getElementById('edit-shoot-date');
  const editShootTimeHour = document.getElementById('edit-shoot-time-hour');
  const editShootTimeMinute = document.getElementById('edit-shoot-time-minute');
  const editShootTimeAmpm = document.getElementById('edit-shoot-time-ampm');
  const editShootPhotosCount = document.getElementById('edit-shoot-photos-count');
  const editShootAdvanceAmount = document.getElementById('edit-shoot-advance-amount');
  const editShootAdvanceAccount = document.getElementById('edit-shoot-advance-account');
  const editShootBalanceAmount = document.getElementById('edit-shoot-balance-amount');
  const editShootBalanceAccount = document.getElementById('edit-shoot-balance-account');
  const editShootSpecialRequests = document.getElementById('edit-shoot-special-requests');
  const editShootAlbumIncluded = document.getElementById('edit-shoot-album-included');

  // --- Web Audio API Chime Synth ---
  const playSound = (type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;

      if (type === 'new_task') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now); // A4
        osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'task_complete') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.24); // C6
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.06, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.log('Audio autoplay blocked or unsupported:', e);
    }
  };

  // --- Toast Notifications System ---
  const toastsContainer = document.getElementById('toasts-container');

  const showToast = (message, icon = '🔔', soundType = null) => {
    if (!toastsContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-body">${message}</div>
      <button class="toast-close">&times;</button>
    `;

    toastsContainer.appendChild(toast);
    toast.offsetHeight; // force reflow
    toast.classList.add('show');

    if (soundType) {
      playSound(soundType);
    }

    const autoRemove = setTimeout(() => {
      removeToast(toast);
    }, 5000);

    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(autoRemove);
      removeToast(toast);
    });
  };

  const removeToast = (toast) => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  };

  // Helper to prevent HTML injection XSS
  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Determine user identity from email address
  const getIdentityFromEmail = (email) => {
    const cleanEmail = email.toLowerCase();
    if (cleanEmail.includes('priya')) return 'Priya';
    if (cleanEmail.includes('purva')) return 'Purva';
    if (cleanEmail.includes('bijal')) return 'Bijal';
    return 'Priya'; // Default fallback
  };

  const getUserAvatarClass = (user) => {
    if (user === 'Priya') return 'priya-dot';
    if (user === 'Purva') return 'purva-dot';
    return 'bijal-dot';
  };

  // --- Rendering Functions ---

  const renderMyTasks = () => {
    if (!myTasksList) return;
    const myTasks = tasks.filter(t => {
      const matchesUser = t.assignee === currentUser;
      const matchesSearch = !searchFilter || 
        t.text.toLowerCase().includes(searchFilter) || 
        t.sender.toLowerCase().includes(searchFilter);
      return matchesUser && matchesSearch;
    });
    
    myTasks.sort((a, b) => {
      if (a.status === b.status) {
        return b.timestamp - a.timestamp;
      }
      return a.status === 'pending' ? -1 : 1;
    });

    myTaskCount.textContent = myTasks.filter(t => t.status === 'pending').length;

    if (myTasks.length === 0) {
      myTasksList.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon">☕</div>
          <p>All caught up! No tasks assigned to you right now.</p>
        </li>
      `;
      return;
    }

    myTasksList.innerHTML = myTasks.map(task => {
      const isChecked = task.status === 'completed';
      const senderInitial = task.sender.substring(0, 2);
      const avatarClass = getUserAvatarClass(task.sender);
      const timeStr = new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(task.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      return `
        <li class="task-item ${isChecked ? 'checked' : ''} from-${task.sender.toLowerCase()}" data-id="${task.id}">
          <div class="task-checkbox-wrapper">
            <div class="custom-checkbox" data-id="${task.id}" role="checkbox" aria-checked="${isChecked}"></div>
          </div>
          <div class="task-details">
            <p class="task-desc">${escapeHtml(task.text)}</p>
            <div class="task-meta">
              <span class="avatar-dot small ${avatarClass}" title="Assigned by ${task.sender}">${senderInitial}</span>
              <span>From ${task.sender}</span>
              <span>•</span>
              <span>${dateStr} ${timeStr}</span>
            </div>
          </div>
        </li>
      `;
    }).join('');

    myTasksList.querySelectorAll('.custom-checkbox').forEach(cb => {
      cb.addEventListener('click', (e) => {
        const taskId = e.target.getAttribute('data-id');
        toggleTaskCompletion(taskId);
      });
    });
  };

  const renderSentTasks = () => {
    if (!sentTasksList) return;
    const sentTasks = tasks.filter(t => {
      const matchesUser = t.sender === currentUser;
      const matchesSearch = !searchFilter || 
        t.text.toLowerCase().includes(searchFilter) || 
        t.assignee.toLowerCase().includes(searchFilter);
      return matchesUser && matchesSearch;
    });
    sentTasks.sort((a, b) => b.timestamp - a.timestamp);

    if (sentTasks.length === 0) {
      sentTasksList.innerHTML = `
        <li class="empty-state">
          <div class="empty-icon">📋</div>
          <p>You haven't assigned any tasks to others yet.</p>
        </li>
      `;
      return;
    }

    sentTasksList.innerHTML = sentTasks.map(task => {
      const isCompleted = task.status === 'completed';
      const assigneeInitial = task.assignee.substring(0, 2);
      const avatarClass = getUserAvatarClass(task.assignee);
      const timeStr = new Date(task.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <li class="task-item ${isCompleted ? 'checked' : ''} to-${task.assignee.toLowerCase()}" data-id="${task.id}">
          <div class="task-details">
            <p class="task-desc">${escapeHtml(task.text)}</p>
            <div class="task-meta">
              <span class="avatar-dot small ${avatarClass}" title="Assigned to ${task.assignee}">${assigneeInitial}</span>
              <span>To ${task.assignee}</span>
              <span>•</span>
              <span>${timeStr}</span>
              <span>•</span>
              <span class="status-badge ${task.status}">${task.status}</span>
            </div>
          </div>
          <button class="btn-delete-task" data-id="${task.id}" title="Delete task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </li>
      `;
    }).join('');

    sentTasksList.querySelectorAll('.btn-delete-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-task');
        const taskId = button.getAttribute('data-id');
        deleteTask(taskId);
      });
    });
  };

  const renderDashboard = () => {
    renderMyTasks();
    renderSentTasks();
  };

  const renderGalleries = () => {
    const listPending = document.getElementById('list-pending');
    const listArrived = document.getElementById('list-arrived');
    const listSelected = document.getElementById('list-selected');
    const listEdited = document.getElementById('list-edited');
    const listDelivered = document.getElementById('list-delivered');

    const countPending = document.getElementById('count-pending');
    const countArrived = document.getElementById('count-arrived');
    const countSelected = document.getElementById('count-selected');
    const countEdited = document.getElementById('count-edited');
    const countDelivered = document.getElementById('count-delivered');

    if (!listPending || !listArrived || !listSelected || !listEdited || !listDelivered) return;

    listPending.innerHTML = '';
    listArrived.innerHTML = '';
    listSelected.innerHTML = '';
    listEdited.innerHTML = '';
    listDelivered.innerHTML = '';

    let pendingCount = 0;
    let arrivedCount = 0;
    let selectedCount = 0;
    let editedCount = 0;
    let deliveredCount = 0;

    const filteredGalleries = galleries.filter(g => {
      return !searchFilter || 
        g.clientName.toLowerCase().includes(searchFilter) || 
        (g.notes && g.notes.toLowerCase().includes(searchFilter));
    });

    filteredGalleries.forEach(gallery => {
      const dateStr = new Date(gallery.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timeStr = new Date(gallery.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let actionBtn = '';
      if (gallery.status === 'pending') {
        actionBtn = `<button class="btn-move" data-id="${gallery.id}" data-status="arrived" title="Mark arrived">Arrived ➡️</button>`;
        pendingCount++;
      } else if (gallery.status === 'arrived') {
        actionBtn = `<button class="btn-move" data-id="${gallery.id}" data-status="selected" title="Mark selected on PC">Selected ➡️</button>`;
        arrivedCount++;
      } else if (gallery.status === 'selected') {
        actionBtn = `<button class="btn-move" data-id="${gallery.id}" data-status="edited" title="Mark edited by Priya">Edited ➡️</button>`;
        selectedCount++;
      } else if (gallery.status === 'edited') {
        actionBtn = `<button class="btn-move" data-id="${gallery.id}" data-status="delivered" title="Mark delivered to client">Delivered ✓</button>`;
        editedCount++;
      } else if (gallery.status === 'delivered') {
        deliveredCount++;
      }

      // Build workflow phase timeline
      let timelineHtml = `
        <div class="gallery-timestamps-timeline">
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Pending</span>
            <span class="gallery-timestamp-val">${dateStr} • ${timeStr}</span>
          </div>
      `;
      if (gallery.arrivedDate) {
        const aDate = new Date(gallery.arrivedDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const aTime = new Date(gallery.arrivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Arrived</span>
            <span class="gallery-timestamp-val">${aDate} • ${aTime}</span>
          </div>
        `;
      }
      if (gallery.selectionDate) {
        const sDate = new Date(gallery.selectionDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const sTime = new Date(gallery.selectionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Selected</span>
            <span class="gallery-timestamp-val">${sDate} • ${sTime}</span>
          </div>
        `;
      }
      if (gallery.editedDate) {
        const eDate = new Date(gallery.editedDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const eTime = new Date(gallery.editedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Edited</span>
            <span class="gallery-timestamp-val">${eDate} • ${eTime}</span>
          </div>
        `;
      }
      if (gallery.deliveredDate) {
        const dDate = new Date(gallery.deliveredDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const dTime = new Date(gallery.deliveredDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Delivered</span>
            <span class="gallery-timestamp-val">${dDate} • ${dTime}</span>
          </div>
        `;
      }
      timelineHtml += `</div>`;

      const item = document.createElement('li');
      item.className = 'gallery-card';
      item.innerHTML = `
        <h4 class="gallery-title">${escapeHtml(gallery.clientName)}</h4>
        ${timelineHtml}
        ${gallery.notes ? `<p class="gallery-notes" style="margin-top: 4px;">${escapeHtml(gallery.notes)}</p>` : ''}
        <div class="gallery-actions">
          ${actionBtn}
          <button class="btn-edit-gallery" data-id="${gallery.id}" title="Edit gallery" style="margin-right: 0.25rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-delete-gallery" data-id="${gallery.id}" title="Delete gallery">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;

      if (gallery.status === 'pending') {
        listPending.appendChild(item);
      } else if (gallery.status === 'arrived') {
        listArrived.appendChild(item);
      } else if (gallery.status === 'selected') {
        listSelected.appendChild(item);
      } else if (gallery.status === 'edited') {
        listEdited.appendChild(item);
      } else if (gallery.status === 'delivered') {
        listDelivered.appendChild(item);
      }
    });

    if (countPending) countPending.textContent = pendingCount;
    if (countArrived) countArrived.textContent = arrivedCount;
    if (countSelected) countSelected.textContent = selectedCount;
    if (countEdited) countEdited.textContent = editedCount;
    if (countDelivered) countDelivered.textContent = deliveredCount;

    // Attach listeners
    document.querySelectorAll('.btn-move').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const nextStatus = e.target.getAttribute('data-status');
        window.moveGallery(id, nextStatus);
      });
    });

    document.querySelectorAll('.btn-delete-gallery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-gallery');
        const id = button.getAttribute('data-id');
        window.deleteGallery(id);
      });
    });

    // Attach edit listeners
    document.querySelectorAll('.btn-edit-gallery').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-edit-gallery');
        const id = button.getAttribute('data-id');
        const gallery = galleries.find(g => g.id === id);
        if (gallery) {
          document.getElementById('edit-gallery-id').value = gallery.id;
          document.getElementById('edit-gallery-client-name').value = gallery.clientName;
          document.getElementById('edit-gallery-notes-input').value = gallery.notes || '';
          document.getElementById('edit-gallery-status-select').value = gallery.status;
          
          const editGalleryModal = document.getElementById('edit-gallery-modal');
          editGalleryModal.style.display = 'flex';
          editGalleryModal.offsetHeight; // force reflow
          editGalleryModal.classList.remove('hidden');
        }
      });
    });
    renderSearchPipeline();
  };

  const renderAlbums = () => {
    const listPending = document.getElementById('list-album-pending');
    const listApproval = document.getElementById('list-album-approval');
    const listPrinting = document.getElementById('list-album-printing');
    const listArrived = document.getElementById('list-album-arrived');
    const listDelivered = document.getElementById('list-album-delivered');

    const countPending = document.getElementById('count-album-pending');
    const countApproval = document.getElementById('count-album-approval');
    const countPrinting = document.getElementById('count-album-printing');
    const countArrived = document.getElementById('count-album-arrived');
    const countDelivered = document.getElementById('count-album-delivered');

    if (!listPending || !listApproval || !listPrinting || !listArrived || !listDelivered) return;

    listPending.innerHTML = '';
    listApproval.innerHTML = '';
    listPrinting.innerHTML = '';
    listArrived.innerHTML = '';
    listDelivered.innerHTML = '';

    let pendingCount = 0;
    let approvalCount = 0;
    let printingCount = 0;
    let arrivedCount = 0;
    let deliveredCount = 0;

    const filteredAlbums = albums.filter(a => {
      return !searchFilter || 
        a.clientName.toLowerCase().includes(searchFilter) || 
        (a.notes && a.notes.toLowerCase().includes(searchFilter));
    });

    filteredAlbums.forEach(album => {
      const dateStr = new Date(album.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      const timeStr = new Date(album.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let actionBtn = '';
      if (album.status === 'pending') {
        actionBtn = `<button class="btn-move-album" data-id="${album.id}" data-status="approval" title="Mark approved">Approved ➡️</button>`;
        pendingCount++;
      } else if (album.status === 'approval') {
        actionBtn = `<button class="btn-move-album" data-id="${album.id}" data-status="printing" title="Mark printing">Printing ➡️</button>`;
        approvalCount++;
      } else if (album.status === 'printing') {
        actionBtn = `<button class="btn-move-album" data-id="${album.id}" data-status="arrived" title="Mark arrived">Arrived ➡️</button>`;
        printingCount++;
      } else if (album.status === 'arrived') {
        actionBtn = `<button class="btn-move-album" data-id="${album.id}" data-status="delivered" title="Mark delivered">Delivered ✓</button>`;
        arrivedCount++;
      } else if (album.status === 'delivered') {
        deliveredCount++;
      }

      // Build workflow phase timeline
      let timelineHtml = `
        <div class="gallery-timestamps-timeline">
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Pending Approval</span>
            <span class="gallery-timestamp-val">${dateStr} • ${timeStr}</span>
          </div>
      `;
      if (album.approvalDate) {
        const apDate = new Date(album.approvalDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const apTime = new Date(album.approvalDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Approved</span>
            <span class="gallery-timestamp-val">${apDate} • ${apTime}</span>
          </div>
        `;
      }
      if (album.printingDate) {
        const pDate = new Date(album.printingDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const pTime = new Date(album.printingDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Printing</span>
            <span class="gallery-timestamp-val">${pDate} • ${pTime}</span>
          </div>
        `;
      }
      if (album.arrivedDate) {
        const arDate = new Date(album.arrivedDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const arTime = new Date(album.arrivedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Arrived</span>
            <span class="gallery-timestamp-val">${arDate} • ${arTime}</span>
          </div>
        `;
      }
      if (album.deliveredDate) {
        const dDate = new Date(album.deliveredDate).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const dTime = new Date(album.deliveredDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        timelineHtml += `
          <div class="gallery-timestamp-row">
            <span class="gallery-timestamp-label">Delivered</span>
            <span class="gallery-timestamp-val">${dDate} • ${dTime}</span>
          </div>
        `;
      }
      timelineHtml += `</div>`;

      // Build delivered method tag
      let deliveryMethodHtml = '';
      if (album.status === 'delivered' && album.deliveredMethod) {
        deliveryMethodHtml = `<p class="gallery-notes" style="margin-top: 4px; font-weight: 600; color: #2E7D32;">🚚 Delivery: ${escapeHtml(album.deliveredMethod)}</p>`;
      }

      const item = document.createElement('li');
      item.className = 'gallery-card';
      item.innerHTML = `
        <h4 class="gallery-title">${escapeHtml(album.clientName)}</h4>
        ${timelineHtml}
        ${album.notes ? `<p class="gallery-notes" style="margin-top: 4px;">${escapeHtml(album.notes)}</p>` : ''}
        ${deliveryMethodHtml}
        <div class="gallery-actions">
          ${actionBtn}
          <button class="btn-edit-album" data-id="${album.id}" title="Edit album" style="margin-right: 0.25rem;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-delete-album" data-id="${album.id}" title="Delete album">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      `;

      if (album.status === 'pending') {
        listPending.appendChild(item);
      } else if (album.status === 'approval') {
        listApproval.appendChild(item);
      } else if (album.status === 'printing') {
        listPrinting.appendChild(item);
      } else if (album.status === 'arrived') {
        listArrived.appendChild(item);
      } else if (album.status === 'delivered') {
        listDelivered.appendChild(item);
      }
    });

    if (countPending) countPending.textContent = pendingCount;
    if (countApproval) countApproval.textContent = approvalCount;
    if (countPrinting) countPrinting.textContent = printingCount;
    if (countArrived) countArrived.textContent = arrivedCount;
    if (countDelivered) countDelivered.textContent = deliveredCount;

    // Attach listeners
    document.querySelectorAll('.btn-move-album').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const nextStatus = e.target.getAttribute('data-status');
        if (nextStatus === 'delivered') {
          const method = window.prompt("How was the album delivered? (e.g. Courier, In-Hand, Picked Up by Client):", "In-Hand");
          if (method !== null) {
            window.moveAlbum(id, nextStatus, method.trim() || 'In-Hand');
          }
        } else {
          window.moveAlbum(id, nextStatus);
        }
      });
    });

    document.querySelectorAll('.btn-delete-album').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-album');
        const id = button.getAttribute('data-id');
        window.deleteAlbum(id);
      });
    });

    // Attach edit listeners
    document.querySelectorAll('.btn-edit-album').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-edit-album');
        const id = button.getAttribute('data-id');
        const album = albums.find(a => a.id === id);
        if (album) {
          document.getElementById('edit-album-id').value = album.id;
          document.getElementById('edit-album-client-name').value = album.clientName;
          document.getElementById('edit-album-notes-input').value = album.notes || '';
          document.getElementById('edit-album-status-select').value = album.status;
          document.getElementById('edit-album-delivery-method').value = album.deliveredMethod || 'In-Hand';

          if (album.status === 'delivered') {
            document.getElementById('edit-album-delivery-container').style.display = 'block';
          } else {
            document.getElementById('edit-album-delivery-container').style.display = 'none';
          }
          
          const editAlbumModal = document.getElementById('edit-album-modal');
          editAlbumModal.style.display = 'flex';
          editAlbumModal.offsetHeight; // force reflow
          editAlbumModal.classList.remove('hidden');
        }
      });
    });
  };

  function renderSearchPipeline() {
    const container = document.getElementById('search-pipeline-results');
    if (!container) return;

    if (!searchFilter || searchFilter.length < 2) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    // Collect all unique client names from all collections
    const clientNamesSet = new Set();
    
    if (Array.isArray(bookings)) {
      bookings.forEach(b => b.clientName && clientNamesSet.add(b.clientName.trim()));
    }
    if (Array.isArray(shoots)) {
      shoots.forEach(s => s.clientName && clientNamesSet.add(s.clientName.trim()));
    }
    if (Array.isArray(galleries)) {
      galleries.forEach(g => g.clientName && clientNamesSet.add(g.clientName.trim()));
    }
    if (Array.isArray(albums)) {
      albums.forEach(a => a.clientName && clientNamesSet.add(a.clientName.trim()));
    }
    if (Array.isArray(contacts)) {
      contacts.forEach(c => c.name && clientNamesSet.add(c.name.trim()));
    }

    const matchedNames = Array.from(clientNamesSet).filter(name => 
      name.toLowerCase().includes(searchFilter)
    );

    if (matchedNames.length === 0) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    
    let html = `
      <div class="search-pipeline-header">
        <h2>🔍 Client Journey Pipeline</h2>
        <button id="clear-pipeline-search" class="btn-clear-search">Clear Search</button>
      </div>
      <div class="search-pipeline-list">
    `;

    matchedNames.forEach(clientName => {
      const clientNameLower = clientName.toLowerCase().trim();

      // Find bookings
      const clientBookings = bookings.filter(b => b.clientName && b.clientName.toLowerCase().trim() === clientNameLower);
      // Find shoots
      const clientShoots = shoots.filter(s => s.clientName && s.clientName.toLowerCase().trim() === clientNameLower);
      // Find galleries
      const clientGalleries = galleries.filter(g => g.clientName && g.clientName.toLowerCase().trim() === clientNameLower);
      // Find albums
      const clientAlbums = albums.filter(a => a.clientName && a.clientName.toLowerCase().trim() === clientNameLower);
      // Find contacts
      const clientContact = contacts.find(c => c.name && c.name.toLowerCase().trim() === clientNameLower);

      const hasBooking = clientBookings.length > 0;
      const hasShoot = clientShoots.length > 0;
      const hasGallery = clientGalleries.length > 0;
      const hasAlbum = clientAlbums.length > 0;

      // Determine booking details
      let bookingText = 'No booking found';
      if (hasBooking) {
        const bk = clientBookings[0];
        bookingText = `${bk.shootType || 'Shoot'}${bk.package ? ` (${bk.package})` : ''}`;
        if (bk.date) {
          bookingText += ` on ${new Date(bk.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
        }
      }

      // Determine shoot details
      let shootText = 'Not logged yet';
      if (hasShoot) {
        const sh = clientShoots[0];
        shootText = `Logged on ${new Date(sh.date || sh.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
        if (sh.photosCount) {
          shootText += ` (${sh.photosCount} photos)`;
        }
      }

      // Gallery status & dates
      let galleryStatusText = 'Not started';
      let galleryProgress = 0; // 0 to 5
      let galleryDateStr = '';
      if (hasGallery) {
        const gal = clientGalleries[0];
        const statusMap = {
          'pending': 'Pending Selection',
          'arrived': 'Arrived',
          'selected': 'Selected on PC',
          'edited': 'Edited by Priya',
          'delivered': 'Delivered'
        };
        galleryStatusText = statusMap[gal.status] || gal.status;
        const progressMap = { 'pending': 1, 'arrived': 2, 'selected': 3, 'edited': 4, 'delivered': 5 };
        galleryProgress = progressMap[gal.status] || 0;
        
        // Find latest date in gallery
        const dateOptions = [];
        if (gal.timestamp) dateOptions.push({ label: 'Created', time: gal.timestamp });
        if (gal.arrivedDate) dateOptions.push({ label: 'Arrived', time: gal.arrivedDate });
        if (gal.selectionDate) dateOptions.push({ label: 'Selected', time: gal.selectionDate });
        if (gal.editedDate) dateOptions.push({ label: 'Edited', time: gal.editedDate });
        if (gal.deliveredDate) dateOptions.push({ label: 'Delivered', time: gal.deliveredDate });
        
        if (dateOptions.length > 0) {
          const latest = dateOptions[dateOptions.length - 1];
          galleryDateStr = `${latest.label}: ${new Date(latest.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
        }
      }

      // Album status & dates
      let albumStatusText = 'Not started';
      let albumProgress = 0; // 0 to 5
      let albumDateStr = '';
      let albumIncluded = hasShoot && clientShoots[0].albumIncluded;
      
      if (hasAlbum) {
        const alb = clientAlbums[0];
        const statusMap = {
          'pending': 'Pending Approval',
          'approval': 'Approved',
          'printing': 'Printing',
          'arrived': 'Arrived at Studio',
          'delivered': 'Delivered'
        };
        albumStatusText = statusMap[alb.status] || alb.status;
        const progressMap = { 'pending': 1, 'approval': 2, 'printing': 3, 'arrived': 4, 'delivered': 5 };
        albumProgress = progressMap[alb.status] || 0;

        const dateOptions = [];
        if (alb.timestamp) dateOptions.push({ label: 'Created', time: alb.timestamp });
        if (alb.approvalDate) dateOptions.push({ label: 'Approved', time: alb.approvalDate });
        if (alb.printingDate) dateOptions.push({ label: 'Printing', time: alb.printingDate });
        if (alb.arrivedDate) dateOptions.push({ label: 'Arrived', time: alb.arrivedDate });
        if (alb.deliveredDate) dateOptions.push({ label: 'Delivered', time: alb.deliveredDate });

        if (dateOptions.length > 0) {
          const latest = dateOptions[dateOptions.length - 1];
          albumDateStr = `${latest.label}: ${new Date(latest.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
        }
      }

      // Render details for the pipeline
      html += `
        <div class="client-pipeline-card">
          <div class="client-pipeline-card-header">
            <div class="client-title-info">
              <span class="client-avatar">${escapeHtml(clientName.substring(0, 2).toUpperCase())}</span>
              <div>
                <h3>${escapeHtml(clientName)}</h3>
                <div class="client-meta-details">
                  ${clientContact ? `<span>📞 ${escapeHtml(clientContact.phone)}</span>` : ''}
                  ${clientContact && clientContact.email ? `<span>✉️ ${escapeHtml(clientContact.email)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>
          
          <div class="pipeline-progress-stepper">
            <!-- Booking -->
            <div class="stepper-node ${hasBooking ? 'completed' : 'disabled'}">
              <div class="node-circle">📅</div>
              <div class="node-label">Booking</div>
              <div class="node-status">${escapeHtml(bookingText)}</div>
            </div>
            
            <div class="stepper-connector ${hasShoot ? 'completed' : ''}"></div>
            
            <!-- Shoot -->
            <div class="stepper-node ${hasShoot ? 'completed' : 'disabled'}">
              <div class="node-circle">📷</div>
              <div class="node-label">Shoot Log</div>
              <div class="node-status">${escapeHtml(shootText)}</div>
            </div>
            
            <div class="stepper-connector ${hasGallery ? 'completed' : ''}"></div>
            
            <!-- Gallery -->
            <div class="stepper-node ${hasGallery ? 'active' : 'disabled'}">
              <div class="node-circle">📸</div>
              <div class="node-label">Gallery Tracker</div>
              <div class="node-status">${escapeHtml(galleryStatusText)}</div>
              ${galleryDateStr ? `<div class="node-date">${escapeHtml(galleryDateStr)}</div>` : ''}
              ${hasGallery ? `
                <div class="mini-sub-pipeline">
                  <span class="sub-step ${galleryProgress >= 1 ? 'done' : ''}" title="Pending Selection">Pend</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${galleryProgress >= 2 ? 'done' : ''}" title="Arrived">Arr</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${galleryProgress >= 3 ? 'done' : ''}" title="Selected on PC">Sel</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${galleryProgress >= 4 ? 'done' : ''}" title="Edited by Priya">Edit</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${galleryProgress >= 5 ? 'done' : ''}" title="Delivered">Del</span>
                </div>
              ` : ''}
            </div>
            
            <div class="stepper-connector ${hasAlbum ? 'completed' : ''}"></div>
            
            <!-- Album -->
            <div class="stepper-node ${hasAlbum ? 'active' : (albumIncluded ? 'pending' : 'disabled')}">
              <div class="node-circle">📖</div>
              <div class="node-label">Album Tracker</div>
              <div class="node-status">
                ${hasAlbum ? escapeHtml(albumStatusText) : (albumIncluded ? 'Album Pending' : 'Not Included')}
              </div>
              ${albumDateStr ? `<div class="node-date">${escapeHtml(albumDateStr)}</div>` : ''}
              ${hasAlbum ? `
                <div class="mini-sub-pipeline">
                  <span class="sub-step ${albumProgress >= 1 ? 'done' : ''}" title="Pending Approval">Pend</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${albumProgress >= 2 ? 'done' : ''}" title="Approved">Appr</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${albumProgress >= 3 ? 'done' : ''}" title="Printing">Prnt</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${albumProgress >= 4 ? 'done' : ''}" title="Arrived">Arr</span>
                  <span class="sub-step-arrow">→</span>
                  <span class="sub-step ${albumProgress >= 5 ? 'done' : ''}" title="Delivered">Del</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

    // Attach clear search event
    const clearBtn = document.getElementById('clear-pipeline-search');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
          searchInput.value = '';
          searchFilter = '';
          const clearSearchBtn = document.getElementById('clear-search-btn');
          if (clearSearchBtn) clearSearchBtn.style.display = 'none';
          renderDashboard();
          renderGalleries();
          renderContacts();
          renderBookings();
          if (typeof renderAlbums === 'function') renderAlbums();
          renderSearchPipeline();
        }
      });
    }
  };

  const checkAndCreateAlbum = async (clientName) => {
    if (!clientName) return;
    const clientNameLower = clientName.toLowerCase().trim();
    
    const hasShootWithAlbum = shoots.some(s => 
      s.clientName && 
      s.clientName.toLowerCase().trim() === clientNameLower && 
      s.albumIncluded === true
    );

    if (!hasShootWithAlbum) return;

    const existingAlbum = albums.find(a => 
      a.clientName && 
      a.clientName.toLowerCase().trim() === clientNameLower
    );

    if (existingAlbum) {
      if (existingAlbum.status === 'approval') {
        await window.moveAlbum(existingAlbum.id, 'pending');
      }
      return;
    }

    await window.addAlbum(clientName, "Auto-created from delivered gallery");
  };

  const setupAutocomplete = (inputEl, autocompleteListEl) => {
    if (!inputEl || !autocompleteListEl) return;

    const renderAutocompleteDropdown = (query) => {
      const q = query.toLowerCase().trim();
      if (!q) {
        autocompleteListEl.innerHTML = '';
        autocompleteListEl.classList.remove('show');
        return;
      }

      // Filter contacts whose name includes the query
      const matches = contacts.filter(c => c.name.toLowerCase().includes(q));

      if (matches.length === 0) {
        autocompleteListEl.innerHTML = '';
        autocompleteListEl.classList.remove('show');
        return;
      }

      autocompleteListEl.innerHTML = matches.map(c => `
        <li class="autocomplete-item" data-value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</li>
      `).join('');
      autocompleteListEl.classList.add('show');

      // Attach click events to the items
      autocompleteListEl.querySelectorAll('.autocomplete-item').forEach(item => {
        item.addEventListener('click', (e) => {
          inputEl.value = e.target.getAttribute('data-value');
          autocompleteListEl.innerHTML = '';
          autocompleteListEl.classList.remove('show');
        });
      });
    };

    // Listeners
    inputEl.addEventListener('input', (e) => {
      renderAutocompleteDropdown(e.target.value);
    });

    inputEl.addEventListener('focus', (e) => {
      renderAutocompleteDropdown(e.target.value);
    });

    // Close on blur (with a small timeout so click triggers first)
    inputEl.addEventListener('blur', () => {
      setTimeout(() => {
        autocompleteListEl.classList.remove('show');
      }, 250);
    });
  };

  const renderContacts = () => {
    const grid = document.getElementById('contacts-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const filteredContacts = contacts.filter(c => {
      return !searchFilter ||
        c.name.toLowerCase().includes(searchFilter) ||
        c.phone.toLowerCase().includes(searchFilter) ||
        (c.email && c.email.toLowerCase().includes(searchFilter)) ||
        (c.notes && c.notes.toLowerCase().includes(searchFilter));
    });

    if (filteredContacts.length === 0) {
      grid.innerHTML = `
        <li class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">👥</div>
          <p>${searchFilter ? 'No contacts match your search.' : 'No client contacts saved yet.'}</p>
        </li>
      `;
      return;
    }

    grid.innerHTML = filteredContacts.map(contact => {
      const initial = contact.name.substring(0, 1).toUpperCase();
      
      return `
        <li class="contact-card" data-id="${contact.id}">
          <div class="contact-card-header">
            <div class="contact-avatar">${initial}</div>
            <h3 class="gallery-title" style="margin: 0;">${escapeHtml(contact.name)}</h3>
          </div>
          <div class="contact-details-box">
            <div class="contact-detail-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <a href="tel:${contact.phone}">${escapeHtml(contact.phone)}</a>
            </div>
            ${contact.email ? `
            <div class="contact-detail-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <a href="mailto:${contact.email}">${escapeHtml(contact.email)}</a>
            </div>` : ''}
            ${contact.notes ? `
            <div class="contact-detail-row" style="align-items: flex-start;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-top: 2px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span style="font-size: 0.8rem; word-break: break-word;">${escapeHtml(contact.notes)}</span>
            </div>` : ''}
          </div>
          <div class="contact-card-actions">
            <button class="btn-edit-contact" data-id="${contact.id}" title="Edit contact" style="margin-right: 0.5rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-delete-gallery btn-delete-contact" data-id="${contact.id}" title="Delete contact">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>
        </li>
      `;
    }).join('');

    // Attach delete listeners
    grid.querySelectorAll('.btn-delete-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-contact');
        const id = button.getAttribute('data-id');
        window.deleteContact(id);
      });
    });

    // Attach edit listeners
    grid.querySelectorAll('.btn-edit-contact').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-edit-contact');
        const id = button.getAttribute('data-id');
        const contact = contacts.find(c => c.id === id);
        if (contact) {
          document.getElementById('edit-contact-id').value = contact.id;
          document.getElementById('edit-contact-name').value = contact.name;
          document.getElementById('edit-contact-phone').value = contact.phone;
          document.getElementById('edit-contact-email').value = contact.email || '';
          document.getElementById('edit-contact-notes').value = contact.notes || '';
          
          const editContactModal = document.getElementById('edit-contact-modal');
          editContactModal.style.display = 'flex';
          editContactModal.offsetHeight; // force reflow
          editContactModal.classList.remove('hidden');
        }
      });
    });
  };

  // --- Accounts & Income Tracker ---
  const populateMonthFilter = () => {
    const monthFilter = document.getElementById('account-month-filter');
    if (!monthFilter) return;

    const currentSelection = monthFilter.value;

    const monthsSet = new Set();
    
    // Add current month always
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${currentMonthNum.toString().padStart(2, '0')}`;
    monthsSet.add(currentMonthStr);

    // Add last 12 months pre-populated so user can see previous months
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      monthsSet.add(`${y}-${m.toString().padStart(2, '0')}`);
    }

    // Add months from actual data
    if (Array.isArray(bookings)) {
      bookings.forEach(b => {
        if (b.date && b.date.match(/^\d{4}-\d{2}/)) {
          monthsSet.add(b.date.substring(0, 7));
        }
      });
    }
    if (Array.isArray(shoots)) {
      shoots.forEach(s => {
        if (s.date && s.date.match(/^\d{4}-\d{2}/)) {
          monthsSet.add(s.date.substring(0, 7));
        }
      });
    }

    const sortedMonths = Array.from(monthsSet).sort().reverse();

    const generatedHtml = `<option value="all">All Months</option>` + sortedMonths.map(mStr => {
      const [year, month] = mStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      return `<option value="${mStr}">${label}</option>`;
    }).join('');

    if (monthFilter.innerHTML !== generatedHtml) {
      monthFilter.innerHTML = generatedHtml;
      if (currentSelection && sortedMonths.includes(currentSelection)) {
        monthFilter.value = currentSelection;
      } else {
        monthFilter.value = currentMonthStr;
      }
    }
  };

  window.renderAccounts = () => {
    populateMonthFilter();

    const filterSelect = document.getElementById('account-filter');
    const selectedAccount = filterSelect ? filterSelect.value : 'all';

    const monthFilter = document.getElementById('account-month-filter');
    const selectedMonth = monthFilter ? monthFilter.value : 'all';

    const summaryGrid = document.getElementById('accounts-summary-grid');
    const cardsList = document.getElementById('accounts-cards-list');
    const transactionsBody = document.getElementById('accounts-transactions-body');

    if (!summaryGrid || !cardsList || !transactionsBody) return;

    const accountList = ['Rhythm', 'Cash', 'Purva', 'Bijal', 'Shilpa', 'Mahesh'];
    const accountStats = {};
    accountList.forEach(acc => {
      accountStats[acc] = { advances: 0, balance: 0, expected: 0 };
    });

    let overallExpected = 0;
    let overallAdvances = 0;
    let overallBalance = 0;

    // Filter bookings by selected month
    const filteredBookings = bookings.filter(b => {
      if (selectedMonth === 'all') return true;
      return b.date && b.date.substring(0, 7) === selectedMonth;
    });

    // 1. Trace bookings and correlate with completed shoots
    filteredBookings.forEach(b => {
      const packagePrice = parsePackagePrice(b.package);
      const advanceVal = parseFloat(b.advance) || 0;

      // Find if there is a completed shoot matching this booking
      const linkedShoot = shoots.find(s => 
        (s.bookingId && s.bookingId === b.id) || 
        (s.clientName && s.clientName.toLowerCase() === b.clientName.toLowerCase() && s.date === b.date)
      );

      if (linkedShoot) {
        // If logged/completed, both advance and balance are collected! No pending balance remains.
        const sAdvance = parseFloat(linkedShoot.advanceAmount) || 0;
        const sBalance = parseFloat(linkedShoot.balanceAmount) || 0;
        const advAcc = linkedShoot.advanceAccount || 'Cash';
        const balAcc = linkedShoot.balanceAccount || 'Cash';

        if (accountStats[advAcc]) {
          accountStats[advAcc].advances += sAdvance;
          accountStats[advAcc].expected += sAdvance;
        }
        if (accountStats[balAcc]) {
          accountStats[balAcc].advances += sBalance;
          accountStats[balAcc].expected += sBalance;
        }

        overallExpected += (sAdvance + sBalance);
        overallAdvances += (sAdvance + sBalance);
      } else {
        // If not logged/completed, the advance is collected, but the balance is pending.
        const balanceVal = Math.max(0, packagePrice - advanceVal);
        const acc = b.paymentAccount || 'Cash';

        if (accountStats[acc]) {
          accountStats[acc].advances += advanceVal;
          accountStats[acc].balance += balanceVal;
          accountStats[acc].expected += packagePrice;
        }

        overallExpected += packagePrice;
        overallAdvances += advanceVal;
        overallBalance += balanceVal;
      }
    });

    // 2. Account for any manually logged shoots that don't match any bookings
    const linkedBookingIds = bookings.map(b => b.id);
    const unlinkedShoots = shoots.filter(s => {
      if (s.bookingId && linkedBookingIds.includes(s.bookingId)) return false;
      const matchesBooking = bookings.some(b => 
        b.clientName.toLowerCase() === s.clientName.toLowerCase() && b.date === s.date
      );
      return !matchesBooking;
    });

    const filteredUnlinkedShoots = unlinkedShoots.filter(s => {
      if (selectedMonth === 'all') return true;
      return s.date && s.date.substring(0, 7) === selectedMonth;
    });

    filteredUnlinkedShoots.forEach(s => {
      const sAdvance = parseFloat(s.advanceAmount) || 0;
      const sBalance = parseFloat(s.balanceAmount) || 0;
      const advAcc = s.advanceAccount || 'Cash';
      const balAcc = s.balanceAccount || 'Cash';

      if (accountStats[advAcc]) {
        accountStats[advAcc].advances += sAdvance;
        accountStats[advAcc].expected += sAdvance;
      }
      if (accountStats[balAcc]) {
        accountStats[balAcc].advances += sBalance;
        accountStats[balAcc].expected += sBalance;
      }

      overallExpected += (sAdvance + sBalance);
      overallAdvances += (sAdvance + sBalance);
    });

    // Determine stats for current view (filtered)
    let displayExpected = 0;
    let displayAdvances = 0;
    let displayBalance = 0;

    if (selectedAccount === 'all') {
      displayExpected = overallExpected;
      displayAdvances = overallAdvances;
      displayBalance = overallBalance;
    } else if (accountStats[selectedAccount]) {
      displayExpected = accountStats[selectedAccount].expected;
      displayAdvances = accountStats[selectedAccount].advances;
      displayBalance = accountStats[selectedAccount].balance;
    }

    const fmt = (val) => new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);

    // 1. Render Summary Cards
    summaryGrid.innerHTML = `
      <div class="grid-card" style="padding: 1.5rem; background: rgba(255,255,255,0.45); backdrop-filter: blur(20px); border-radius: var(--border-radius-lg); border: 1px solid rgba(255,255,255,0.3); text-align: center;">
        <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Expected Revenue</span>
        <h3 style="font-family: var(--font-serif); font-size: 1.8rem; margin: 0.5rem 0 0 0; color: var(--text-primary);">${fmt(displayExpected)}</h3>
      </div>
      <div class="grid-card" style="padding: 1.5rem; background: rgba(46, 125, 50, 0.08); backdrop-filter: blur(20px); border-radius: var(--border-radius-lg); border: 1px solid rgba(46, 125, 50, 0.15); text-align: center;">
        <span style="font-size: 0.75rem; color: #2E7D32; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Advances/Paid Balance</span>
        <h3 style="font-family: var(--font-serif); font-size: 1.8rem; margin: 0.5rem 0 0 0; color: #2E7D32;">${fmt(displayAdvances)}</h3>
      </div>
      <div class="grid-card" style="padding: 1.5rem; background: rgba(198, 40, 40, 0.08); backdrop-filter: blur(20px); border-radius: var(--border-radius-lg); border: 1px solid rgba(198, 40, 40, 0.15); text-align: center;">
        <span style="font-size: 0.75rem; color: #C62828; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Pending Receivables</span>
        <h3 style="font-family: var(--font-serif); font-size: 1.8rem; margin: 0.5rem 0 0 0; color: #C62828;">${fmt(displayBalance)}</h3>
      </div>
    `;

    // 2. Render Account Cards Breakdowns
    cardsList.innerHTML = accountList.map(acc => {
      const stats = accountStats[acc];
      const percent = stats.expected > 0 ? Math.round((stats.advances / stats.expected) * 100) : 0;
      return `
        <div class="grid-card" style="padding: 1.5rem; background: rgba(255,255,255,0.45); backdrop-filter: blur(20px); border-radius: var(--border-radius-lg); border: 1px solid rgba(255,255,255,0.3); display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; font-family: var(--font-serif); font-size: 1.15rem; color: var(--text-primary);">${acc} Account</h4>
            <span style="font-size: 0.8rem; font-weight: 700; color: #2E7D32;">${percent}% Collected</span>
          </div>
          <div style="width: 100%; height: 6px; background: rgba(0,0,0,0.06); border-radius: 3px; overflow: hidden;">
            <div style="width: ${percent}%; height: 100%; background: #2E7D32; border-radius: 3px; transition: width 0.3s ease;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary);">
            <span>Received: <strong>${fmt(stats.advances)}</strong></span>
            <span>Pending: <strong>${fmt(stats.balance)}</strong></span>
          </div>
        </div>
      `;
    }).join('');

    // 3. Render Related Transactions List
    const transactionRows = [];

    filteredBookings.forEach(b => {
      const packagePrice = parsePackagePrice(b.package);
      const advanceVal = parseFloat(b.advance) || 0;

      // Find if there is a completed shoot matching this booking
      const linkedShoot = shoots.find(s => 
        (s.bookingId && s.bookingId === b.id) || 
        (s.clientName && s.clientName.toLowerCase() === b.clientName.toLowerCase() && s.date === b.date)
      );

      const dateObj = new Date(b.date);
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      if (linkedShoot) {
        const sAdvance = parseFloat(linkedShoot.advanceAmount) || 0;
        const sBalance = parseFloat(linkedShoot.balanceAmount) || 0;
        const advAcc = linkedShoot.advanceAccount || 'Cash';
        const balAcc = linkedShoot.balanceAccount || 'Cash';

        // Add Advance transaction
        if (sAdvance > 0 && (selectedAccount === 'all' || advAcc === selectedAccount)) {
          transactionRows.push(`
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
              <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(b.clientName)}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--text-secondary);">${formattedDate}</td>
              <td style="padding: 0.75rem 0.5rem;"><span style="color: #2E7D32; font-weight: 600;">Advance Payment</span></td>
              <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: var(--text-primary);">${fmt(sAdvance)}</td>
              <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-secondary);">${escapeHtml(advAcc)}</td>
              <td style="padding: 0.75rem 0.5rem;"><span style="background: rgba(46, 125, 50, 0.12); color: #2E7D32; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PAID</span></td>
            </tr>
          `);
        }

        // Add Balance transaction
        if (sBalance > 0 && (selectedAccount === 'all' || balAcc === selectedAccount)) {
          transactionRows.push(`
            <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
              <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(b.clientName)}</td>
              <td style="padding: 0.75rem 0.5rem; color: var(--text-secondary);">${formattedDate}</td>
              <td style="padding: 0.75rem 0.5rem;"><span style="color: #2E7D32; font-weight: 600;">Remaining Balance</span></td>
              <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: var(--text-primary);">${fmt(sBalance)}</td>
              <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-secondary);">${escapeHtml(balAcc)}</td>
              <td style="padding: 0.75rem 0.5rem;"><span style="background: rgba(46, 125, 50, 0.12); color: #2E7D32; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PAID</span></td>
            </tr>
          `);
        }
      } else {
        const balanceVal = Math.max(0, packagePrice - advanceVal);
        const acc = b.paymentAccount || 'Cash';

        if (selectedAccount === 'all' || acc === selectedAccount) {
          if (advanceVal > 0) {
            transactionRows.push(`
              <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(b.clientName)}</td>
                <td style="padding: 0.75rem 0.5rem; color: var(--text-secondary);">${formattedDate}</td>
                <td style="padding: 0.75rem 0.5rem;"><span style="color: #2E7D32; font-weight: 600;">Advance Payment</span></td>
                <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: var(--text-primary);">${fmt(advanceVal)}</td>
                <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-secondary);">${escapeHtml(acc)}</td>
                <td style="padding: 0.75rem 0.5rem;"><span style="background: rgba(46, 125, 50, 0.12); color: #2E7D32; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PAID</span></td>
              </tr>
            `);
          }

          if (packagePrice > 0) {
            transactionRows.push(`
              <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(b.clientName)}</td>
                <td style="padding: 0.75rem 0.5rem; color: var(--text-secondary);">${formattedDate}</td>
                <td style="padding: 0.75rem 0.5rem;"><span style="color: ${balanceVal === 0 ? '#2E7D32' : '#C62828'}; font-weight: 600;">Remaining Balance</span></td>
                <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: var(--text-primary);">${fmt(balanceVal)}</td>
                <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-secondary);">${escapeHtml(acc)}</td>
                <td style="padding: 0.75rem 0.5rem;">
                  <span style="background: ${balanceVal === 0 ? 'rgba(46, 125, 50, 0.12)' : 'rgba(239, 108, 0, 0.12)'}; color: ${balanceVal === 0 ? '#2E7D32' : '#E65100'}; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">
                    ${balanceVal === 0 ? 'PAID' : 'PENDING'}
                  </span>
                </td>
              </tr>
            `);
          }
        }
      }
    });

    // Add unlinked shoots transaction entries
    filteredUnlinkedShoots.forEach(s => {
      const sAdvance = parseFloat(s.advanceAmount) || 0;
      const sBalance = parseFloat(s.balanceAmount) || 0;
      const advAcc = s.advanceAccount || 'Cash';
      const balAcc = s.balanceAccount || 'Cash';
      
      const dateObj = new Date(s.date);
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      if (sAdvance > 0 && (selectedAccount === 'all' || advAcc === selectedAccount)) {
        transactionRows.push(`
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
            <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(s.clientName)} (Shoot Log)</td>
            <td style="padding: 0.75rem 0.5rem; color: var(--text-secondary);">${formattedDate}</td>
            <td style="padding: 0.75rem 0.5rem;"><span style="color: #2E7D32; font-weight: 600;">Advance Payment</span></td>
            <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: var(--text-primary);">${fmt(sAdvance)}</td>
            <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-secondary);">${escapeHtml(advAcc)}</td>
            <td style="padding: 0.75rem 0.5rem;"><span style="background: rgba(46, 125, 50, 0.12); color: #2E7D32; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PAID</span></td>
          </tr>
        `);
      }

      if (sBalance > 0 && (selectedAccount === 'all' || balAcc === selectedAccount)) {
        transactionRows.push(`
          <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
            <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(s.clientName)} (Shoot Log)</td>
            <td style="padding: 0.75rem 0.5rem; color: var(--text-secondary);">${formattedDate}</td>
            <td style="padding: 0.75rem 0.5rem;"><span style="color: #2E7D32; font-weight: 600;">Remaining Balance</span></td>
            <td style="padding: 0.75rem 0.5rem; font-weight: 700; color: var(--text-primary);">${fmt(sBalance)}</td>
            <td style="padding: 0.75rem 0.5rem; font-weight: 500; color: var(--text-secondary);">${escapeHtml(balAcc)}</td>
            <td style="padding: 0.75rem 0.5rem;"><span style="background: rgba(46, 125, 50, 0.12); color: #2E7D32; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 700;">PAID</span></td>
          </tr>
        `);
      }
    });

    if (transactionRows.length === 0) {
      transactionsBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-light);">
            No transactions found for this account/month filter.
          </td>
        </tr>
      `;
    } else {
      transactionsBody.innerHTML = transactionRows.join('');
    }
  };

  const accountFilterSelect = document.getElementById('account-filter');
  if (accountFilterSelect) {
    accountFilterSelect.addEventListener('change', window.renderAccounts);
  }

  const accountMonthFilterSelect = document.getElementById('account-month-filter');
  if (accountMonthFilterSelect) {
    accountMonthFilterSelect.addEventListener('change', window.renderAccounts);
  }

  // --- Google Calendar Sync Handlers ---
  let tokenClient = null;

  // Polling to initialize Google OAuth GIS client when the library loads
  const checkGoogleLoaded = setInterval(() => {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      clearInterval(checkGoogleLoaded);
      
      const clientId = firebaseConfig.googleClientId || "50274890207-k3a6eso5pftt724trat593hg351u8toc.apps.googleusercontent.com";
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
          if (tokenResponse.error) {
            console.error('Google OAuth error:', tokenResponse.error);
            showToast('Google login failed.', '⚠️');
            return;
          }
          gcalAccessToken = tokenResponse.access_token;
          localStorage.setItem('gcal_access_token', gcalAccessToken);
          
          document.getElementById('google-login-card').style.display = 'none';
          document.getElementById('google-calendar-container').style.display = 'block';
          showToast('Google services connected successfully!', '☁️');
          
          fetchGoogleCalendarEvents();
          checkGoogleDriveBackupStatus();
          autoRestoreFromGoogleDrive();
        }
      });
      
      // If we already have a session token on boot, verify/init UI
      if (gcalAccessToken) {
        const loginCard = document.getElementById('google-login-card');
        const calContainer = document.getElementById('google-calendar-container');
        if (loginCard) loginCard.style.display = 'none';
        if (calContainer) calContainer.style.display = 'block';
        fetchGoogleCalendarEvents();
        checkGoogleDriveBackupStatus();
        autoRestoreFromGoogleDrive();
      }
    }
  }, 500);

  const connectGoogleBtn = document.getElementById('connect-google-btn');
  if (connectGoogleBtn) {
    connectGoogleBtn.addEventListener('click', () => {
      if (tokenClient) {
        tokenClient.requestAccessToken();
      } else {
        showToast('Google Identity Services client library still loading. Please wait...', '⏳');
      }
    });
  }

  window.fetchGoogleCalendarEvents = async () => {
    if (!gcalAccessToken) {
      const loginCard = document.getElementById('google-login-card');
      const calContainer = document.getElementById('google-calendar-container');
      if (loginCard) loginCard.style.display = 'flex';
      if (calContainer) calContainer.style.display = 'none';
      return;
    }
    
    const eventsList = document.getElementById('calendar-events-list');
    if (!eventsList) return;
    
    eventsList.innerHTML = '<li class="empty-state" style="grid-column: 1 / -1;"><div class="empty-icon">⏳</div><p>Fetching events from Google Calendar...</p></li>';

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}&singleEvents=true&orderBy=startTime&maxResults=50`, {
        headers: {
          'Authorization': `Bearer ${gcalAccessToken}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('gcal_access_token');
        gcalAccessToken = null;
        const loginCard = document.getElementById('google-login-card');
        const calContainer = document.getElementById('google-calendar-container');
        if (loginCard) loginCard.style.display = 'flex';
        if (calContainer) calContainer.style.display = 'none';
        showToast('Google Calendar session expired. Please connect again.', '⚠️');
        return;
      }

      if (!response.ok) {
        throw new Error('Google API response error: ' + response.statusText);
      }

      const data = await response.json();
      const items = data.items || [];

      if (items.length === 0) {
        eventsList.innerHTML = `
          <li class="empty-state" style="grid-column: 1 / -1;">
            <div class="empty-icon">📅</div>
            <p>No upcoming events found on your Google Calendar.</p>
          </li>
        `;
        return;
      }

      eventsList.innerHTML = items.map(event => {
        const start = event.start.dateTime || event.start.date;
        const startDateObj = new Date(start);
        const formattedDate = startDateObj.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        let formattedTime = 'All Day';
        if (event.start.dateTime) {
          const timeHrs = startDateObj.getHours();
          const ampm = timeHrs >= 12 ? 'PM' : 'AM';
          const mins = String(startDateObj.getMinutes()).padStart(2, '0');
          formattedTime = `${timeHrs % 12 || 12}:${mins} ${ampm}`;
        }

        return `
          <li class="booking-card" style="border-left: 4px solid #4285F4;" data-event-id="${event.id}">
            <div class="booking-card-header">
              <div class="booking-client-info">
                <h3 class="booking-client-name">${escapeHtml(event.summary || 'Untitled Event')}</h3>
                <span class="booking-shoot-badge" style="background: rgba(66, 133, 244, 0.1); color: #4285F4;">Google Calendar</span>
              </div>
              <div class="booking-actions">
                <button class="btn-delete-gallery btn-delete-gcal-event" data-event-id="${event.id}" title="Delete calendar event">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="booking-card-body" style="padding: 0.75rem 0;">
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                </svg>
                <span>${formattedDate} • ${formattedTime}</span>
              </div>
              ${event.description ? `
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: var(--text-light); margin-top: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                <span>${escapeHtml(event.description)}</span>
              </div>` : ''}
            </div>
          </li>
        `;
      }).join('');

      eventsList.querySelectorAll('.btn-delete-gcal-event').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const button = e.target.closest('.btn-delete-gcal-event');
          const eventId = button.getAttribute('data-event-id');
          if (confirm('Are you sure you want to delete this event from your Google Calendar?')) {
            await deleteGoogleCalendarEvent(eventId);
          }
        });
      });
    } catch (err) {
      console.error('Failed to fetch events:', err);
      eventsList.innerHTML = `<li class="empty-state" style="grid-column: 1 / -1;"><div class="empty-icon">⚠️</div><p>Failed to load events. Error: ${escapeHtml(err.message)}</p></li>`;
    }
  };

  window.createGoogleCalendarEvent = async (booking) => {
    if (!gcalAccessToken) return null;

    try {
      if (!booking.date || !booking.time) {
        throw new Error('Missing date or time in booking/shoot details.');
      }

      // Compute end time timezone-independently (add 2 hours)
      const [hourStr, minStr] = booking.time.split(':');
      let hr = parseInt(hourStr);
      let min = parseInt(minStr);
      if (isNaN(hr) || isNaN(min)) {
        throw new Error(`Invalid time format: ${booking.time}`);
      }
      hr += 2;
      let nextDate = booking.date;
      if (hr >= 24) {
        hr -= 24;
        // Parse date as local timezone beginning of day to avoid overflow timezone shifts
        const d = new Date(booking.date + 'T00:00:00');
        if (isNaN(d.getTime())) {
          throw new Error(`Invalid date format: ${booking.date}`);
        }
        d.setDate(d.getDate() + 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        nextDate = `${y}-${m}-${day}`;
      }
      const startISO = `${booking.date}T${booking.time}:00`;
      const endISO = `${nextDate}T${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;

      const eventResource = {
        summary: `${booking.clientName} - ${booking.shootType} Shoot`,
        description: `Rhythm Clicks Studio booking.\nPackage: ${booking.package}\nAdvance Paid: ₹${booking.advance}`,
        start: {
          dateTime: startISO,
          timeZone: 'Asia/Kolkata'
        },
        end: {
          dateTime: endISO,
          timeZone: 'Asia/Kolkata'
        }
      };

      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gcalAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventResource)
      });

      if (response.status === 401) {
        localStorage.removeItem('gcal_access_token');
        gcalAccessToken = null;
        const loginCard = document.getElementById('google-login-card');
        const calContainer = document.getElementById('google-calendar-container');
        if (loginCard) loginCard.style.display = 'flex';
        if (calContainer) calContainer.style.display = 'none';
        showToast('Google Calendar session expired. Please connect again.', '⚠️');
        throw new Error('Google Calendar session expired. Please connect again.');
      }

      if (!response.ok) {
        let errMsg = `HTTP error ${response.status}`;
        try {
          const errData = await response.json();
          if (errData && errData.error && errData.error.message) {
            errMsg += `: ${errData.error.message}`;
          }
        } catch(e) {
          try {
            const errText = await response.text();
            if (errText) errMsg += `: ${errText}`;
          } catch(e2) {}
        }
        throw new Error(errMsg);
      }

      const createdEvent = await response.json();
      return createdEvent.id;
    } catch (err) {
      console.error('Failed to create calendar event:', err);
      showToast(`Failed to create Google Calendar event: ${err.message}`, '⚠️');
      return null;
    }
  };

  window.deleteGoogleCalendarEvent = async (eventId) => {
    if (!gcalAccessToken || !eventId) return;

    try {
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${gcalAccessToken}`
        }
      });

      if (response.ok || response.status === 410 || response.status === 404) {
        showToast('Google Calendar event deleted successfully', '🧹');
        
        const booking = bookings.find(b => b.gCalEventId === eventId);
        if (booking) {
          if (isFirebaseActive) {
            await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", booking.id), {
              gCalEventId: ""
            });
          } else {
            delete booking.gCalEventId;
            saveLocalBookings();
            renderBookings();
          }
        }
        
        fetchGoogleCalendarEvents();
      } else {
        throw new Error('Deletion failed with status ' + response.status);
      }
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
      showToast('Failed to delete Google Calendar event.', '⚠️');
    }
  };

  const syncExistingBookingsBtn = document.getElementById('sync-existing-bookings-btn');
  if (syncExistingBookingsBtn) {
    syncExistingBookingsBtn.addEventListener('click', async () => {
      if (!gcalAccessToken) {
        showToast('Connect Google Calendar first.', '⏳');
        return;
      }

      let syncCount = 0;
      for (let booking of bookings) {
        if (!booking.gCalEventId) {
          const eventId = await createGoogleCalendarEvent(booking);
          if (eventId) {
            booking.gCalEventId = eventId;
            if (isFirebaseActive) {
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", booking.id), {
                gCalEventId: eventId
              });
            } else {
              saveLocalBookings();
            }
            syncCount++;
          }
        }
      }

      for (let shoot of shoots) {
        if (!shoot.gCalEventId) {
          let targetBooking = null;
          if (shoot.bookingId) {
            targetBooking = bookings.find(b => b.id === shoot.bookingId);
          } else {
            targetBooking = bookings.find(b => 
              b.clientName && b.clientName.toLowerCase().trim() === shoot.clientName.toLowerCase().trim() && b.date === shoot.date
            );
          }

          if (targetBooking && targetBooking.gCalEventId) {
            shoot.gCalEventId = targetBooking.gCalEventId;
            if (isFirebaseActive) {
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "shoots", shoot.id), {
                gCalEventId: targetBooking.gCalEventId
              });
            } else {
              saveLocalShoots();
            }
            syncCount++;
          } else {
            let shootType = "Completed";
            if (targetBooking && targetBooking.shootType) {
              shootType = targetBooking.shootType;
            }
            const shootObj = {
              clientName: shoot.clientName,
              shootType: shootType,
              date: shoot.date,
              time: shoot.time,
              package: `${shoot.photosCount} photos`,
              advance: (shoot.advanceAmount || 0) + (shoot.balanceAmount || 0)
            };
            const eventId = await createGoogleCalendarEvent(shootObj);
            if (eventId) {
              shoot.gCalEventId = eventId;
              if (isFirebaseActive) {
                await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "shoots", shoot.id), {
                  gCalEventId: eventId
                });
                if (targetBooking) {
                  targetBooking.gCalEventId = eventId;
                  await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", targetBooking.id), {
                    gCalEventId: eventId
                  });
                }
              } else {
                saveLocalShoots();
                if (targetBooking) {
                  targetBooking.gCalEventId = eventId;
                  saveLocalBookings();
                }
              }
              syncCount++;
            }
          }
        }
      }

      if (syncCount > 0) {
        showToast(`Successfully pushed ${syncCount} booking(s)/shoot(s) to Google Calendar!`, '📅');
        renderBookings();
        if (typeof renderShoots === 'function') renderShoots();
        fetchGoogleCalendarEvents();
      } else {
        showToast('All bookings and shoots are already synced!', '✓');
      }
    });
  }

  // --- Google Drive Backup & Restore Methods ---
  const updateDriveUIStatus = (status, message) => {
    const statusText = document.getElementById('drive-backup-status');
    if (!statusText) return;
    
    let badge = '';
    let displayMessage = message;
    
    if (status === 'Connected') {
      badge = '<span style="background: rgba(46, 125, 50, 0.12); color: #2E7D32; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; margin-right: 6px;">Connected</span>';
    } else if (status === 'Syncing' || status === 'Checking') {
      badge = '<span style="background: rgba(33, 150, 243, 0.12); color: #2196f3; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; margin-right: 6px;">' + status + '...</span>';
    } else if (status === 'Error') {
      badge = '<span style="background: rgba(211, 47, 47, 0.12); color: #d32f2f; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; margin-right: 6px;">Error</span>';
      
      // Parse Google API Error JSON dynamically
      try {
        const jsonStartIndex = message.indexOf('{');
        if (jsonStartIndex !== -1) {
          const jsonStr = message.substring(jsonStartIndex);
          const errorObj = JSON.parse(jsonStr);
          if (errorObj && errorObj.error) {
            const apiErr = errorObj.error;
            if (apiErr.message && (apiErr.message.includes('disabled') || apiErr.message.includes('not been used'))) {
              const projIdMatch = apiErr.message.match(/project\s+(\d+)/);
              const projectId = projIdMatch ? projIdMatch[1] : '50274890207';
              const enableUrl = `https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=${projectId}`;
              
              displayMessage = `<strong>Google Drive API is disabled</strong>. You must enable it in your Google Cloud Console for project ${projectId}. <a href="${enableUrl}" target="_blank" style="color: #d32f2f; text-decoration: underline; font-weight: 700; margin-left: 5px;">Enable Google Drive API here &rarr;</a> and then reload this page.`;
            } else {
              displayMessage = `Drive error: ${apiErr.message}`;
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse friendly API error:', e);
      }
    } else {
      badge = '<span style="background: rgba(0, 0, 0, 0.06); color: var(--text-secondary); padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; margin-right: 6px;">Disconnected</span>';
    }
    
    statusText.innerHTML = badge + ' ' + displayMessage;
  };

  const handleGoogleTokenExpiry = () => {
    localStorage.removeItem('gcal_access_token');
    gcalAccessToken = null;
    const loginCard = document.getElementById('google-login-card');
    const calContainer = document.getElementById('google-calendar-container');
    if (loginCard) loginCard.style.display = 'flex';
    if (calContainer) calContainer.style.display = 'none';
    showToast('Google session expired. Please connect again.', '⚠️');
    updateDriveUIStatus('Disconnected', 'Session expired. Connect again.');
  };

  window.checkGoogleDriveBackupStatus = async () => {
    if (!gcalAccessToken) {
      updateDriveUIStatus('Disconnected', 'No active Google connection.');
      return;
    }
    updateDriveUIStatus('Checking', 'Checking backup on Drive...');
    try {
      const q = encodeURIComponent("name='rhythm_clicks_backup.json' and trashed=false");
      const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)`, {
        headers: { 'Authorization': `Bearer ${gcalAccessToken}` }
      });
      if (response.status === 401) {
        handleGoogleTokenExpiry();
        return;
      }
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Drive check failed (${response.status}): ${errText}`);
      }
      const data = await response.json();
      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        const lastModified = new Date(file.modifiedTime).toLocaleString();
        updateDriveUIStatus('Connected', `Backup found. Last synced: ${lastModified}`);
      } else {
        updateDriveUIStatus('Connected', 'No backup file found. Ready to backup.');
      }
    } catch (err) {
      console.warn('Failed to query Google Drive backup status:', err);
      updateDriveUIStatus('Error', 'Unable to check Google Drive: ' + err.message);
    }
  };

  window.backupToGoogleDrive = async (isManual = false) => {
    if (!gcalAccessToken) {
      if (isManual) showToast('Connect to Google Services first.', '⏳');
      return;
    }
    
    updateDriveUIStatus('Syncing', 'Uploading database payload...');
    
    try {
      const backupData = {
        bookings: JSON.parse(localStorage.getItem('rhythm_clicks_bookings') || '[]'),
        shoots: JSON.parse(localStorage.getItem('rhythm_clicks_shoots') || '[]'),
        contacts: JSON.parse(localStorage.getItem('rhythm_clicks_contacts') || '[]'),
        tasks: JSON.parse(localStorage.getItem('rhythm_clicks_tasks') || '[]'),
        galleries: JSON.parse(localStorage.getItem('rhythm_clicks_galleries') || '[]'),
        albums: JSON.parse(localStorage.getItem('rhythm_clicks_albums') || '[]')
      };
      
      const payloadStr = JSON.stringify(backupData);
      
      const q = encodeURIComponent("name='rhythm_clicks_backup.json' and trashed=false");
      const findRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${gcalAccessToken}` }
      });
      
      if (findRes.status === 401) {
        handleGoogleTokenExpiry();
        return;
      }
      if (!findRes.ok) {
        const errText = await findRes.text();
        throw new Error(`Search failed (${findRes.status}): ${errText}`);
      }
      
      const findData = await findRes.json();
      let fileId = null;
      
      if (findData.files && findData.files.length > 0) {
        fileId = findData.files[0].id;
      }
      
      if (fileId) {
        const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${gcalAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: payloadStr
        });
        
        if (!updateRes.ok) {
          const errText = await updateRes.text();
          throw new Error(`Update failed (${updateRes.status}): ${errText}`);
        }
      } else {
        const createMetaRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${gcalAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'rhythm_clicks_backup.json',
            mimeType: 'application/json'
          })
        });
        
        if (!createMetaRes.ok) {
          const errText = await createMetaRes.text();
          throw new Error(`Metadata create failed (${createMetaRes.status}): ${errText}`);
        }
        const newFileMeta = await createMetaRes.json();
        fileId = newFileMeta.id;
        
        const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${gcalAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: payloadStr
        });
        
        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          throw new Error(`Upload payload failed (${uploadRes.status}): ${errText}`);
        }
      }
      
      const nowString = new Date().toLocaleString();
      updateDriveUIStatus('Connected', `Last synced: ${nowString}`);
      showToast('Database successfully backed up to Google Drive!', '💾');
      
    } catch (err) {
      console.error('Failed to backup to Google Drive:', err);
      updateDriveUIStatus('Error', 'Backup failed: ' + err.message);
      showToast('Failed to backup: ' + err.message, '⚠️');
    }
  };

  window.restoreFromGoogleDrive = async () => {
    if (!gcalAccessToken) {
      showToast('Connect Google Services first.', '⏳');
      return;
    }
    
    if (!confirm('Are you sure you want to restore from Google Drive? This will overwrite your current local bookings, tasks, shoots, contacts, galleries, and albums with the backup data from Drive.')) {
      return;
    }
    
    updateDriveUIStatus('Checking', 'Searching for backup file...');
    
    try {
      const q = encodeURIComponent("name='rhythm_clicks_backup.json' and trashed=false");
      const findRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${gcalAccessToken}` }
      });
      
      if (findRes.status === 401) {
        handleGoogleTokenExpiry();
        return;
      }
      if (!findRes.ok) {
        const errText = await findRes.text();
        throw new Error(`Search failed (${findRes.status}): ${errText}`);
      }
      
      const findData = await findRes.json();
      
      if (!findData.files || findData.files.length === 0) {
        showToast('No backup file (rhythm_clicks_backup.json) found on Google Drive.', '⚠️');
        updateDriveUIStatus('Connected', 'Ready to backup (no backup file exists).');
        return;
      }
      
      const fileId = findData.files[0].id;
      updateDriveUIStatus('Checking', 'Downloading backup...');
      
      const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${gcalAccessToken}` }
      });
      
      if (!downloadRes.ok) {
        const errText = await downloadRes.text();
        throw new Error(`Download failed (${downloadRes.status}): ${errText}`);
      }
      
      const backup = await downloadRes.json();
      
      localStorage.setItem('rhythm_clicks_bookings', JSON.stringify(backup.bookings || []));
      localStorage.setItem('rhythm_clicks_shoots', JSON.stringify(backup.shoots || []));
      localStorage.setItem('rhythm_clicks_contacts', JSON.stringify(backup.contacts || []));
      localStorage.setItem('rhythm_clicks_tasks', JSON.stringify(backup.tasks || []));
      localStorage.setItem('rhythm_clicks_galleries', JSON.stringify(backup.galleries || []));
      localStorage.setItem('rhythm_clicks_albums', JSON.stringify(backup.albums || []));
      
      if (typeof loadLocalTasks === 'function') loadLocalTasks();
      if (typeof loadLocalGalleries === 'function') loadLocalGalleries();
      if (typeof loadLocalContacts === 'function') loadLocalContacts();
      if (typeof loadLocalBookings === 'function') loadLocalBookings();
      if (typeof loadLocalShoots === 'function') loadLocalShoots();
      if (typeof loadLocalAlbums === 'function') loadLocalAlbums();
      
      showToast('Database successfully restored from Google Drive!', '✅');
      checkGoogleDriveBackupStatus();
      
    } catch (err) {
      console.error('Failed to restore from Google Drive:', err);
      showToast('Error restoring from Google Drive backup.', '⚠️');
      checkGoogleDriveBackupStatus();
    }
  };

  const autoRestoreFromGoogleDrive = async () => {
    const hasLocalData = 
      localStorage.getItem('rhythm_clicks_bookings') ||
      localStorage.getItem('rhythm_clicks_shoots') ||
      localStorage.getItem('rhythm_clicks_contacts') ||
      localStorage.getItem('rhythm_clicks_tasks') ||
      localStorage.getItem('rhythm_clicks_galleries') ||
      localStorage.getItem('rhythm_clicks_albums');
    
    if (hasLocalData) return;
    
    console.log('No local cache found. Attempting to restore database from Google Drive...');
    try {
      const q = encodeURIComponent("name='rhythm_clicks_backup.json' and trashed=false");
      const findRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { 'Authorization': `Bearer ${gcalAccessToken}` }
      });
      if (!findRes.ok) return;
      const findData = await findRes.json();
      if (findData.files && findData.files.length > 0) {
        const fileId = findData.files[0].id;
        const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { 'Authorization': `Bearer ${gcalAccessToken}` }
        });
        if (downloadRes.ok) {
          const backup = await downloadRes.json();
          localStorage.setItem('rhythm_clicks_bookings', JSON.stringify(backup.bookings || []));
          localStorage.setItem('rhythm_clicks_shoots', JSON.stringify(backup.shoots || []));
          localStorage.setItem('rhythm_clicks_contacts', JSON.stringify(backup.contacts || []));
          localStorage.setItem('rhythm_clicks_tasks', JSON.stringify(backup.tasks || []));
          localStorage.setItem('rhythm_clicks_galleries', JSON.stringify(backup.galleries || []));
          localStorage.setItem('rhythm_clicks_albums', JSON.stringify(backup.albums || []));
          
          if (typeof loadLocalTasks === 'function') loadLocalTasks();
          if (typeof loadLocalGalleries === 'function') loadLocalGalleries();
          if (typeof loadLocalContacts === 'function') loadLocalContacts();
          if (typeof loadLocalBookings === 'function') loadLocalBookings();
          if (typeof loadLocalShoots === 'function') loadLocalShoots();
          if (typeof loadLocalAlbums === 'function') loadLocalAlbums();
          
          showToast('Data auto-restored from Google Drive!', '✅');
          checkGoogleDriveBackupStatus();
        }
      }
    } catch (err) {
      console.warn('Auto-restore from Google Drive failed:', err);
    }
  };

  let driveBackupTimeout = null;
  window.triggerGoogleDriveBackup = () => {
    if (!gcalAccessToken) return;
    
    updateDriveUIStatus('Syncing', 'Pending auto-backup in 5s...');
    
    if (driveBackupTimeout) clearTimeout(driveBackupTimeout);
    
    driveBackupTimeout = setTimeout(() => {
      backupToGoogleDrive(false);
    }, 5000);
  };

  const driveBackupBtn = document.getElementById('drive-backup-btn');
  if (driveBackupBtn) {
    driveBackupBtn.addEventListener('click', () => {
      backupToGoogleDrive(true);
    });
  }

  const driveRestoreBtn = document.getElementById('drive-restore-btn');
  if (driveRestoreBtn) {
    driveRestoreBtn.addEventListener('click', () => {
      restoreFromGoogleDrive();
    });
  }

  const disconnectGoogleBtn = document.getElementById('disconnect-google-btn');
  if (disconnectGoogleBtn) {
    disconnectGoogleBtn.addEventListener('click', () => {
      if (gcalAccessToken) {
        try {
          google.accounts.oauth2.revoke(gcalAccessToken, () => {
            console.log('Google access token revoked.');
          });
        } catch (e) {
          console.warn('Could not revoke Google token remotely:', e);
        }
      }
      localStorage.removeItem('gcal_access_token');
      gcalAccessToken = null;
      
      const loginCard = document.getElementById('google-login-card');
      const calContainer = document.getElementById('google-calendar-container');
      if (loginCard) loginCard.style.display = 'flex';
      if (calContainer) calContainer.style.display = 'none';
      
      showToast('Google account disconnected.', '👋');
      
      const eventsList = document.getElementById('calendar-events-list');
      if (eventsList) eventsList.innerHTML = '';
      updateDriveUIStatus('Disconnected', 'No active Google connection.');
    });
  }

  const checkBookingOverlap = (id, date, time) => {
    if (!time || !date) return false;
    const [tHours, tMinutes] = time.split(':').map(Number);
    const targetMin = tHours * 60 + tMinutes;

    for (let b of bookings) {
      if (b.id !== id && b.date === date && b.time) {
        const [bHours, bMinutes] = b.time.split(':').map(Number);
        const bMin = bHours * 60 + bMinutes;
        if (Math.abs(targetMin - bMin) < 120) {
          const conflictHrs = parseInt(bHours);
          const ampm = conflictHrs >= 12 ? 'PM' : 'AM';
          const formattedConflictTime = `${conflictHrs % 12 || 12}:${String(bMinutes).padStart(2, '0')} ${ampm}`;
          showToast(`⚠️ Schedule conflict! <strong>${b.clientName}</strong> already booked on this date at ${formattedConflictTime}.`, '⚠️');
          return true;
        }
      }
    }
    return false;
  };

  const renderBookings = () => {
    const grid = document.getElementById('bookings-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const filteredBookings = bookings.filter(b => {
      return !searchFilter ||
        b.clientName.toLowerCase().includes(searchFilter) ||
        b.shootType.toLowerCase().includes(searchFilter) ||
        b.package.toLowerCase().includes(searchFilter) ||
        b.date.includes(searchFilter);
    });

    if (filteredBookings.length === 0) {
      grid.innerHTML = `
        <li class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">📅</div>
          <p>${searchFilter ? 'No bookings match your search.' : 'No shoot bookings scheduled yet.'}</p>
        </li>
      `;
      return;
    }

    // Sort bookings chronologically by date and time
    filteredBookings.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.time}`);
      const dateTimeB = new Date(`${b.date}T${b.time}`);
      return dateTimeA - dateTimeB;
    });

    grid.innerHTML = filteredBookings.map(booking => {
      // Format Date for premium visual display (e.g. 15 Jun 2026)
      const dateObj = new Date(booking.date);
      const formattedDate = dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      // Format Time to 12-hour format (e.g. 10:00 AM)
      const [hours, minutes] = (booking.time || '10:00').split(':');
      const timeHrs = parseInt(hours);
      const ampm = timeHrs >= 12 ? 'PM' : 'AM';
      const formattedTime = `${timeHrs % 12 || 12}:${minutes} ${ampm}`;

      // Currency format (e.g. ₹ 5,000)
      const formattedAdvance = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(booking.advance);

      // Booked on date formatting
      const bookedOnDate = booking.timestamp ? new Date(booking.timestamp).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) : 'N/A';

      // Find if there is a completed shoot matching this booking
      const linkedShoot = shoots.find(s => 
        (s.bookingId && s.bookingId === booking.id) || 
        (s.clientName && s.clientName.toLowerCase() === booking.clientName.toLowerCase() && s.date === booking.date)
      );

      // Parse price and calculate balance
      const parsedPrice = parsePackagePrice(booking.package);
      const isCompleted = !!linkedShoot;
      const balance = isCompleted ? 0 : Math.max(0, parsedPrice - booking.advance);
      const formattedBalance = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(balance);

      let accountDisplay = booking.paymentAccount || 'Cash';
      if (linkedShoot) {
        const advAcc = linkedShoot.advanceAccount || 'Cash';
        const balAcc = linkedShoot.balanceAccount || 'Cash';
        if (advAcc === balAcc) {
          accountDisplay = advAcc;
        } else {
          accountDisplay = `${advAcc} & ${balAcc}`;
        }
      }

      // Cross-reference with Gallery Tracker
      const relatedGallery = galleries.find(g => g.clientName.trim().toLowerCase() === booking.clientName.trim().toLowerCase());
      let deliveryInfoHtml = '';
      if (relatedGallery) {
        if (relatedGallery.status === 'delivered' && relatedGallery.deliveredDate) {
          const shootDate = new Date(booking.date);
          const delDate = new Date(relatedGallery.deliveredDate);
          const diffTime = delDate - shootDate;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          deliveryInfoHtml = `
            <div class="booking-detail-item" style="margin-top: 4px;">
              <span style="font-size: 0.75rem; background: rgba(46, 125, 50, 0.08); color: #2E7D32; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <span>✓</span> Delivered in ${diffDays} days
              </span>
            </div>
          `;
        } else {
          const statusMap = {
            'pending': 'Pending Selection',
            'arrived': 'Photos Arrived',
            'selected': 'Selections Done',
            'edited': 'Editing Complete'
          };
          deliveryInfoHtml = `
            <div class="booking-detail-item" style="margin-top: 4px;">
              <span style="font-size: 0.75rem; background: rgba(239, 108, 0, 0.08); color: #E65100; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                <span>⏳</span> Pipeline: ${statusMap[relatedGallery.status] || relatedGallery.status}
              </span>
            </div>
          `;
        }
      }

      return `
        <li class="booking-card" data-id="${booking.id}">
          <div class="booking-card-header">
            <div class="booking-client-info">
              <h3 class="booking-client-name">${escapeHtml(booking.clientName)}</h3>
              <span class="booking-shoot-badge">${escapeHtml(booking.shootType)}</span>
            </div>
            <div class="booking-actions">
              <button class="btn-edit-contact btn-edit-booking" data-id="${booking.id}" title="Edit booking">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-delete-gallery btn-delete-booking" data-id="${booking.id}" title="Delete booking">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="booking-card-body" style="display: flex; flex-direction: column; gap: 0.35rem; padding: 0.6rem 0;">
            <div class="booking-detail-item" style="display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: var(--text-secondary);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${formattedDate} • ${formattedTime}</span>
            </div>
            <div class="booking-detail-item" style="display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: var(--text-secondary);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <span>Pkg: ${escapeHtml(booking.package)}</span>
            </div>
            <div class="booking-detail-item" style="display: flex; align-items: center; gap: 6px; font-size: 0.74rem; color: var(--text-secondary);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                <line x1="12" y1="4" x2="12" y2="20"></line>
              </svg>
              <span>Acc: <strong>${escapeHtml(accountDisplay)}</strong></span>
            </div>
            <div class="booking-detail-item" style="display: flex; align-items: center; gap: 6px; font-size: 0.72rem; color: var(--text-light);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Booked: ${bookedOnDate}</span>
            </div>
            ${deliveryInfoHtml}
          </div>
          
          <div class="booking-card-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 0.5rem; margin-top: 0.2rem;">
            <div>
              <span class="booking-advance-label" style="display: block; font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Paid Adv</span>
              <span class="booking-advance-value" style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">${formattedAdvance}</span>
            </div>
            <div style="text-align: right;">
              <span style="display: block; font-size: 0.65rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">Bal Due</span>
              <span style="font-size: 0.85rem; font-weight: 700; color: ${isCompleted ? '#2E7D32' : (balance === 0 ? '#2E7D32' : '#C62828')};">${isCompleted ? 'Paid ✓' : formattedBalance}</span>
            </div>
          </div>
        </li>
      `;
    }).join('');

    // Attach edit listeners
    grid.querySelectorAll('.btn-edit-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-edit-booking');
        const id = button.getAttribute('data-id');
        window.editBooking(id);
      });
    });

    // Attach delete listeners
    grid.querySelectorAll('.btn-delete-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.target.closest('.btn-delete-booking');
        const id = button.getAttribute('data-id');
        window.deleteBooking(id);
      });
    });

    if (typeof window.renderAccounts === 'function') {
      window.renderAccounts();
    }
    if (typeof window.renderShoots === 'function') {
      window.renderShoots();
    }
  };

  // --- Notification Event Trigger Engine ---
  const checkForTaskStateUpdates = () => {
    if (isInitialLoad) {
      isInitialLoad = false;
      previousTasksState = JSON.parse(JSON.stringify(tasks));
      return;
    }

    tasks.forEach(task => {
      const oldTask = previousTasksState.find(t => t.id === task.id);

      if (!oldTask) {
        // A new task was added globally!
        // If assigned to us and created in the last 30 seconds
        if (task.assignee === currentUser && task.sender !== currentUser && (Date.now() - task.timestamp < 30000)) {
          showToast(`<strong>${task.sender}</strong> sent you a task: "${task.text.substring(0, 30)}..."`, '📥', 'new_task');
        }
      } else {
        // An existing task status changed!
        if (oldTask.status === 'pending' && task.status === 'completed') {
          // If we are the sender, notify us that the assignee checked it off
          if (task.sender === currentUser && task.assignee !== currentUser) {
            showToast(`<strong>${task.assignee}</strong> completed your task: "${task.text.substring(0, 30)}..."`, '✓', 'task_complete');
          }
        }
      }
    });

    previousTasksState = JSON.parse(JSON.stringify(tasks));
  };


  if (isFirebaseActive) {
    // ==========================================================================
    // 1. GLOBAL MODE IMPLEMENTATION (Firebase Firestore + Auth)
    // ==========================================================================
    
    console.log('Booting in Secure Global Mode (Firebase active)');
    loginStatusMsg.textContent = 'Enter studio credentials to sign in.';

    // Dynamic Module Imports of Firebase Web SDKs
    let firebaseApp, firebaseFirestore, firebaseAuth;
    try {
      firebaseApp = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      firebaseAuth = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      firebaseFirestore = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    } catch (err) {
      console.error('Failed to import Firebase modules from CDN:', err);
      loginStatusMsg.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Connection error. Check internet link.</span>';
      return;
    }

    const app = firebaseApp.initializeApp(firebaseConfig);
    auth = firebaseAuth.getAuth(app);
    db = firebaseFirestore.getFirestore(app);

    // Helper to initialize dashboard once user profile is selected
    const initOnlineDashboard = (user, profile) => {
      currentUser = profile;
      console.log(`Authenticated securely as ${currentUser} (${user.email})`);

      // Update UI states
      loginOverlay.classList.add('hidden');
      dashboardApp.style.display = 'flex';
      logoutBtn.style.display = 'block';
      userDisplayLabel.textContent = `Viewing secure board:`;

      // Configure workspace selector (disable switching to other users' views)
      identityPills.forEach(pill => {
        const pillUser = pill.getAttribute('data-user');
        if (pillUser === currentUser) {
          pill.classList.add('active');
          pill.style.display = 'inline-flex';
        } else {
          pill.classList.remove('active');
          pill.style.display = 'none'; // Lock views
        }
      });

      // Initialize compose assignees options
      assigneePills.forEach(pill => {
        const name = pill.getAttribute('data-assignee');
        if (name === currentUser) {
          pill.style.display = 'none';
          pill.classList.remove('active');
        } else {
          pill.style.display = 'inline-flex';
        }
      });

      // Pick default assignee
      const defAssignee = Array.from(assigneePills).find(p => p.getAttribute('data-assignee') !== currentUser);
      if (defAssignee) {
        activeAssignee = defAssignee.getAttribute('data-assignee');
        assigneePills.forEach(p => p.classList.toggle('active', p.getAttribute('data-assignee') === activeAssignee));
      }

      // Setup Firestore Snapshots Listener
      if (firestoreUnsubscribe) firestoreUnsubscribe();
      
      const tasksQuery = firebaseFirestore.query(
        firebaseFirestore.collection(db, "tasks"), 
        firebaseFirestore.orderBy("timestamp", "asc")
      );

      isInitialLoad = true;
      firestoreUnsubscribe = firebaseFirestore.onSnapshot(tasksQuery, (snapshot) => {
        tasks = [];
        snapshot.forEach(doc => {
          tasks.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        renderDashboard();
        checkForTaskStateUpdates();
      }, (error) => {
        console.error('Firestore subscription error:', error);
        showToast('Database access denied. Verify permissions.', '⚠️');
      });

      // Setup Firestore Galleries Snapshots Listener
      if (galleriesUnsubscribe) galleriesUnsubscribe();

      const galleriesQuery = firebaseFirestore.query(
        firebaseFirestore.collection(db, "galleries"),
        firebaseFirestore.orderBy("timestamp", "asc")
      );

      galleriesUnsubscribe = firebaseFirestore.onSnapshot(galleriesQuery, (snapshot) => {
        galleries = [];
        snapshot.forEach(doc => {
          galleries.push({
            id: doc.id,
            ...doc.data()
          });
        });
        renderGalleries();
      }, (error) => {
        console.error('Firestore galleries subscription error:', error);
      });

      // Setup Firestore Contacts Snapshots Listener
      if (contactsUnsubscribe) contactsUnsubscribe();

      const contactsQuery = firebaseFirestore.query(
        firebaseFirestore.collection(db, "contacts"),
        firebaseFirestore.orderBy("name", "asc")
      );

      contactsUnsubscribe = firebaseFirestore.onSnapshot(contactsQuery, (snapshot) => {
        contacts = [];
        snapshot.forEach(doc => {
          contacts.push({
            id: doc.id,
            ...doc.data()
          });
        });
        renderContacts();
      }, (error) => {
        console.error('Firestore contacts subscription error:', error);
      });

      // Setup Firestore Bookings Snapshots Listener
      if (bookingsUnsubscribe) bookingsUnsubscribe();

      const bookingsQuery = firebaseFirestore.query(
        firebaseFirestore.collection(db, "bookings"),
        firebaseFirestore.orderBy("date", "asc")
      );

      bookingsUnsubscribe = firebaseFirestore.onSnapshot(bookingsQuery, (snapshot) => {
        bookings = [];
        snapshot.forEach(doc => {
          bookings.push({
            id: doc.id,
            ...doc.data()
          });
        });
        renderBookings();
      }, (error) => {
        console.error('Firestore bookings subscription error:', error);
      });

      // Setup Firestore Shoots Snapshots Listener
      if (shootsUnsubscribe) shootsUnsubscribe();

      const shootsQuery = firebaseFirestore.query(
        firebaseFirestore.collection(db, "shoots")
      );

      shootsUnsubscribe = firebaseFirestore.onSnapshot(shootsQuery, (snapshot) => {
        shoots = [];
        snapshot.forEach(doc => {
          shoots.push({
            id: doc.id,
            ...doc.data()
          });
        });
        if (typeof renderShoots === 'function') renderShoots();
        if (typeof renderAccounts === 'function') renderAccounts();
      }, (error) => {
        console.error('Firestore shoots subscription error:', error);
      });

      // Setup Firestore Albums Snapshots Listener
      if (albumsUnsubscribe) albumsUnsubscribe();

      const albumsQuery = firebaseFirestore.query(
        firebaseFirestore.collection(db, "albums"),
        firebaseFirestore.orderBy("timestamp", "asc")
      );

      albumsUnsubscribe = firebaseFirestore.onSnapshot(albumsQuery, (snapshot) => {
        albums = [];
        snapshot.forEach(doc => {
          albums.push({
            id: doc.id,
            ...doc.data()
          });
        });
        if (typeof renderAlbums === 'function') renderAlbums();
      }, (error) => {
        console.error('Firestore albums subscription error:', error);
      });
    };

    // Setup Auth Listener
    firebaseAuth.onAuthStateChanged(auth, (user) => {
      if (user) {
        let savedProfile = localStorage.getItem('rhythm_clicks_profile');
        if (savedProfile) {
          initOnlineDashboard(user, savedProfile);
        } else {
          // Authenticated but no profile chosen yet! Show the Netflix-like profile selection card.
          loginCredentialsCard.style.display = 'none';
          loginProfileCard.style.display = 'block';
          loginOverlay.classList.remove('hidden');
          dashboardApp.style.display = 'none';
          logoutBtn.style.display = 'none';
        }
      } else {
        // Sign-out states
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
        if (galleriesUnsubscribe) {
          galleriesUnsubscribe();
          galleriesUnsubscribe = null;
        }
        if (contactsUnsubscribe) {
          contactsUnsubscribe();
          contactsUnsubscribe = null;
        }
        if (bookingsUnsubscribe) {
          bookingsUnsubscribe();
          bookingsUnsubscribe = null;
        }
        if (shootsUnsubscribe) {
          shootsUnsubscribe();
          shootsUnsubscribe = null;
        }
        if (albumsUnsubscribe) {
          albumsUnsubscribe();
          albumsUnsubscribe = null;
        }
        tasks = [];
        previousTasksState = [];
        galleries = [];
        contacts = [];
        bookings = [];
        shoots = [];
        albums = [];
        renderDashboard();
        renderGalleries();
        renderContacts();
        renderBookings();
        if (typeof renderAlbums === 'function') renderAlbums();
        
        loginOverlay.classList.remove('hidden');
        loginCredentialsCard.style.display = 'block';
        loginProfileCard.style.display = 'none';
        dashboardApp.style.display = 'none';
        logoutBtn.style.display = 'none';
      }
    });

    // Form sign-in submission
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value;

      loginStatusMsg.textContent = 'Verifying credentials...';

      firebaseAuth.signInWithEmailAndPassword(auth, email, password)
        .then(() => {
          loginForm.reset();
        })
        .catch((error) => {
          console.error('Sign-in failed:', error);
          loginStatusMsg.innerHTML = '<span style="color: #d32f2f;">Invalid email address or password.</span>';
          showToast('Login failed. Please check credentials.', '❌');
        });
    });

    // Logout trigger
    logoutBtn.addEventListener('click', () => {
      firebaseAuth.signOut(auth)
        .then(() => {
          localStorage.removeItem('rhythm_clicks_profile');
          showToast('Signed out cleanly', '🔒');
        })
        .catch(err => console.error('Sign out error:', err));
    });

    // Add task
    window.addTask = async (text, assignee) => {
      try {
        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "tasks"), {
          text: text.trim(),
          sender: currentUser,
          assignee: assignee,
          status: 'pending',
          timestamp: Date.now()
        });
        showToast(`Task assigned to <strong>${assignee}</strong>`, '📤');
      } catch (err) {
        console.error('Failed to add task to Firestore:', err);
        showToast('Failed to save task: ' + err.message, '⚠️');
      }
    };

    // Complete task
    window.toggleTaskCompletion = async (id) => {
      const task = tasks.find(t => t.id === id);
      if (!task) return;
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';

      try {
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "tasks", id), {
          status: newStatus
        });
        if (newStatus === 'completed') {
          showToast(`Completed task: "${task.text.substring(0, 20)}..."`, '✓', 'task_complete');
        }
      } catch (err) {
        console.error('Failed to update task status:', err);
      }
    };

    // Delete task
    window.deleteTask = async (id) => {
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "tasks", id));
      } catch (err) {
        console.error('Failed to delete document:', err);
      }
    };

    // Clear completed tasks
    clearCompletedBtn.addEventListener('click', async () => {
      const completedSentTasks = tasks.filter(t => t.sender === currentUser && t.status === 'completed');
      if (completedSentTasks.length === 0) {
        showToast('No completed sent tasks to clear.', 'ℹ️');
        return;
      }

      try {
        const batch = firebaseFirestore.writeBatch(db);
        completedSentTasks.forEach(task => {
          const docRef = firebaseFirestore.doc(db, "tasks", task.id);
          batch.delete(docRef);
        });

        await batch.commit();
        showToast(`Cleared ${completedSentTasks.length} completed tasks from logs`, '🧹');
      } catch (err) {
        console.error('Batch delete failed:', err);
        showToast('Failed to clear logs.', '⚠️');
      }
    });

    // Handle Password Update for Firebase
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = newPasswordInput.value;
      const confirmPass = confirmPasswordInput.value;
      
      if (newPass !== confirmPass) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">New passwords do not match.</span>';
        return;
      }
      if (newPass.length < 6) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">Password must be at least 6 characters.</span>';
        return;
      }
      
      settingsStatusMsg.textContent = 'Updating password globally...';
      try {
        await firebaseAuth.updatePassword(auth.currentUser, newPass);
        showToast('Password updated globally!', '🔑');
        
        // Hide modal
        settingsModal.classList.add('hidden');
        setTimeout(() => settingsModal.style.display = 'none', 400);
      } catch (error) {
        console.error('Firebase password update failed:', error);
        if (error.code === 'auth/requires-recent-login') {
          settingsStatusMsg.innerHTML = '<span style="color: #d32f2f; font-weight: 500;">Security timeout. Please Logout and Log back in to update password.</span>';
          showToast('Logout and login required for security.', '⚠️');
        } else {
          settingsStatusMsg.innerHTML = `<span style="color: #d32f2f;">${error.message}</span>`;
        }
      }
    });



    // --- Gallery database actions ---
    window.addGallery = async (clientName, notes) => {
      try {
        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "galleries"), {
          clientName: clientName.trim(),
          notes: notes.trim(),
          status: 'pending',
          timestamp: Date.now(),
          arrivedDate: null,
          selectionDate: null,
          editedDate: null,
          deliveredDate: null
        });
        showToast(`Gallery <strong>${clientName}</strong> registered`, '📸');
      } catch (err) {
        console.error('Failed to add gallery:', err);
        showToast('Failed to register gallery. Try again.', '⚠️');
      }
    };

    window.promptTransitionDate = () => {
      return new Promise((resolve) => {
        const modal = document.getElementById('transition-date-modal');
        const closeBtn = document.getElementById('close-transition-date-btn');
        const useSelectedBtn = document.getElementById('btn-use-selected-date');
        const useCurrentBtn = document.getElementById('btn-use-current-date');
        const datePicker = document.getElementById('transition-date-picker');
        
        if (!modal || !datePicker) {
          resolve(Date.now());
          return;
        }
        
        // Set default date to today in local timezone YYYY-MM-DD
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        datePicker.value = `${year}-${month}-${day}`;
        
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        const cleanup = () => {
          modal.classList.add('hidden');
          modal.style.display = 'none';
          closeBtn.removeEventListener('click', handleCancel);
          useSelectedBtn.removeEventListener('click', handleSelected);
          useCurrentBtn.removeEventListener('click', handleCurrent);
        };
        
        const handleCancel = () => {
          cleanup();
          resolve(null);
        };
        
        const handleSelected = () => {
          const val = datePicker.value;
          cleanup();
          if (val) {
            const selectedDateObj = new Date(val);
            const now = new Date();
            selectedDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
            resolve(selectedDateObj.getTime());
          } else {
            resolve(Date.now());
          }
        };
        
        const handleCurrent = () => {
          cleanup();
          resolve(Date.now());
        };
        
        closeBtn.addEventListener('click', handleCancel);
        useSelectedBtn.addEventListener('click', handleSelected);
        useCurrentBtn.addEventListener('click', handleCurrent);
      });
    };

    window.moveGallery = async (id, nextStatus) => {
      try {
        const chosenTimestamp = await window.promptTransitionDate();
        if (chosenTimestamp === null) return; // User cancelled
        
        const existing = galleries.find(g => g.id === id);
        const updateFields = { status: nextStatus };
        if (existing) {
          if (nextStatus === 'arrived') {
            updateFields.selectionDate = null;
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
            updateFields.arrivedDate = chosenTimestamp;
          } else if (nextStatus === 'selected') {
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            updateFields.selectionDate = chosenTimestamp;
          } else if (nextStatus === 'edited') {
            updateFields.deliveredDate = null;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            if (!existing.selectionDate) updateFields.selectionDate = chosenTimestamp;
            updateFields.editedDate = chosenTimestamp;
          } else if (nextStatus === 'delivered') {
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            if (!existing.selectionDate) updateFields.selectionDate = chosenTimestamp;
            if (!existing.editedDate) updateFields.editedDate = chosenTimestamp;
            updateFields.deliveredDate = chosenTimestamp;
          }
        }
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "galleries", id), updateFields);
        showToast(`Moved to <strong>${nextStatus}</strong>`, '➡️');
        if (nextStatus === 'delivered' && existing) {
          await checkAndCreateAlbum(existing.clientName);
        }
      } catch (err) {
        console.error('Failed to update gallery status:', err);
      }
    };

    window.updateGallery = async (id, clientName, notes, status, chosenTimestamp = Date.now()) => {
      try {
        const existing = galleries.find(g => g.id === id);
        const updateFields = {
          clientName: clientName.trim(),
          notes: notes.trim(),
          status: status
        };
        if (existing) {
          if (status === 'pending') {
            updateFields.arrivedDate = null;
            updateFields.selectionDate = null;
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
          } else if (status === 'arrived') {
            updateFields.selectionDate = null;
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
          } else if (status === 'selected') {
            updateFields.editedDate = null;
            updateFields.deliveredDate = null;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            if (!existing.selectionDate) updateFields.selectionDate = chosenTimestamp;
          } else if (status === 'edited') {
            updateFields.deliveredDate = null;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            if (!existing.selectionDate) updateFields.selectionDate = chosenTimestamp;
            if (!existing.editedDate) updateFields.editedDate = chosenTimestamp;
          } else if (status === 'delivered') {
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            if (!existing.selectionDate) updateFields.selectionDate = chosenTimestamp;
            if (!existing.editedDate) updateFields.editedDate = chosenTimestamp;
            if (!existing.deliveredDate) updateFields.deliveredDate = chosenTimestamp;
          }
        }
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "galleries", id), updateFields);
        showToast(`Gallery updated`, '📝');
        if (status === 'delivered') {
          await checkAndCreateAlbum(clientName);
        }
      } catch (err) {
        console.error('Failed to update gallery:', err);
      }
    };

    window.deleteGallery = async (id) => {
      if (!confirm('Are you sure you want to delete this gallery entry?')) return;
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "galleries", id));
        showToast('Gallery entry deleted', '🧹');
      } catch (err) {
        console.error('Failed to delete gallery:', err);
      }
    };

    // --- Album database actions (Online) ---
    window.addAlbum = async (clientName, notes) => {
      try {
        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "albums"), {
          clientName: clientName.trim(),
          notes: notes.trim(),
          status: 'pending',
          timestamp: Date.now(),
          approvalDate: null,
          printingDate: null,
          arrivedDate: null,
          deliveredDate: null,
          deliveredMethod: ''
        });
        showToast(`Album for <strong>${clientName}</strong> registered`, '📖');
      } catch (err) {
        console.error('Failed to add album:', err);
        showToast('Failed to register album. Try again.', '⚠️');
      }
    };

    window.moveAlbum = async (id, nextStatus, deliveryMethod = '') => {
      try {
        const chosenTimestamp = await window.promptTransitionDate();
        if (chosenTimestamp === null) return; // User cancelled
        
        const existing = albums.find(a => a.id === id);
        const updateFields = { status: nextStatus };
        if (existing) {
          if (nextStatus === 'pending') {
            updateFields.approvalDate = null;
            updateFields.printingDate = null;
            updateFields.arrivedDate = null;
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
          } else if (nextStatus === 'approval') {
            updateFields.printingDate = null;
            updateFields.arrivedDate = null;
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
            updateFields.approvalDate = chosenTimestamp;
          } else if (nextStatus === 'printing') {
            updateFields.arrivedDate = null;
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
            if (!existing.approvalDate) updateFields.approvalDate = chosenTimestamp;
            updateFields.printingDate = chosenTimestamp;
          } else if (nextStatus === 'arrived') {
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
            if (!existing.approvalDate) updateFields.approvalDate = chosenTimestamp;
            if (!existing.printingDate) updateFields.printingDate = chosenTimestamp;
            updateFields.arrivedDate = chosenTimestamp;
          } else if (nextStatus === 'delivered') {
            if (!existing.approvalDate) updateFields.approvalDate = chosenTimestamp;
            if (!existing.printingDate) updateFields.printingDate = chosenTimestamp;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            updateFields.deliveredDate = chosenTimestamp;
            updateFields.deliveredMethod = deliveryMethod || 'In-Hand';
          }
        }
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "albums", id), updateFields);
        showToast(`Moved to <strong>${nextStatus}</strong>`, '➡️');
      } catch (err) {
        console.error('Failed to update album status:', err);
      }
    };

    window.updateAlbum = async (id, clientName, notes, status, deliveryMethod = '', chosenTimestamp = Date.now()) => {
      try {
        const existing = albums.find(a => a.id === id);
        const updateFields = {
          clientName: clientName.trim(),
          notes: notes.trim(),
          status: status
        };
        if (existing) {
          if (status === 'pending') {
            updateFields.approvalDate = null;
            updateFields.printingDate = null;
            updateFields.arrivedDate = null;
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
          } else if (status === 'approval') {
            updateFields.printingDate = null;
            updateFields.arrivedDate = null;
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
            if (!existing.approvalDate) updateFields.approvalDate = chosenTimestamp;
          } else if (status === 'printing') {
            updateFields.arrivedDate = null;
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
            if (!existing.approvalDate) updateFields.approvalDate = chosenTimestamp;
            if (!existing.printingDate) updateFields.printingDate = chosenTimestamp;
          } else if (status === 'arrived') {
            updateFields.deliveredDate = null;
            updateFields.deliveredMethod = '';
            if (!existing.approvalDate) updateFields.approvalDate = chosenTimestamp;
            if (!existing.printingDate) updateFields.printingDate = chosenTimestamp;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
          } else if (status === 'delivered') {
            if (!existing.approvalDate) updateFields.approvalDate = chosenTimestamp;
            if (!existing.printingDate) updateFields.printingDate = chosenTimestamp;
            if (!existing.arrivedDate) updateFields.arrivedDate = chosenTimestamp;
            if (!existing.deliveredDate) updateFields.deliveredDate = chosenTimestamp;
            updateFields.deliveredMethod = deliveryMethod || 'In-Hand';
          }
        }
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "albums", id), updateFields);
        showToast(`Album updated`, '📝');
      } catch (err) {
        console.error('Failed to update album:', err);
      }
    };

    window.deleteAlbum = async (id) => {
      if (!confirm('Are you sure you want to delete this album entry?')) return;
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "albums", id));
        showToast('Album entry deleted', '🧹');
      } catch (err) {
        console.error('Failed to delete album:', err);
      }
    };

    window.addContact = async (name, phone, email, notes) => {
      try {
        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "contacts"), {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim(),
          timestamp: Date.now()
        });
        showToast(`Contact <strong>${name}</strong> saved`, '👥');
      } catch (err) {
        console.error('Failed to add contact:', err);
        showToast('Failed to save contact: ' + err.message, '⚠️');
      }
    };

    window.updateContact = async (id, name, phone, email, notes) => {
      try {
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "contacts", id), {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          notes: notes.trim()
        });
        showToast(`Contact <strong>${name}</strong> updated`, '👥');
      } catch (err) {
        console.error('Failed to update contact:', err);
        showToast('Failed to update contact: ' + err.message, '⚠️');
      }
    };

    window.deleteContact = async (id) => {
      if (!confirm('Are you sure you want to delete this contact?')) return;
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "contacts", id));
        showToast('Contact deleted', '🧹');
      } catch (err) {
        console.error('Failed to delete contact:', err);
      }
    };

    window.addBooking = async (clientName, shootType, date, time, pack, advance, paymentAccount, clientPhone) => {
      try {
        const docRef = await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "bookings"), {
          clientName: clientName.trim(),
          shootType: shootType,
          date: date,
          time: time,
          package: pack.trim(),
          advance: parseFloat(advance) || 0,
          paymentAccount: paymentAccount || 'Cash',
          timestamp: Date.now()
        });
        showToast(`Booking for <strong>${clientName}</strong> saved`, '📅');

        // Auto-save/update contact
        if (clientPhone) {
          const contact = contacts.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
          if (contact) {
            if (contact.phone !== clientPhone.trim()) {
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "contacts", contact.id), {
                phone: clientPhone.trim()
              });
            }
          } else {
            await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "contacts"), {
              name: clientName.trim(),
              phone: clientPhone.trim(),
              email: '',
              notes: 'Auto-created from Booking',
              timestamp: Date.now()
            });
            showToast(`Contact for <strong>${clientName}</strong> saved`, '👥');
          }
        }

        // Auto Sync with Google Calendar if connected
        if (gcalAccessToken && typeof createGoogleCalendarEvent === 'function') {
          const bookingObj = {
            id: docRef.id,
            clientName: clientName,
            shootType: shootType,
            date: date,
            time: time,
            package: pack,
            advance: advance
          };
          const eventId = await createGoogleCalendarEvent(bookingObj);
          if (eventId) {
            await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", docRef.id), {
              gCalEventId: eventId
            });
          }
        }
      } catch (err) {
        console.error('Failed to add booking:', err);
        showToast('Failed to save booking: ' + err.message, '⚠️');
      }
    };

    window.updateBooking = async (id, clientName, shootType, date, time, pack, advance, paymentAccount, clientPhone) => {
      try {
        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", id), {
          clientName: clientName.trim(),
          shootType: shootType,
          date: date,
          time: time,
          package: pack.trim(),
          advance: parseFloat(advance) || 0,
          paymentAccount: paymentAccount || 'Cash'
        });
        showToast(`Booking for <strong>${clientName}</strong> updated`, '📅');

        // Auto-save/update contact
        if (clientPhone) {
          const contact = contacts.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
          if (contact) {
            if (contact.phone !== clientPhone.trim()) {
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "contacts", contact.id), {
                phone: clientPhone.trim()
              });
            }
          } else {
            await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "contacts"), {
              name: clientName.trim(),
              phone: clientPhone.trim(),
              email: '',
              notes: 'Auto-created from Booking Update',
              timestamp: Date.now()
            });
            showToast(`Contact for <strong>${clientName}</strong> saved`, '👥');
          }
        }

        // Auto Sync with Google Calendar if connected (update event if already exists, or create if not)
        const booking = bookings.find(b => b.id === id);
        if (gcalAccessToken && booking) {
          const targetShoot = shoots.find(s => s.bookingId === id || (s.clientName && s.clientName.toLowerCase().trim() === booking.clientName.toLowerCase().trim() && s.date === booking.date));
          if (booking.gCalEventId && typeof deleteGoogleCalendarEvent === 'function' && typeof createGoogleCalendarEvent === 'function') {
            // Delete old event and create new one for simplicity
            await deleteGoogleCalendarEvent(booking.gCalEventId);
            const bookingObj = {
              id: id,
              clientName: clientName,
              shootType: shootType,
              date: date,
              time: time,
              package: pack,
              advance: advance
            };
            const eventId = await createGoogleCalendarEvent(bookingObj);
            if (eventId) {
              booking.gCalEventId = eventId;
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", id), {
                gCalEventId: eventId
              });
              if (targetShoot) {
                targetShoot.gCalEventId = eventId;
                await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "shoots", targetShoot.id), {
                  gCalEventId: eventId
                });
              }
            }
          } else if (!booking.gCalEventId && typeof createGoogleCalendarEvent === 'function') {
            const bookingObj = {
              id: id,
              clientName: clientName,
              shootType: shootType,
              date: date,
              time: time,
              package: pack,
              advance: advance
            };
            const eventId = await createGoogleCalendarEvent(bookingObj);
            if (eventId) {
              booking.gCalEventId = eventId;
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", id), {
                gCalEventId: eventId
              });
              if (targetShoot) {
                targetShoot.gCalEventId = eventId;
                await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "shoots", targetShoot.id), {
                  gCalEventId: eventId
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to update booking:', err);
        showToast('Failed to update booking: ' + err.message, '⚠️');
      }
    };

    window.deleteBooking = async (id) => {
      // Find client name from booking for descriptive warning
      const booking = bookings.find(b => b.id === id);
      const clientName = booking ? booking.clientName : '';
      if (!confirm(`Are you sure you want to delete the booking for '${clientName}'?` + (booking && booking.gCalEventId ? "\nThis will also delete the event from Google Calendar." : ""))) return;
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "bookings", id));
        showToast('Booking deleted', '🧹');
        if (booking && booking.gCalEventId && typeof deleteGoogleCalendarEvent === 'function') {
          await deleteGoogleCalendarEvent(booking.gCalEventId);
        }
      } catch (err) {
        console.error('Failed to delete booking:', err);
      }
    };

    window.addShoot = async (bookingId, clientName, date, time, photosCount, advanceAmount, advanceAccount, balanceAmount, balanceAccount, specialRequests, albumIncluded) => {
      try {
        let gCalEventId = "";

        // Auto Sync with Google Calendar if connected
        if (gcalAccessToken) {
          let targetBooking = null;
          if (bookingId) {
            targetBooking = bookings.find(b => b.id === bookingId);
          } else {
            targetBooking = bookings.find(b => 
              b.clientName && b.clientName.toLowerCase().trim() === clientName.toLowerCase().trim() && b.date === date
            );
          }

          if (targetBooking && targetBooking.gCalEventId) {
            gCalEventId = targetBooking.gCalEventId;
          } else if (typeof createGoogleCalendarEvent === 'function') {
            let shootType = "Completed";
            if (targetBooking && targetBooking.shootType) {
              shootType = targetBooking.shootType;
            }
            const shootObj = {
              clientName: clientName,
              shootType: shootType,
              date: date,
              time: time,
              package: `${photosCount} photos`,
              advance: advanceAmount + balanceAmount
            };
            const eventId = await createGoogleCalendarEvent(shootObj);
            if (eventId) {
              gCalEventId = eventId;
              if (targetBooking) {
                targetBooking.gCalEventId = eventId;
                await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", targetBooking.id), {
                  gCalEventId: eventId
                });
              }
            }
          }
        }

        await firebaseFirestore.addDoc(firebaseFirestore.collection(db, "shoots"), {
          bookingId: bookingId || "",
          clientName: clientName.trim(),
          date: date,
          time: time,
          photosCount: parseInt(photosCount) || 0,
          advanceAmount: parseFloat(advanceAmount) || 0,
          advanceAccount: advanceAccount,
          balanceAmount: parseFloat(balanceAmount) || 0,
          balanceAccount: balanceAccount,
          specialRequests: specialRequests.trim(),
          albumIncluded: !!albumIncluded,
          gCalEventId: gCalEventId,
          timestamp: Date.now()
        });
        showToast(`Shoot for <strong>${clientName}</strong> logged!`, '📷');
        
        // Auto-create a gallery tracker entry under the arrived column
        await window.addGallery(clientName, `Auto-created from completed shoot logged on ${date}`);
      } catch (err) {
        console.error('Failed to add shoot:', err);
        showToast('Failed to save shoot log: ' + err.message, '⚠️');
      }
    };

    window.updateShoot = async (id, clientName, date, time, photosCount, advanceAmount, advanceAccount, balanceAmount, balanceAccount, specialRequests, albumIncluded) => {
      try {
        const existing = shoots.find(s => s.id === id);
        let gCalEventId = existing ? (existing.gCalEventId || "") : "";

        // Auto Sync with Google Calendar if connected
        if (gcalAccessToken) {
          let shootType = "Completed";
          if (existing) {
            if (existing.bookingId) {
              const booking = bookings.find(b => b.id === existing.bookingId);
              if (booking && booking.shootType) shootType = booking.shootType;
            } else {
              const booking = bookings.find(b => b.clientName && b.clientName.toLowerCase().trim() === clientName.toLowerCase().trim() && b.date === date);
              if (booking && booking.shootType) shootType = booking.shootType;
            }
          }

          const shootObj = {
            clientName: clientName,
            shootType: shootType,
            date: date,
            time: time,
            package: `${photosCount} photos`,
            advance: advanceAmount + balanceAmount
          };

          if (gCalEventId && typeof deleteGoogleCalendarEvent === 'function' && typeof createGoogleCalendarEvent === 'function') {
            await deleteGoogleCalendarEvent(gCalEventId);
            const eventId = await createGoogleCalendarEvent(shootObj);
            gCalEventId = eventId || "";
            if (eventId && targetBooking) {
              targetBooking.gCalEventId = eventId;
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", targetBooking.id), {
                gCalEventId: eventId
              });
            }
          } else if (!gCalEventId && typeof createGoogleCalendarEvent === 'function') {
            const eventId = await createGoogleCalendarEvent(shootObj);
            gCalEventId = eventId || "";
            if (eventId && targetBooking) {
              targetBooking.gCalEventId = eventId;
              await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "bookings", targetBooking.id), {
                gCalEventId: eventId
              });
            }
          }
        }

        await firebaseFirestore.updateDoc(firebaseFirestore.doc(db, "shoots", id), {
          clientName: clientName.trim(),
          date: date,
          time: time,
          photosCount: parseInt(photosCount) || 0,
          advanceAmount: parseFloat(advanceAmount) || 0,
          advanceAccount: advanceAccount,
          balanceAmount: parseFloat(balanceAmount) || 0,
          balanceAccount: balanceAccount,
          specialRequests: specialRequests.trim(),
          albumIncluded: !!albumIncluded,
          gCalEventId: gCalEventId
        });
        showToast(`Shoot details for <strong>${clientName}</strong> updated!`, '📷');
      } catch (err) {
        console.error('Failed to update shoot:', err);
        showToast('Failed to update shoot log: ' + err.message, '⚠️');
      }
    };

    window.deleteShoot = async (id) => {
      const s = shoots.find(item => item.id === id);
      const clientName = s ? s.clientName : '';
      if (!confirm(`Are you sure you want to delete the shoot log for '${clientName}'?`)) return;
      try {
        await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "shoots", id));
        
        // Also delete the linked booking if it exists
        if (s) {
          const clientNameLower = s.clientName.toLowerCase().trim();
          let targetBooking = null;
          if (s.bookingId) {
            targetBooking = bookings.find(b => b.id === s.bookingId);
          } else {
            targetBooking = bookings.find(b => 
              b.clientName && b.clientName.toLowerCase().trim() === clientNameLower && b.date === s.date
            );
          }
          if (targetBooking) {
            await firebaseFirestore.deleteDoc(firebaseFirestore.doc(db, "bookings", targetBooking.id));
            if (targetBooking.gCalEventId && typeof deleteGoogleCalendarEvent === 'function') {
              await deleteGoogleCalendarEvent(targetBooking.gCalEventId);
            }
          }
          if (s.gCalEventId && typeof deleteGoogleCalendarEvent === 'function' && (!targetBooking || targetBooking.gCalEventId !== s.gCalEventId)) {
            await deleteGoogleCalendarEvent(s.gCalEventId);
          }
        }
        
        showToast('Shoot log and related booking deleted', '🧹');
      } catch (err) {
        console.error('Failed to delete shoot:', err);
      }
    };

    // Setup Profile Selector Click Handlers for Online Mode
    document.querySelectorAll('#login-profile-card .profile-option').forEach(option => {
      option.addEventListener('click', () => {
        const selectedProfile = option.getAttribute('data-profile');
        const user = auth.currentUser;
        if (user) {
          localStorage.setItem('rhythm_clicks_profile', selectedProfile);
          initOnlineDashboard(user, selectedProfile);
        }
      });
    });
  }
  // ==========================================================================
  // 2. LOCAL FALLBACK MODE IMPLEMENTATION (LocalStorage + BroadcastChannel)
  // ==========================================================================
  else {
    console.log('Booting in Local Offline Fallback Mode');
    loginStatusMsg.innerHTML = 'Workspace ready. <span style="font-weight:700; color: #2E7D32;">Local Mode Active.</span>';
    
    // Customize login card for local simulation
    const submitBtn = loginForm.querySelector('.login-submit-btn');
    if (submitBtn) submitBtn.textContent = 'Enter Local Board';
    loginEmail.placeholder = 'Enter email address';
    loginPassword.placeholder = 'Enter password';
    
    // Add bypass panel for local mode
    const oldBtn = document.getElementById('local-bypass-btn');
    if (oldBtn) oldBtn.remove();

    let bypassContainer = document.getElementById('local-bypass-container');
    if (!bypassContainer && submitBtn) {
      bypassContainer = document.createElement('div');
      bypassContainer.id = 'local-bypass-container';
      bypassContainer.style.display = 'flex';
      bypassContainer.style.flexDirection = 'column';
      bypassContainer.style.alignItems = 'center';
      bypassContainer.style.gap = '0.5rem';
      bypassContainer.style.marginTop = '1rem';
      bypassContainer.style.borderTop = '1px dashed rgba(0,0,0,0.1)';
      bypassContainer.style.paddingTop = '0.75rem';
      bypassContainer.style.width = '100%';

      const label = document.createElement('span');
      label.style.fontSize = '0.75rem';
      label.style.color = 'var(--text-light)';
      label.style.textTransform = 'uppercase';
      label.style.letterSpacing = '0.5px';
      label.style.fontWeight = '600';
      label.textContent = 'Bypass Sign In';
      bypassContainer.appendChild(label);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-secondary';
      btn.textContent = 'Autofill Demo Credentials';
      btn.style.width = '100%';
      btn.style.padding = '0.6rem';
      btn.style.fontSize = '0.8rem';
      btn.style.borderRadius = 'var(--border-radius-md)';
      btn.style.border = '1px dashed rgba(0, 0, 0, 0.2)';
      
      btn.addEventListener('click', () => {
        const creds = getLocalCredentials();
        loginEmail.value = creds.email;
        loginPassword.value = creds.password;
      });
      
      bypassContainer.appendChild(btn);
      submitBtn.parentNode.insertBefore(bypassContainer, submitBtn.nextSibling);
    }
    
    // Define local credentials loader/saver for testing offline
    const getLocalCredentials = () => {
      const storedEmail = localStorage.getItem('rhythm_clicks_master_email') || 'admin@rhythmclicksstudio.com';
      const storedPassword = localStorage.getItem('rhythm_clicks_master_password') || 'rhythm123';
      return { email: storedEmail, password: storedPassword };
    };

    // Enable Local Channel
    localChannel = new BroadcastChannel('rhythm_clicks_workflow_channel');

    const triggerLocalBackup = async () => {
      try {
        const backupData = {
          bookings: JSON.parse(localStorage.getItem('rhythm_clicks_bookings') || '[]'),
          shoots: JSON.parse(localStorage.getItem('rhythm_clicks_shoots') || '[]'),
          contacts: JSON.parse(localStorage.getItem('rhythm_clicks_contacts') || '[]'),
          tasks: JSON.parse(localStorage.getItem('rhythm_clicks_tasks') || '[]'),
          galleries: JSON.parse(localStorage.getItem('rhythm_clicks_galleries') || '[]'),
          albums: JSON.parse(localStorage.getItem('rhythm_clicks_albums') || '[]')
        };
        await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData)
        });
      } catch (err) {
        console.warn('Local file backup sync failed:', err);
      }
      if (typeof triggerGoogleDriveBackup === 'function') {
        triggerGoogleDriveBackup();
      }
    };

    const initializeBackupSync = async () => {
      try {
        const res = await fetch('/api/backup');
        const backup = await res.json();
        if (backup && !backup.error && (backup.bookings || backup.shoots || backup.contacts)) {
          const hasLocalData = 
            localStorage.getItem('rhythm_clicks_bookings') ||
            localStorage.getItem('rhythm_clicks_shoots') ||
            localStorage.getItem('rhythm_clicks_contacts');
          if (!hasLocalData) {
            console.log('No local cache found. Restoring database from server backup...');
            if (backup.bookings) localStorage.setItem('rhythm_clicks_bookings', JSON.stringify(backup.bookings));
            if (backup.shoots) localStorage.setItem('rhythm_clicks_shoots', JSON.stringify(backup.shoots));
            if (backup.contacts) localStorage.setItem('rhythm_clicks_contacts', JSON.stringify(backup.contacts));
            if (backup.tasks) localStorage.setItem('rhythm_clicks_tasks', JSON.stringify(backup.tasks));
            if (backup.galleries) localStorage.setItem('rhythm_clicks_galleries', JSON.stringify(backup.galleries));
            if (backup.albums) localStorage.setItem('rhythm_clicks_albums', JSON.stringify(backup.albums));
            
            // Reload all local arrays
            loadLocalTasks();
            loadLocalGalleries();
            loadLocalContacts();
            loadLocalBookings();
            loadLocalShoots();
            loadLocalAlbums();
          }
        }
      } catch (err) {
        console.warn('Initial backup restore fetch failed:', err);
      }
    };

    initializeBackupSync();

    const loadLocalTasks = () => {
      const raw = localStorage.getItem('rhythm_clicks_tasks');
      tasks = raw ? JSON.parse(raw) : [];
      renderDashboard();
    };

    const saveLocalTasks = () => {
      localStorage.setItem('rhythm_clicks_tasks', JSON.stringify(tasks));
      triggerLocalBackup();
    };

    const loadLocalGalleries = () => {
      const raw = localStorage.getItem('rhythm_clicks_galleries');
      galleries = raw ? JSON.parse(raw) : [];
      renderGalleries();
    };

    const saveLocalGalleries = () => {
      localStorage.setItem('rhythm_clicks_galleries', JSON.stringify(galleries));
      triggerLocalBackup();
    };

    const loadLocalContacts = () => {
      const raw = localStorage.getItem('rhythm_clicks_contacts');
      contacts = raw ? JSON.parse(raw) : [];
      renderContacts();
    };

    const saveLocalContacts = () => {
      localStorage.setItem('rhythm_clicks_contacts', JSON.stringify(contacts));
      triggerLocalBackup();
    };

    const loadLocalBookings = () => {
      const raw = localStorage.getItem('rhythm_clicks_bookings');
      bookings = raw ? JSON.parse(raw) : [];
      renderBookings();
    };

    const saveLocalBookings = () => {
      localStorage.setItem('rhythm_clicks_bookings', JSON.stringify(bookings));
      triggerLocalBackup();
    };

    const loadLocalShoots = () => {
      const raw = localStorage.getItem('rhythm_clicks_shoots');
      shoots = raw ? JSON.parse(raw) : [];
      if (typeof renderShoots === 'function') renderShoots();
      if (typeof renderAccounts === 'function') renderAccounts();
    };

    const saveLocalShoots = () => {
      localStorage.setItem('rhythm_clicks_shoots', JSON.stringify(shoots));
      triggerLocalBackup();
    };

    const loadLocalAlbums = () => {
      const raw = localStorage.getItem('rhythm_clicks_albums');
      albums = raw ? JSON.parse(raw) : [];
      if (typeof renderAlbums === 'function') renderAlbums();
    };

    const saveLocalAlbums = () => {
      localStorage.setItem('rhythm_clicks_albums', JSON.stringify(albums));
      triggerLocalBackup();
    };

    // Handle Local Login Submission
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = loginEmail.value.trim().toLowerCase();
      const passwordVal = loginPassword.value;

      // Validate passcode using local master credentials
      const creds = getLocalCredentials();
      if (passwordVal !== 'bypass' && (val !== creds.email.toLowerCase() || passwordVal !== creds.password)) {
        loginStatusMsg.innerHTML = '<span style="color: #d32f2f;">Invalid email address or password.</span>';
        showToast('Incorrect credentials.', '❌');
        return;
      }
      
      // Credentials verified! Display the Netflix-like profile selection card.
      loginCredentialsCard.style.display = 'none';
      loginProfileCard.style.display = 'block';
      loginForm.reset();
      loginStatusMsg.textContent = 'Workspace ready.';
    });

    // Handle Logout
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('rhythm_clicks_local_user');
      loginOverlay.classList.remove('hidden');
      loginCredentialsCard.style.display = 'block';
      loginProfileCard.style.display = 'none';
      dashboardApp.style.display = 'none';
      logoutBtn.style.display = 'none';
      tasks = [];
      galleries = [];
      contacts = [];
      bookings = [];
      shoots = [];
      albums = [];
      renderDashboard();
      renderGalleries();
      renderContacts();
      renderBookings();
      if (typeof renderShoots === 'function') renderShoots();
      if (typeof renderAlbums === 'function') renderAlbums();
    });

    // Handle Local Password Update
    changePasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentPass = currentPasswordInput.value;
      const newPass = newPasswordInput.value;
      const confirmPass = confirmPasswordInput.value;

      const creds = getLocalCredentials();

      if (creds.password !== currentPass) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">Incorrect current password.</span>';
        showToast('Verification failed.', '❌');
        return;
      }
      if (newPass !== confirmPass) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">New passwords do not match.</span>';
        return;
      }
      if (newPass.length < 6) {
        settingsStatusMsg.innerHTML = '<span style="color: #d32f2f;">Password must be at least 6 characters.</span>';
        return;
      }

      localStorage.setItem('rhythm_clicks_master_password', newPass);
      
      showToast('Password updated locally!', '🔑');
      settingsModal.classList.add('hidden');
      setTimeout(() => settingsModal.style.display = 'none', 400);
    });

    // Dynamic Identity switcher support (Local offline only)
    const selectIdentity = (name) => {
      currentUser = name;
      identityPills.forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-user') === name);
      });

      assigneePills.forEach(pill => {
        const pName = pill.getAttribute('data-assignee');
        if (pName === currentUser) {
          pill.style.display = 'none';
          pill.classList.remove('active');
        } else {
          pill.style.display = 'inline-flex';
        }
      });

      const nextAssignee = Array.from(assigneePills).find(p => p.getAttribute('data-assignee') !== currentUser);
      if (nextAssignee) {
        selectAssignee(nextAssignee.getAttribute('data-assignee'));
      }
      renderDashboard();
    };

    const selectAssignee = (name) => {
      activeAssignee = name;
      assigneePills.forEach(pill => {
        pill.classList.toggle('active', pill.getAttribute('data-assignee') === name);
      });
    };

    identityPills.forEach(pill => {
      pill.addEventListener('click', () => {
        selectIdentity(pill.getAttribute('data-user'));
      });
    });

    assigneePills.forEach(pill => {
      pill.addEventListener('click', () => {
        selectAssignee(pill.getAttribute('data-assignee'));
      });
    });

    // Auto-login session restoration
    const storedUser = sessionStorage.getItem('rhythm_clicks_local_user');
    if (storedUser) {
      currentUser = storedUser;
      loginOverlay.classList.add('hidden');
      dashboardApp.style.display = 'flex';
      logoutBtn.style.display = 'block';
      userDisplayLabel.textContent = `Viewing local board:`;

      // Load initial state
      loadLocalTasks();
      loadLocalGalleries();
      loadLocalContacts();
      loadLocalBookings();
      loadLocalShoots();
      loadLocalAlbums();
      isInitialLoad = true;
      checkForTaskStateUpdates();

      // Configure manual identity switcher pills (Locked to logged in user)
      identityPills.forEach(pill => {
        const pillUser = pill.getAttribute('data-user');
        if (pillUser === currentUser) {
          pill.style.display = 'inline-flex';
          pill.classList.add('active');
        } else {
          pill.style.display = 'none';
          pill.classList.remove('active');
        }
      });

      // Update compose assignees options
      selectIdentity(currentUser);
    }

    // Custom Tasks operations mapping for Local mode
    window.addTask = (text, assignee) => {
      const newTask = {
        id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        text: text.trim(),
        sender: currentUser,
        assignee: assignee,
        status: 'pending',
        timestamp: Date.now()
      };

      tasks.push(newTask);
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'ADD_TASK',
        task: newTask
      });

      showToast(`Task assigned to <strong>${assignee}</strong>`, '📤');
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    };

    window.toggleTaskCompletion = (id) => {
      const taskIndex = tasks.findIndex(t => t.id === id);
      if (taskIndex === -1) return;

      const task = tasks[taskIndex];
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      
      task.status = newStatus;
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'COMPLETE_TASK',
        taskId: id,
        completedBy: currentUser,
        newStatus: newStatus
      });

      if (newStatus === 'completed') {
        showToast(`Completed task: "${task.text.substring(0, 20)}..."`, '✓', 'task_complete');
      }
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    };

    window.deleteTask = (id) => {
      tasks = tasks.filter(t => t.id !== id);
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'DELETE_TASK',
        taskId: id
      });
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    };

    clearCompletedBtn.addEventListener('click', () => {
      const beforeCount = tasks.length;
      const deletedIds = tasks
        .filter(t => t.sender === currentUser && t.status === 'completed')
        .map(t => t.id);

      if (deletedIds.length === 0) {
        showToast('No completed sent tasks to clear.', 'ℹ️');
        return;
      }

      tasks = tasks.filter(t => !(t.sender === currentUser && t.status === 'completed'));
      saveLocalTasks();
      renderDashboard();

      localChannel.postMessage({
        type: 'CLEAR_COMPLETED',
        deletedIds: deletedIds
      });

      showToast(`Cleared ${deletedIds.length} completed tasks from logs`, '🧹');
      previousTasksState = JSON.parse(JSON.stringify(tasks));
    });

    // Custom Galleries operations mapping for Local mode
    window.addGallery = (clientName, notes) => {
      const newGallery = {
        id: 'gallery_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        clientName: clientName.trim(),
        notes: notes.trim(),
        status: 'pending',
        timestamp: Date.now(),
        arrivedDate: null,
        selectionDate: null,
        editedDate: null,
        deliveredDate: null
      };

      galleries.push(newGallery);
      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'ADD_GALLERY',
        gallery: newGallery
      });

      showToast(`Gallery <strong>${clientName}</strong> registered`, '📸');
    };

    window.moveGallery = async (id, nextStatus) => {
      const galleryIndex = galleries.findIndex(g => g.id === id);
      if (galleryIndex === -1) return;

      const chosenTimestamp = await window.promptTransitionDate();
      if (chosenTimestamp === null) return; // User cancelled

      const existing = galleries[galleryIndex];
      existing.status = nextStatus;
      if (nextStatus === 'arrived') {
        existing.selectionDate = null;
        existing.editedDate = null;
        existing.deliveredDate = null;
        existing.arrivedDate = chosenTimestamp;
      } else if (nextStatus === 'selected') {
        existing.editedDate = null;
        existing.deliveredDate = null;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        existing.selectionDate = chosenTimestamp;
      } else if (nextStatus === 'edited') {
        existing.deliveredDate = null;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        if (!existing.selectionDate) existing.selectionDate = chosenTimestamp;
        existing.editedDate = chosenTimestamp;
      } else if (nextStatus === 'delivered') {
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        if (!existing.selectionDate) existing.selectionDate = chosenTimestamp;
        if (!existing.editedDate) existing.editedDate = chosenTimestamp;
        existing.deliveredDate = chosenTimestamp;
      }

      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'MOVE_GALLERY',
        galleryId: id,
        nextStatus: nextStatus
      });

      showToast(`Moved to <strong>${nextStatus}</strong>`, '➡️');
      if (nextStatus === 'delivered' && existing) {
        checkAndCreateAlbum(existing.clientName);
      }
    };

    window.updateGallery = (id, clientName, notes, status, chosenTimestamp = Date.now()) => {
      const gIndex = galleries.findIndex(g => g.id === id);
      if (gIndex === -1) return;

      const existing = galleries[gIndex];
      existing.clientName = clientName.trim();
      existing.notes = notes.trim();
      existing.status = status;

      if (status === 'pending') {
        existing.arrivedDate = null;
        existing.selectionDate = null;
        existing.editedDate = null;
        existing.deliveredDate = null;
      } else if (status === 'arrived') {
        existing.selectionDate = null;
        existing.editedDate = null;
        existing.deliveredDate = null;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
      } else if (status === 'selected') {
        existing.editedDate = null;
        existing.deliveredDate = null;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        if (!existing.selectionDate) existing.selectionDate = chosenTimestamp;
      } else if (status === 'edited') {
        existing.deliveredDate = null;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        if (!existing.selectionDate) existing.selectionDate = chosenTimestamp;
        if (!existing.editedDate) existing.editedDate = chosenTimestamp;
      } else if (status === 'delivered') {
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        if (!existing.selectionDate) existing.selectionDate = chosenTimestamp;
        if (!existing.editedDate) existing.editedDate = chosenTimestamp;
        if (!existing.deliveredDate) existing.deliveredDate = chosenTimestamp;
      }

      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'UPDATE_GALLERY',
        gallery: existing
      });

      showToast(`Gallery updated`, '📝');
      if (status === 'delivered') {
        checkAndCreateAlbum(clientName);
      }
    };

    window.deleteGallery = (id) => {
      if (!confirm('Are you sure you want to delete this gallery entry?')) return;
      galleries = galleries.filter(g => g.id !== id);
      saveLocalGalleries();
      renderGalleries();

      localChannel.postMessage({
        type: 'DELETE_GALLERY',
        galleryId: id
      });

      showToast('Gallery entry deleted', '🧹');
    };

    window.addContact = (name, phone, email, notes) => {
      const newContact = {
        id: 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
        timestamp: Date.now()
      };

      contacts.push(newContact);
      saveLocalContacts();
      renderContacts();

      localChannel.postMessage({
        type: 'ADD_CONTACT',
        contact: newContact
      });

      showToast(`Contact <strong>${name}</strong> saved`, '👥');
    };

    window.updateContact = (id, name, phone, email, notes) => {
      const cIndex = contacts.findIndex(c => c.id === id);
      if (cIndex === -1) return;

      const existing = contacts[cIndex];
      existing.name = name.trim();
      existing.phone = phone.trim();
      existing.email = email.trim();
      existing.notes = notes.trim();

      saveLocalContacts();
      renderContacts();

      localChannel.postMessage({
        type: 'UPDATE_CONTACT',
        contact: existing
      });

      showToast(`Contact <strong>${name}</strong> updated`, '👥');
    };

    window.deleteContact = (id) => {
      if (!confirm('Are you sure you want to delete this contact?')) return;
      contacts = contacts.filter(c => c.id !== id);
      saveLocalContacts();
      renderContacts();

      localChannel.postMessage({
        type: 'DELETE_CONTACT',
        contactId: id
      });

      showToast('Contact deleted', '🧹');
    };

    window.addBooking = async (clientName, shootType, date, time, pack, advance, paymentAccount, clientPhone) => {
      const newBooking = {
        id: 'booking_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        clientName: clientName.trim(),
        shootType: shootType,
        date: date,
        time: time,
        package: pack.trim(),
        advance: parseFloat(advance) || 0,
        paymentAccount: paymentAccount || 'Cash',
        timestamp: Date.now()
      };

      // Auto Sync with Google Calendar if connected
      if (gcalAccessToken && typeof createGoogleCalendarEvent === 'function') {
        const eventId = await createGoogleCalendarEvent(newBooking);
        if (eventId) {
          newBooking.gCalEventId = eventId;
        }
      }

      bookings.push(newBooking);
      saveLocalBookings();
      renderBookings();

      // Auto-save/update contact
      if (clientPhone) {
        const contact = contacts.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
        if (contact) {
          if (contact.phone !== clientPhone.trim()) {
            contact.phone = clientPhone.trim();
            saveLocalContacts();
            renderContacts();
            localChannel.postMessage({
              type: 'UPDATE_CONTACT',
              contact: contact
            });
          }
        } else {
          const newContact = {
            id: 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: clientName.trim(),
            phone: clientPhone.trim(),
            email: '',
            notes: 'Auto-created from Booking',
            timestamp: Date.now()
          };
          contacts.push(newContact);
          saveLocalContacts();
          renderContacts();
          localChannel.postMessage({
            type: 'ADD_CONTACT',
            contact: newContact
          });
          showToast(`Contact for <strong>${clientName}</strong> saved`, '👥');
        }
      }

      localChannel.postMessage({
        type: 'ADD_BOOKING',
        booking: newBooking
      });

      showToast(`Booking for <strong>${clientName}</strong> saved`, '📅');
    };

    window.updateBooking = async (id, clientName, shootType, date, time, pack, advance, paymentAccount, clientPhone) => {
      const existing = bookings.find(b => b.id === id);
      if (!existing) return;

      existing.clientName = clientName.trim();
      existing.shootType = shootType;
      existing.date = date;
      existing.time = time;
      existing.package = pack.trim();
      existing.advance = parseFloat(advance) || 0;
      existing.paymentAccount = paymentAccount || 'Cash';

      // Auto Sync with Google Calendar if connected
      if (gcalAccessToken) {
        if (existing.gCalEventId && typeof deleteGoogleCalendarEvent === 'function' && typeof createGoogleCalendarEvent === 'function') {
          await deleteGoogleCalendarEvent(existing.gCalEventId);
          const eventId = await createGoogleCalendarEvent(existing);
          if (eventId) {
            existing.gCalEventId = eventId;
          } else {
            delete existing.gCalEventId;
          }
        } else if (!existing.gCalEventId && typeof createGoogleCalendarEvent === 'function') {
          const eventId = await createGoogleCalendarEvent(existing);
          if (eventId) {
            existing.gCalEventId = eventId;
          }
        }
      }

      saveLocalBookings();
      renderBookings();

      // Auto-save/update contact
      if (clientPhone) {
        const contact = contacts.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());
        if (contact) {
          if (contact.phone !== clientPhone.trim()) {
            contact.phone = clientPhone.trim();
            saveLocalContacts();
            renderContacts();
            localChannel.postMessage({
              type: 'UPDATE_CONTACT',
              contact: contact
            });
          }
        } else {
          const newContact = {
            id: 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: clientName.trim(),
            phone: clientPhone.trim(),
            email: '',
            notes: 'Auto-created from Booking Update',
            timestamp: Date.now()
          };
          contacts.push(newContact);
          saveLocalContacts();
          renderContacts();
          localChannel.postMessage({
            type: 'ADD_CONTACT',
            contact: newContact
          });
        }
      }

      localChannel.postMessage({
        type: 'UPDATE_BOOKING',
        booking: existing
      });

      showToast(`Booking for <strong>${clientName}</strong> updated`, '📅');
    };

    window.deleteBooking = (id) => {
      const booking = bookings.find(b => b.id === id);
      const clientName = booking ? booking.clientName : '';
      if (!confirm(`Are you sure you want to delete the booking for '${clientName}'?` + (booking && booking.gCalEventId ? "\nThis will also delete the event from Google Calendar." : ""))) return;
      
      bookings = bookings.filter(b => b.id !== id);
      saveLocalBookings();
      renderBookings();

      localChannel.postMessage({
        type: 'DELETE_BOOKING',
        bookingId: id
      });

      showToast('Booking deleted', '🧹');
      if (booking && booking.gCalEventId && typeof deleteGoogleCalendarEvent === 'function') {
        deleteGoogleCalendarEvent(booking.gCalEventId);
      }
    };

    window.addShoot = async (bookingId, clientName, date, time, photosCount, advanceAmount, advanceAccount, balanceAmount, balanceAccount, specialRequests, albumIncluded) => {
      let gCalEventId = "";

      // Auto Sync with Google Calendar if connected
      if (gcalAccessToken) {
        let targetBooking = null;
        if (bookingId) {
          targetBooking = bookings.find(b => b.id === bookingId);
        } else {
          targetBooking = bookings.find(b => 
            b.clientName && b.clientName.toLowerCase().trim() === clientName.toLowerCase().trim() && b.date === date
          );
        }

        if (targetBooking && targetBooking.gCalEventId) {
          gCalEventId = targetBooking.gCalEventId;
        } else if (typeof createGoogleCalendarEvent === 'function') {
          let shootType = "Completed";
          if (targetBooking && targetBooking.shootType) {
            shootType = targetBooking.shootType;
          }
          const shootObj = {
            clientName: clientName,
            shootType: shootType,
            date: date,
            time: time,
            package: `${photosCount} photos`,
            advance: advanceAmount + balanceAmount
          };
          const eventId = await createGoogleCalendarEvent(shootObj);
          if (eventId) {
            gCalEventId = eventId;
            if (targetBooking) {
              targetBooking.gCalEventId = eventId;
              saveLocalBookings();
            }
          }
        }
      }

      const newShoot = {
        id: 'shoot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        bookingId: bookingId || "",
        clientName: clientName.trim(),
        date: date,
        time: time,
        photosCount: parseInt(photosCount) || 0,
        advanceAmount: parseFloat(advanceAmount) || 0,
        advanceAccount: advanceAccount,
        balanceAmount: parseFloat(balanceAmount) || 0,
        balanceAccount: balanceAccount,
        specialRequests: specialRequests.trim(),
        albumIncluded: !!albumIncluded,
        gCalEventId: gCalEventId,
        timestamp: Date.now()
      };

      shoots.push(newShoot);
      saveLocalShoots();
      renderShoots();
      if (typeof renderAccounts === 'function') renderAccounts();

      localChannel.postMessage({
        type: 'ADD_SHOOT',
        shoot: newShoot
      });

      showToast(`Shoot for <strong>${clientName}</strong> logged!`, '📷');

      // Auto-create a gallery tracker entry under the arrived column
      window.addGallery(clientName, `Auto-created from completed shoot logged on ${date}`);
    };

    window.updateShoot = async (id, clientName, date, time, photosCount, advanceAmount, advanceAccount, balanceAmount, balanceAccount, specialRequests, albumIncluded) => {
      const existing = shoots.find(s => s.id === id);
      if (!existing) return;

      existing.clientName = clientName.trim();
      existing.date = date;
      existing.time = time;
      existing.photosCount = parseInt(photosCount) || 0;
      existing.advanceAmount = parseFloat(advanceAmount) || 0;
      existing.advanceAccount = advanceAccount;
      existing.balanceAmount = parseFloat(balanceAmount) || 0;
      existing.balanceAccount = balanceAccount;
      existing.specialRequests = specialRequests.trim();
      existing.albumIncluded = !!albumIncluded;

      // Auto Sync with Google Calendar if connected
      if (gcalAccessToken) {
        let shootType = "Completed";
        if (existing.bookingId) {
          const booking = bookings.find(b => b.id === existing.bookingId);
          if (booking && booking.shootType) shootType = booking.shootType;
        } else {
          const booking = bookings.find(b => b.clientName && b.clientName.toLowerCase().trim() === clientName.toLowerCase().trim() && b.date === date);
          if (booking && booking.shootType) shootType = booking.shootType;
        }

        const shootObj = {
          clientName: clientName,
          shootType: shootType,
          date: date,
          time: time,
          package: `${photosCount} photos`,
          advance: advanceAmount + balanceAmount
        };

        if (existing.gCalEventId && typeof deleteGoogleCalendarEvent === 'function' && typeof createGoogleCalendarEvent === 'function') {
          await deleteGoogleCalendarEvent(existing.gCalEventId);
          const eventId = await createGoogleCalendarEvent(shootObj);
          if (eventId) {
            existing.gCalEventId = eventId;
          } else {
            delete existing.gCalEventId;
          }
        } else if (!existing.gCalEventId && typeof createGoogleCalendarEvent === 'function') {
          const eventId = await createGoogleCalendarEvent(shootObj);
          if (eventId) {
            existing.gCalEventId = eventId;
          }
        }
      }

      saveLocalShoots();
      renderShoots();
      if (typeof renderAccounts === 'function') renderAccounts();

      localChannel.postMessage({
        type: 'UPDATE_SHOOT',
        shoot: existing
      });

      showToast(`Shoot details for <strong>${clientName}</strong> updated!`, '📷');
    };

    window.deleteShoot = (id) => {
      const s = shoots.find(item => item.id === id);
      const clientName = s ? s.clientName : '';
      if (!confirm(`Are you sure you want to delete the shoot log for '${clientName}'?`)) return;

      // Also delete the linked booking if it exists
      if (s) {
        const clientNameLower = s.clientName.toLowerCase().trim();
        let targetBooking = null;
        if (s.bookingId) {
          targetBooking = bookings.find(b => b.id === s.bookingId);
        } else {
          targetBooking = bookings.find(b => 
            b.clientName && b.clientName.toLowerCase().trim() === clientNameLower && b.date === s.date
          );
        }
        if (targetBooking) {
          bookings = bookings.filter(b => b.id !== targetBooking.id);
          saveLocalBookings();
          renderBookings();
          localChannel.postMessage({
            type: 'DELETE_BOOKING',
            bookingId: targetBooking.id
          });
          if (targetBooking.gCalEventId && typeof deleteGoogleCalendarEvent === 'function') {
            deleteGoogleCalendarEvent(targetBooking.gCalEventId);
          }
        }
        if (s.gCalEventId && typeof deleteGoogleCalendarEvent === 'function' && (!targetBooking || targetBooking.gCalEventId !== s.gCalEventId)) {
          deleteGoogleCalendarEvent(s.gCalEventId);
        }
      }

      shoots = shoots.filter(item => item.id !== id);
      saveLocalShoots();
      renderShoots();
      if (typeof renderAccounts === 'function') renderAccounts();

      localChannel.postMessage({
        type: 'DELETE_SHOOT',
        shootId: id
      });

      showToast('Shoot log and related booking deleted', '🧹');
    };

    // Custom Albums operations mapping for Local mode
    window.addAlbum = (clientName, notes) => {
      const newAlbum = {
        id: 'album_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        clientName: clientName.trim(),
        notes: notes.trim(),
        status: 'pending',
        timestamp: Date.now(),
        approvalDate: null,
        printingDate: null,
        arrivedDate: null,
        deliveredDate: null,
        deliveredMethod: ''
      };

      albums.push(newAlbum);
      saveLocalAlbums();
      if (typeof renderAlbums === 'function') renderAlbums();

      localChannel.postMessage({
        type: 'ADD_ALBUM',
        album: newAlbum
      });

      showToast(`Album for <strong>${clientName}</strong> registered`, '📖');
    };

    window.moveAlbum = async (id, nextStatus, deliveryMethod = '') => {
      const albumIndex = albums.findIndex(a => a.id === id);
      if (albumIndex === -1) return;

      const chosenTimestamp = await window.promptTransitionDate();
      if (chosenTimestamp === null) return; // User cancelled

      const existing = albums[albumIndex];
      existing.status = nextStatus;
      if (nextStatus === 'pending') {
        existing.approvalDate = null;
        existing.printingDate = null;
        existing.arrivedDate = null;
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
      } else if (nextStatus === 'approval') {
        existing.printingDate = null;
        existing.arrivedDate = null;
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
        existing.approvalDate = chosenTimestamp;
      } else if (nextStatus === 'printing') {
        existing.arrivedDate = null;
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
        if (!existing.approvalDate) existing.approvalDate = chosenTimestamp;
        existing.printingDate = chosenTimestamp;
      } else if (nextStatus === 'arrived') {
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
        if (!existing.approvalDate) existing.approvalDate = chosenTimestamp;
        if (!existing.printingDate) existing.printingDate = chosenTimestamp;
        existing.arrivedDate = chosenTimestamp;
      } else if (nextStatus === 'delivered') {
        if (!existing.approvalDate) existing.approvalDate = chosenTimestamp;
        if (!existing.printingDate) existing.printingDate = chosenTimestamp;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        existing.deliveredDate = chosenTimestamp;
        existing.deliveredMethod = deliveryMethod || 'In-Hand';
      }

      saveLocalAlbums();
      if (typeof renderAlbums === 'function') renderAlbums();

      localChannel.postMessage({
        type: 'MOVE_ALBUM',
        albumId: id,
        nextStatus: nextStatus,
        deliveryMethod: deliveryMethod
      });

      showToast(`Moved to <strong>${nextStatus}</strong>`, '➡️');
    };

    window.updateAlbum = (id, clientName, notes, status, deliveryMethod = '', chosenTimestamp = Date.now()) => {
      const aIndex = albums.findIndex(a => a.id === id);
      if (aIndex === -1) return;

      const existing = albums[aIndex];
      existing.clientName = clientName.trim();
      existing.notes = notes.trim();
      existing.status = status;

      if (status === 'pending') {
        existing.approvalDate = null;
        existing.printingDate = null;
        existing.arrivedDate = null;
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
      } else if (status === 'approval') {
        existing.printingDate = null;
        existing.arrivedDate = null;
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
        if (!existing.approvalDate) existing.approvalDate = chosenTimestamp;
      } else if (status === 'printing') {
        existing.arrivedDate = null;
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
        if (!existing.approvalDate) existing.approvalDate = chosenTimestamp;
        if (!existing.printingDate) existing.printingDate = chosenTimestamp;
      } else if (status === 'arrived') {
        existing.deliveredDate = null;
        existing.deliveredMethod = '';
        if (!existing.approvalDate) existing.approvalDate = chosenTimestamp;
        if (!existing.printingDate) existing.printingDate = chosenTimestamp;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
      } else if (status === 'delivered') {
        if (!existing.approvalDate) existing.approvalDate = chosenTimestamp;
        if (!existing.printingDate) existing.printingDate = chosenTimestamp;
        if (!existing.arrivedDate) existing.arrivedDate = chosenTimestamp;
        if (!existing.deliveredDate) existing.deliveredDate = chosenTimestamp;
        existing.deliveredMethod = deliveryMethod || 'In-Hand';
      }

      saveLocalAlbums();
      if (typeof renderAlbums === 'function') renderAlbums();

      localChannel.postMessage({
        type: 'UPDATE_ALBUM',
        album: existing
      });

      showToast(`Album updated`, '📝');
    };

    window.deleteAlbum = (id) => {
      if (!confirm('Are you sure you want to delete this album entry?')) return;
      albums = albums.filter(a => a.id !== id);
      saveLocalAlbums();
      if (typeof renderAlbums === 'function') renderAlbums();

      localChannel.postMessage({
        type: 'DELETE_ALBUM',
        albumId: id
      });

      showToast('Album entry deleted', '🧹');
    };

    // Sync over local BroadcastChannel
    localChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;

      loadLocalTasks();
      loadLocalGalleries();
      loadLocalContacts();
      loadLocalBookings();
      loadLocalShoots();
      loadLocalAlbums();
      checkForTaskStateUpdates();
    };

    // Setup Profile Selector Click Handlers for Local Mode
    document.querySelectorAll('#login-profile-card .profile-option').forEach(option => {
      option.addEventListener('click', () => {
        const selectedProfile = option.getAttribute('data-profile');
        currentUser = selectedProfile;
        sessionStorage.setItem('rhythm_clicks_local_user', currentUser);

        loginOverlay.classList.add('hidden');
        dashboardApp.style.display = 'flex';
        logoutBtn.style.display = 'block';
        userDisplayLabel.textContent = `Viewing local board:`;

        // Load initial state
        loadLocalTasks();
        loadLocalGalleries();
        loadLocalContacts();
        loadLocalBookings();
        loadLocalShoots();
        loadLocalAlbums();
        isInitialLoad = true;
        checkForTaskStateUpdates();

        // Configure manual identity switcher pills (Locked to logged in user)
        identityPills.forEach(pill => {
          const pillUser = pill.getAttribute('data-user');
          if (pillUser === currentUser) {
            pill.style.display = 'inline-flex';
            pill.classList.add('active');
          } else {
            pill.style.display = 'none';
            pill.classList.remove('active');
          }
        });

        // Update compose assignees options
        selectIdentity(currentUser);
        loginForm.reset();
        showToast(`Logged into local board as <strong>${currentUser}</strong>`, '🔒');
      });
    });
  }

  // --- Tab switching listeners ---
  const tabTasks = document.getElementById('tab-tasks');
  const tabShoots = document.getElementById('tab-shoots');
  const tabCalendar = document.getElementById('tab-calendar');
  const tabGalleries = document.getElementById('tab-galleries');
  const tabAlbums = document.getElementById('tab-albums');
  const tabContacts = document.getElementById('tab-contacts');
  const tabAccounts = document.getElementById('tab-accounts');

  const tasksSection = document.getElementById('tasks-section');
  const shootsSection = document.getElementById('shoots-section');
  const calendarSection = document.getElementById('calendar-section');
  const galleriesSection = document.getElementById('galleries-section');
  const albumsSection = document.getElementById('albums-section');
  const contactsSection = document.getElementById('contacts-section');
  const accountsSection = document.getElementById('accounts-section');

  const tabs = [
    { button: tabTasks, section: tasksSection },
    { button: tabBookings, section: bookingsSection },
    { button: tabShoots, section: shootsSection },
    { button: tabCalendar, section: calendarSection },
    { button: tabGalleries, section: galleriesSection },
    { button: tabAlbums, section: albumsSection },
    { button: tabContacts, section: contactsSection },
    { button: tabAccounts, section: accountsSection }
  ];

  const switchTab = (activeTab, activeSection) => {
    tabs.forEach(tab => {
      if (tab.button && tab.section) {
        if (tab.button === activeTab) {
          tab.button.classList.add('active');
          tab.section.classList.add('active');
        } else {
          tab.button.classList.remove('active');
          tab.section.classList.remove('active');
        }
      }
    });

    // Trigger specific rendering/fetch logic if needed
    if (activeTab === tabCalendar) {
      if (typeof fetchGoogleCalendarEvents === 'function') {
        fetchGoogleCalendarEvents();
      }
    } else if (activeTab === tabAccounts) {
      if (typeof renderAccounts === 'function') {
        renderAccounts();
      }
    } else if (activeTab === tabShoots) {
      if (typeof renderShoots === 'function') {
        renderShoots();
      }
    } else if (activeTab === tabAlbums) {
      if (typeof renderAlbums === 'function') {
        renderAlbums();
      }
    }
  };

  tabs.forEach(tab => {
    if (tab.button) {
      tab.button.addEventListener('click', () => {
        switchTab(tab.button, tab.section);
      });
    }
  });

  // --- Add Contact Modal Display Handlers ---
  const contactModal = document.getElementById('contact-modal');
  const addContactBtn = document.getElementById('add-contact-btn');
  const closeContactBtn = document.getElementById('close-contact-btn');
  const addContactForm = document.getElementById('add-contact-form');
  const contactName = document.getElementById('contact-name');
  const contactPhone = document.getElementById('contact-phone');
  const contactEmail = document.getElementById('contact-email');
  const contactNotes = document.getElementById('contact-notes');
  const contactStatusMsg = document.getElementById('contact-status-msg');

  if (addContactBtn) {
    addContactBtn.addEventListener('click', () => {
      addContactForm.reset();
      contactStatusMsg.textContent = 'Add a new client to the studio database.';
      contactModal.style.display = 'flex';
      contactModal.offsetHeight; // force reflow
      contactModal.classList.remove('hidden');
    });
  }

  const closeContact = () => {
    contactModal.classList.add('hidden');
    setTimeout(() => {
      contactModal.style.display = 'none';
    }, 400);
  };

  if (closeContactBtn) {
    closeContactBtn.addEventListener('click', closeContact);
  }

  if (contactModal) {
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) {
        closeContact();
      }
    });
  }

  if (addContactForm) {
    addContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = contactName.value;
      const phone = contactPhone.value;
      const email = contactEmail.value;
      const notes = contactNotes.value;
      if (!name.trim() || !phone.trim()) return;

      await window.addContact(name, phone, email, notes);
      closeContact();
    });
  }

  // --- Global Search Input ---
  const globalSearch = document.getElementById('global-search');
  const clearSearchBtn = document.getElementById('clear-search-btn');

  const toggleClearBtn = () => {
    if (clearSearchBtn) {
      if (globalSearch && globalSearch.value) {
        clearSearchBtn.style.display = 'flex';
      } else {
        clearSearchBtn.style.display = 'none';
      }
    }
  };

  if (globalSearch) {
    globalSearch.addEventListener('input', (e) => {
      searchFilter = e.target.value.toLowerCase().trim();
      toggleClearBtn();
      renderDashboard();
      renderGalleries();
      renderContacts();
      renderBookings();
      if (typeof renderAlbums === 'function') renderAlbums();
      renderSearchPipeline();
    });
  }

  if (clearSearchBtn && globalSearch) {
    clearSearchBtn.addEventListener('click', () => {
      globalSearch.value = '';
      searchFilter = '';
      toggleClearBtn();
      globalSearch.focus();
      renderDashboard();
      renderGalleries();
      renderContacts();
      renderBookings();
      if (typeof renderAlbums === 'function') renderAlbums();
      renderSearchPipeline();
    });
  }

  // --- Add Gallery Modal Display Handlers ---
  const galleryModal = document.getElementById('gallery-modal');
  const addGalleryBtn = document.getElementById('add-gallery-btn');
  const closeGalleryBtn = document.getElementById('close-gallery-btn');
  const addGalleryForm = document.getElementById('add-gallery-form');
  const galleryClientName = document.getElementById('gallery-client-name');
  const galleryNotesInput = document.getElementById('gallery-notes-input');
  const galleryStatusMsg = document.getElementById('gallery-status-msg');

  if (addGalleryBtn) {
    addGalleryBtn.addEventListener('click', () => {
      addGalleryForm.reset();
      galleryStatusMsg.textContent = 'This gallery will enter the "Arrived" column.';
      galleryModal.style.display = 'flex';
      galleryModal.offsetHeight; // force reflow
      galleryModal.classList.remove('hidden');
    });
  }

  const closeGallery = () => {
    galleryModal.classList.add('hidden');
    setTimeout(() => {
      galleryModal.style.display = 'none';
    }, 400);
  };

  if (closeGalleryBtn) {
    closeGalleryBtn.addEventListener('click', closeGallery);
  }

  if (galleryModal) {
    galleryModal.addEventListener('click', (e) => {
      if (e.target === galleryModal) {
        closeGallery();
      }
    });
  }

  if (addGalleryForm) {
    addGalleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = galleryClientName.value;
      const notes = galleryNotesInput.value;
      if (!name.trim()) return;

      await window.addGallery(name, notes);
      closeGallery();
    });
  }

  // --- Edit Gallery Modal Display Handlers ---
  const editGalleryModal = document.getElementById('edit-gallery-modal');
  const closeEditGalleryBtn = document.getElementById('close-edit-gallery-btn');
  const editGalleryForm = document.getElementById('edit-gallery-form');
  const editGalleryId = document.getElementById('edit-gallery-id');
  const editGalleryClientName = document.getElementById('edit-gallery-client-name');
  const editGalleryNotesInput = document.getElementById('edit-gallery-notes-input');
  const editGalleryStatusSelect = document.getElementById('edit-gallery-status-select');

  const closeEditGallery = () => {
    editGalleryModal.classList.add('hidden');
    setTimeout(() => {
      editGalleryModal.style.display = 'none';
    }, 400);
  };

  if (closeEditGalleryBtn) {
    closeEditGalleryBtn.addEventListener('click', closeEditGallery);
  }

  if (editGalleryModal) {
    editGalleryModal.addEventListener('click', (e) => {
      if (e.target === editGalleryModal) {
        closeEditGallery();
      }
    });
  }

  if (editGalleryForm) {
    editGalleryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editGalleryId.value;
      const name = editGalleryClientName.value;
      const notes = editGalleryNotesInput.value;
      const status = editGalleryStatusSelect.value;
      if (!name.trim()) return;

      const gallery = galleries.find(g => g.id === id);
      let chosenTimestamp = Date.now();
      if (gallery && gallery.status !== status) {
        const promptDate = await window.promptTransitionDate();
        if (promptDate === null) return; // User cancelled
        chosenTimestamp = promptDate;
      }

      await window.updateGallery(id, name, notes, status, chosenTimestamp);
      closeEditGallery();
    });
  }

  // --- Add Album Modal Display Handlers ---
  if (addAlbumBtn) {
    addAlbumBtn.addEventListener('click', () => {
      addAlbumForm.reset();
      albumStatusMsg.textContent = 'This album will enter the "Approval" column.';
      albumModal.style.display = 'flex';
      albumModal.offsetHeight; // force reflow
      albumModal.classList.remove('hidden');
    });
  }

  const closeAlbum = () => {
    albumModal.classList.add('hidden');
    setTimeout(() => {
      albumModal.style.display = 'none';
    }, 400);
  };

  if (closeAlbumBtn) {
    closeAlbumBtn.addEventListener('click', closeAlbum);
  }

  if (albumModal) {
    albumModal.addEventListener('click', (e) => {
      if (e.target === albumModal) {
        closeAlbum();
      }
    });
  }

  if (addAlbumForm) {
    addAlbumForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = albumClientName.value;
      const notes = albumNotesInput.value;
      if (!name.trim()) return;

      await window.addAlbum(name, notes);
      closeAlbum();
    });
  }

  // --- Edit Album Modal Display Handlers ---
  const closeEditAlbum = () => {
    editAlbumModal.classList.add('hidden');
    setTimeout(() => {
      editAlbumModal.style.display = 'none';
    }, 400);
  };

  if (closeEditAlbumBtn) {
    closeEditAlbumBtn.addEventListener('click', closeEditAlbum);
  }

  if (editAlbumModal) {
    editAlbumModal.addEventListener('click', (e) => {
      if (e.target === editAlbumModal) {
        closeEditAlbum();
      }
    });
  }

  if (editAlbumForm) {
    editAlbumForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editAlbumId.value;
      const name = editAlbumClientName.value;
      const notes = editAlbumNotesInput.value;
      const status = editAlbumStatusSelect.value;
      const deliveryMethod = editAlbumDeliveryMethod.value;
      if (!name.trim()) return;

      const album = albums.find(a => a.id === id);
      let chosenTimestamp = Date.now();
      if (album && album.status !== status) {
        const promptDate = await window.promptTransitionDate();
        if (promptDate === null) return; // User cancelled
        chosenTimestamp = promptDate;
      }

      await window.updateAlbum(id, name, notes, status, deliveryMethod, chosenTimestamp);
      closeEditAlbum();
    });
  }

  if (editAlbumStatusSelect && editAlbumDeliveryContainer) {
    editAlbumStatusSelect.addEventListener('change', (e) => {
      if (e.target.value === 'delivered') {
        editAlbumDeliveryContainer.style.display = 'block';
      } else {
        editAlbumDeliveryContainer.style.display = 'none';
      }
    });
  }

  // --- Edit Contact Modal Display Handlers ---
  const editContactModal = document.getElementById('edit-contact-modal');
  const closeEditContactBtn = document.getElementById('close-edit-contact-btn');
  const editContactForm = document.getElementById('edit-contact-form');
  const editContactId = document.getElementById('edit-contact-id');
  const editContactName = document.getElementById('edit-contact-name');
  const editContactPhone = document.getElementById('edit-contact-phone');
  const editContactEmail = document.getElementById('edit-contact-email');
  const editContactNotes = document.getElementById('edit-contact-notes');

  const closeEditContact = () => {
    editContactModal.classList.add('hidden');
    setTimeout(() => {
      editContactModal.style.display = 'none';
    }, 400);
  };

  if (closeEditContactBtn) {
    closeEditContactBtn.addEventListener('click', closeEditContact);
  }

  if (editContactModal) {
    editContactModal.addEventListener('click', (e) => {
      if (e.target === editContactModal) {
        closeEditContact();
      }
    });
  }

  if (editContactForm) {
    editContactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editContactId.value;
      const name = editContactName.value;
      const phone = editContactPhone.value;
      const email = editContactEmail.value;
      const notes = editContactNotes.value;
      if (!name.trim() || !phone.trim()) return;

      await window.updateContact(id, name, phone, email, notes);
      closeEditContact();
    });
  }

  // --- Settings Modal Display Handlers ---
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      changePasswordForm.reset();
      settingsStatusMsg.textContent = 'Modify your workspace password.';
      settingsModal.style.display = 'flex';
      settingsModal.offsetHeight; // force reflow
      settingsModal.classList.remove('hidden');
    });
  }

  const closeSettings = () => {
    settingsModal.classList.add('hidden');
    setTimeout(() => {
      settingsModal.style.display = 'none';
    }, 400);
  };

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettings);
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        closeSettings();
      }
    });
  }

  // --- Backup & Restore Modal Handlers ---
  if (backupBtn) {
    backupBtn.addEventListener('click', () => {
      if (restoreFileInput) restoreFileInput.value = '';
      if (backupStatusMsg) backupStatusMsg.innerHTML = '<span style="color: var(--text-secondary);">Select Excel file to restore, or download current database.</span>';
      backupModal.style.display = 'flex';
      backupModal.offsetHeight; // force reflow
      backupModal.classList.remove('hidden');
    });
  }

  const closeBackup = () => {
    backupModal.classList.add('hidden');
    setTimeout(() => {
      backupModal.style.display = 'none';
    }, 400);
  };

  if (closeBackupBtn) {
    closeBackupBtn.addEventListener('click', closeBackup);
  }

  if (backupModal) {
    backupModal.addEventListener('click', (e) => {
      if (e.target === backupModal) {
        closeBackup();
      }
    });
  }

  // --- Excel Backup Export Implementation ---
  if (exportExcelBtn) {
    exportExcelBtn.addEventListener('click', () => {
      try {
        if (typeof XLSX === 'undefined') {
          showToast('SheetJS utility library not loaded. Check connection.', '⚠️');
          return;
        }

        const wb = XLSX.utils.book_new();

        const cleanData = (arr) => {
          return arr.map(item => {
            const cleaned = { ...item };
            // Strip complex prototype getters/functions if any, keeping flat primitives
            return cleaned;
          });
        };

        const wsBookings = XLSX.utils.json_to_sheet(cleanData(bookings));
        XLSX.utils.book_append_sheet(wb, wsBookings, "Bookings");

        const wsShoots = XLSX.utils.json_to_sheet(cleanData(shoots));
        XLSX.utils.book_append_sheet(wb, wsShoots, "Shoots");

        const wsContacts = XLSX.utils.json_to_sheet(cleanData(contacts));
        XLSX.utils.book_append_sheet(wb, wsContacts, "Contacts");

        const wsTasks = XLSX.utils.json_to_sheet(cleanData(tasks));
        XLSX.utils.book_append_sheet(wb, wsTasks, "Tasks");

        const wsGalleries = XLSX.utils.json_to_sheet(cleanData(galleries));
        XLSX.utils.book_append_sheet(wb, wsGalleries, "Galleries");

        const wsAlbums = XLSX.utils.json_to_sheet(cleanData(albums));
        XLSX.utils.book_append_sheet(wb, wsAlbums, "Albums");

        const dateStr = new Date().toISOString().slice(0, 10);
        XLSX.writeFile(wb, `rhythm_clicks_backup_${dateStr}.xlsx`);
        showToast('All data exported to Excel!', '📥');
      } catch (err) {
        console.error('Excel export failed:', err);
        showToast('Backup export failed. Check console.', '❌');
      }
    });
  }

  // Helper: Delete all documents in a collection (Firestore)
  const clearFirestoreCollection = async (collectionName) => {
    const collRef = firebaseFirestore.collection(db, collectionName);
    const snapshot = await firebaseFirestore.getDocs(collRef);
    const batch = firebaseFirestore.writeBatch(db);
    let count = 0;
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    if (count > 0) {
      await batch.commit();
    }
  };

  // Helper: Restore collection data (Firestore)
  const restoreFirestoreCollection = async (collectionName, dataArray, overwrite) => {
    if (overwrite) {
      await clearFirestoreCollection(collectionName);
    }
    const batchSize = 100;
    for (let i = 0; i < dataArray.length; i += batchSize) {
      const batch = firebaseFirestore.writeBatch(db);
      const chunk = dataArray.slice(i, i + batchSize);
      chunk.forEach(item => {
        const id = item.id;
        const cleaned = { ...item };
        delete cleaned.id;
        
        let docRef;
        if (id) {
          docRef = firebaseFirestore.doc(db, collectionName, id);
        } else {
          docRef = firebaseFirestore.doc(firebaseFirestore.collection(db, collectionName));
        }
        batch.set(docRef, cleaned);
      });
      await batch.commit();
    }
  };

  // Helper: Restore local storage key (Offline Mode)
  const restoreLocalCollection = (sheetData, currentArray, storageKey, saveFunc, overwrite) => {
    if (overwrite) {
      currentArray.length = 0;
    }
    sheetData.forEach(item => {
      const idx = currentArray.findIndex(x => x.id === item.id);
      if (idx > -1) {
        currentArray[idx] = item;
      } else {
        currentArray.push(item);
      }
    });
    saveFunc();
  };

  // --- Excel Restore / Import Implementation ---
  const handleRestore = (overwrite) => {
    if (typeof XLSX === 'undefined') {
      showToast('SheetJS utility library not loaded.', '⚠️');
      return;
    }

    if (!restoreFileInput.files || restoreFileInput.files.length === 0) {
      showToast('Please select a backup file first.', '⚠️');
      return;
    }

    const file = restoreFileInput.files[0];
    const modeName = overwrite ? 'Overwrite' : 'Merge';
    const confirmMessage = overwrite 
      ? `WARNING: This will delete ALL existing database entries and restore ONLY from the Excel file. Are you sure?`
      : `This will merge Excel backup data into the existing database. Are you sure?`;

    if (!confirm(confirmMessage)) return;

    backupStatusMsg.innerHTML = '<span style="color: #1976D2; font-weight: 600;">Reading backup file...</span>';

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Parse sheets
        const sheetNames = workbook.SheetNames;
        const parsedData = {};
        sheetNames.forEach(name => {
          parsedData[name] = XLSX.utils.sheet_to_json(workbook.Sheets[name]);
        });

        const bookingsData = parsedData["Bookings"] || [];
        const shootsData = parsedData["Shoots"] || [];
        const contactsData = parsedData["Contacts"] || [];
        const tasksData = parsedData["Tasks"] || [];
        const galleriesData = parsedData["Galleries"] || [];
        const albumsData = parsedData["Albums"] || [];

        backupStatusMsg.innerHTML = `<span style="color: #1976D2; font-weight: 600;">Restoring (${modeName} mode)...</span>`;

        // 1. Firebase Mode Restore
        if (db) {
          await restoreFirestoreCollection("bookings", bookingsData, overwrite);
          await restoreFirestoreCollection("shoots", shootsData, overwrite);
          await restoreFirestoreCollection("contacts", contactsData, overwrite);
          await restoreFirestoreCollection("tasks", tasksData, overwrite);
          await restoreFirestoreCollection("galleries", galleriesData, overwrite);
          await restoreFirestoreCollection("albums", albumsData, overwrite);
        } 
        // 2. Local fallback Mode Restore
        else {
          restoreLocalCollection(bookingsData, bookings, 'rhythm_clicks_bookings', () => localStorage.setItem('rhythm_clicks_bookings', JSON.stringify(bookings)), overwrite);
          restoreLocalCollection(shootsData, shoots, 'rhythm_clicks_shoots', () => localStorage.setItem('rhythm_clicks_shoots', JSON.stringify(shoots)), overwrite);
          restoreLocalCollection(contactsData, contacts, 'rhythm_clicks_contacts', () => localStorage.setItem('rhythm_clicks_contacts', JSON.stringify(contacts)), overwrite);
          restoreLocalCollection(tasksData, tasks, 'rhythm_clicks_tasks', () => localStorage.setItem('rhythm_clicks_tasks', JSON.stringify(tasks)), overwrite);
          restoreLocalCollection(galleriesData, galleries, 'rhythm_clicks_galleries', () => localStorage.setItem('rhythm_clicks_galleries', JSON.stringify(galleries)), overwrite);
          restoreLocalCollection(albumsData, albums, 'rhythm_clicks_albums', () => localStorage.setItem('rhythm_clicks_albums', JSON.stringify(albums)), overwrite);
          
          // Trigger local render
          renderDashboard();
          renderBookings();
          renderContacts();
          renderGalleries();
          if (typeof renderAlbums === 'function') renderAlbums();
          
          if (localChannel) {
            localChannel.postMessage({ type: 'sync_all' });
          }
        }

        backupStatusMsg.innerHTML = '<span style="color: #2E7D32; font-weight: 700;">Database restored successfully!</span>';
        showToast('Database restore completed successfully.', '✅');
        closeBackup();
      } catch (err) {
        console.error('Database restore failed:', err);
        backupStatusMsg.innerHTML = '<span style="color: #d32f2f; font-weight: 600;">Restore failed. Make sure it is a valid backup file.</span>';
        showToast('Restore failed. Check file format.', '❌');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (restoreMergeBtn) {
    restoreMergeBtn.addEventListener('click', () => handleRestore(false));
  }

  if (restoreOverwriteBtn) {
    restoreOverwriteBtn.addEventListener('click', () => handleRestore(true));
  }

  // --- Assign form submit actions ---
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = taskText.value;
      if (!text.trim() || !activeAssignee) return;

      window.addTask(text, activeAssignee);
      taskText.value = '';
    });
  }

  // --- Export Galleries to CSV (Excel compatible) ---
  const exportGalleriesBtn = document.getElementById('export-galleries-btn');
  if (exportGalleriesBtn) {
    exportGalleriesBtn.addEventListener('click', () => {
      if (!galleries || galleries.length === 0) {
        showToast('No galleries available to export.', '⚠️');
        return;
      }

      const escapeCSV = (str) => {
        if (str === null || str === undefined) return '';
        const val = String(str);
        if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
          return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      };

      const formatDateCSV = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const sec = String(date.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
      };

      const statusMap = {
        'pending': 'Pending Selection',
        'arrived': 'Arrived',
        'selected': 'Selected on PC',
        'edited': 'Edited',
        'delivered': 'Delivered'
      };

      let csvContent = "\uFEFF"; // Byte Order Mark (BOM) to ensure Excel opens with UTF-8 encoding
      csvContent += "Client Name,Status,Notes,Created Date,Arrived Date,Selected Date,Edited Date,Delivered Date\n";

      galleries.forEach(g => {
        const row = [
          escapeCSV(g.clientName),
          escapeCSV(statusMap[g.status] || g.status),
          escapeCSV(g.notes),
          escapeCSV(formatDateCSV(g.timestamp)),
          escapeCSV(formatDateCSV(g.arrivedDate)),
          escapeCSV(formatDateCSV(g.selectionDate)),
          escapeCSV(formatDateCSV(g.editedDate)),
          escapeCSV(formatDateCSV(g.deliveredDate))
        ];
        csvContent += row.join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `rhythm_clicks_galleries_${dateStr}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Galleries exported successfully!', '📊');
    });
  }

  // Helper to parse total price from package
  const parsePackagePrice = (packageText) => {
    if (!packageText) return 0;
    const match = packageText.replace(/,/g, '').match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // --- Add Booking Modal Display Handlers ---
  if (addBookingBtn) {
    addBookingBtn.addEventListener('click', () => {
      addBookingForm.reset();
      if (bookingShootTypeCustomContainer) {
        bookingShootTypeCustomContainer.style.display = 'none';
        bookingShootTypeCustom.removeAttribute('required');
      }
      bookingStatusMsg.textContent = 'Add a shoot booking to the studio database.';
      bookingModal.style.display = 'flex';
      bookingModal.offsetHeight; // force reflow
      bookingModal.classList.remove('hidden');
    });
  }

  const closeBooking = () => {
    bookingModal.classList.add('hidden');
    setTimeout(() => {
      bookingModal.style.display = 'none';
    }, 400);
  };

  if (closeBookingBtn) {
    closeBookingBtn.addEventListener('click', closeBooking);
  }

  if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) {
        closeBooking();
      }
    });
  }

  // Listeners to show/hide custom shoot type fields
  if (bookingShootType && bookingShootTypeCustomContainer) {
    bookingShootType.addEventListener('change', () => {
      if (bookingShootType.value === 'Other') {
        bookingShootTypeCustomContainer.style.display = 'block';
        bookingShootTypeCustom.setAttribute('required', 'true');
      } else {
        bookingShootTypeCustomContainer.style.display = 'none';
        bookingShootTypeCustom.removeAttribute('required');
      }
    });
  }

  if (editBookingShootType && editBookingShootTypeCustomContainer) {
    editBookingShootType.addEventListener('change', () => {
      if (editBookingShootType.value === 'Other') {
        editBookingShootTypeCustomContainer.style.display = 'block';
        editBookingShootTypeCustom.setAttribute('required', 'true');
      } else {
        editBookingShootTypeCustomContainer.style.display = 'none';
        editBookingShootTypeCustom.removeAttribute('required');
      }
    });
  }

  if (addBookingForm) {
    addBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = bookingClientName.value;
      const phone = bookingPhone ? bookingPhone.value.trim() : '';
      let shootType = bookingShootType.value;
      if (shootType === 'Other' && bookingShootTypeCustom) {
        shootType = bookingShootTypeCustom.value.trim();
      }
      const date = bookingDate.value;
      const time = convertTimeTo24H(bookingTimeHour.value, bookingTimeMinute.value, bookingTimeAmpm.value);
      const pack = bookingPackage.value;
      const advance = parseFloat(bookingAdvance.value) || 0;
      const paymentAccount = bookingPaymentAccount ? bookingPaymentAccount.value : 'Cash';
      
      if (!name.trim() || !shootType || !date || !time || !pack) return;

      // Booking overlap check
      if (typeof checkBookingOverlap === 'function' && checkBookingOverlap('', date, time)) {
        // Warning notification already raised in checkBookingOverlap
        return;
      }

      await window.addBooking(name, shootType, date, time, pack, advance, paymentAccount, phone);
      closeBooking();
    });
  }

  // --- Edit Booking Modal Display Handlers ---
  const closeEditBooking = () => {
    editBookingModal.classList.add('hidden');
    setTimeout(() => {
      editBookingModal.style.display = 'none';
    }, 400);
  };

  if (closeEditBookingBtn) {
    closeEditBookingBtn.addEventListener('click', closeEditBooking);
  }

  if (editBookingModal) {
    editBookingModal.addEventListener('click', (e) => {
      if (e.target === editBookingModal) {
        closeEditBooking();
      }
    });
  }

  if (editBookingForm) {
    editBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editBookingId.value;
      const name = editBookingClientName.value;
      const phone = editBookingPhone ? editBookingPhone.value.trim() : '';
      let shootType = editBookingShootType.value;
      if (shootType === 'Other' && editBookingShootTypeCustom) {
        shootType = editBookingShootTypeCustom.value.trim();
      }
      const date = editBookingDate.value;
      const time = convertTimeTo24H(editBookingTimeHour.value, editBookingTimeMinute.value, editBookingTimeAmpm.value);
      const pack = editBookingPackage.value;
      const advance = parseFloat(editBookingAdvance.value) || 0;
      const paymentAccount = editBookingPaymentAccount ? editBookingPaymentAccount.value : 'Cash';

      if (!name.trim() || !shootType || !date || !time || !pack) return;

      // Booking overlap check
      if (typeof checkBookingOverlap === 'function' && checkBookingOverlap(id, date, time)) {
        return;
      }

      await window.updateBooking(id, name, shootType, date, time, pack, advance, paymentAccount, phone);
      closeEditBooking();
    });
  }

  window.editBooking = (id) => {
    const b = bookings.find(item => item.id === id);
    if (!b) return;

    editBookingId.value = b.id;
    editBookingClientName.value = b.clientName;
    
    // Find matching contact phone
    const clientContact = contacts.find(c => c.name && b.clientName && c.name.toLowerCase() === b.clientName.toLowerCase());
    if (editBookingPhone) {
      editBookingPhone.value = clientContact ? clientContact.phone : '';
    }
    
    const standardTypes = ['Maternity', 'Newborn', 'Kids'];
    if (standardTypes.includes(b.shootType)) {
      editBookingShootType.value = b.shootType;
      if (editBookingShootTypeCustomContainer) {
        editBookingShootTypeCustomContainer.style.display = 'none';
        editBookingShootTypeCustom.removeAttribute('required');
        editBookingShootTypeCustom.value = '';
      }
    } else {
      editBookingShootType.value = 'Other';
      if (editBookingShootTypeCustomContainer) {
        editBookingShootTypeCustomContainer.style.display = 'block';
        editBookingShootTypeCustom.setAttribute('required', 'true');
        editBookingShootTypeCustom.value = b.shootType;
      }
    }

    editBookingDate.value = b.date;
    if (b.time) {
      const [h, m] = b.time.split(':');
      const hrs = parseInt(h);
      editBookingTimeHour.value = String(hrs % 12 || 12).padStart(2, '0');
      editBookingTimeMinute.value = m;
      editBookingTimeAmpm.value = hrs >= 12 ? 'PM' : 'AM';
    }
    editBookingPackage.value = b.package;
    editBookingAdvance.value = b.advance;
    if (editBookingPaymentAccount) {
      editBookingPaymentAccount.value = b.paymentAccount || 'Cash';
    }

    if (editBookingStatusMsg) {
      editBookingStatusMsg.textContent = 'Modify shoot details, date, time, package, or advance amount.';
    }
    editBookingModal.style.display = 'flex';
    editBookingModal.offsetHeight; // force reflow
    editBookingModal.classList.remove('hidden');
  };

  // Time conversion utility
  const convertTimeTo24H = (hour, minute, ampm) => {
    let hrs = parseInt(hour);
    if (ampm === 'PM' && hrs < 12) hrs += 12;
    if (ampm === 'AM' && hrs === 12) hrs = 0;
    return `${String(hrs).padStart(2, '0')}:${minute}`;
  };

  // --- Shoots Rendering and Event Handlers ---
  window.renderShoots = () => {
    if (!shootsGrid || !pendingShootsGrid) return;

    // 1. Calculate Pending Shoots (bookings that have NOT been completed)
    const completedBookingIds = shoots.map(s => s.bookingId).filter(id => id);
    const pendingBookings = bookings.filter(b => !completedBookingIds.includes(b.id));

    const filteredPending = pendingBookings.filter(b => {
      return !searchFilter ||
        b.clientName.toLowerCase().includes(searchFilter) ||
        b.shootType.toLowerCase().includes(searchFilter) ||
        b.package.toLowerCase().includes(searchFilter);
    });

    const pendingCountSpan = document.getElementById('pending-shoots-count');
    if (pendingCountSpan) pendingCountSpan.textContent = filteredPending.length;

    if (filteredPending.length === 0) {
      pendingShootsGrid.innerHTML = `
        <li class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">☕</div>
          <p>No pending shoots scheduled.</p>
        </li>
      `;
    } else {
      const getLocalDateStr = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const dToday = new Date();
      const todayStr = getLocalDateStr(dToday);

      const dTomorrow = new Date();
      dTomorrow.setDate(dToday.getDate() + 1);
      const tomorrowStr = getLocalDateStr(dTomorrow);

      filteredPending.sort((a, b) => {
        const getPriority = (dateStr) => {
          if (dateStr === todayStr) return 0;
          if (dateStr === tomorrowStr) return 1;
          if (dateStr > tomorrowStr) return 2;
          return 3; // Overdue / Past
        };

        const priorityA = getPriority(a.date);
        const priorityB = getPriority(b.date);

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        const dateTimeA = new Date(`${a.date}T${a.time || '10:00'}`);
        const dateTimeB = new Date(`${b.date}T${b.time || '10:00'}`);
        return dateTimeA - dateTimeB;
      });

      pendingShootsGrid.innerHTML = filteredPending.map(b => {
        const dateObj = new Date(b.date);
        const formattedDate = dateObj.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const [hours, minutes] = (b.time || '10:00').split(':');
        const timeHrs = parseInt(hours);
        const ampm = timeHrs >= 12 ? 'PM' : 'AM';
        const formattedTime = `${timeHrs % 12 || 12}:${minutes} ${ampm}`;

        let badgeHtml = `<span class="booking-shoot-badge" style="background: rgba(245,124,0,0.1); color: #f57c00;">Pending Shoot</span>`;
        let cardBorderColor = '#f57c00';

        if (b.date === todayStr) {
          badgeHtml = `<span class="booking-shoot-badge" style="background: rgba(211,47,47,0.1); color: #d32f2f; font-weight: 700;">🔴 Today</span>`;
          cardBorderColor = '#d32f2f';
        } else if (b.date === tomorrowStr) {
          badgeHtml = `<span class="booking-shoot-badge" style="background: rgba(25,118,210,0.1); color: #1976D2; font-weight: 700;">🔵 Tomorrow</span>`;
          cardBorderColor = '#1976D2';
        } else if (b.date < todayStr) {
          badgeHtml = `<span class="booking-shoot-badge" style="background: rgba(97,97,97,0.1); color: #616161; font-weight: 700;">⏳ Overdue</span>`;
          cardBorderColor = '#616161';
        }

        return `
          <li class="booking-card" style="border-left: 4px solid ${cardBorderColor};" data-id="${b.id}">
            <div class="booking-card-header">
              <div class="booking-client-info">
                <h3 class="booking-client-name">${escapeHtml(b.clientName)}</h3>
                ${badgeHtml}
              </div>
            </div>
            <div class="booking-card-body" style="padding: 0.4rem 0; display: flex; flex-direction: column; gap: 3px;">
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>📅 ${formattedDate} • ${formattedTime}</span>
              </div>
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>📦 Package: ${escapeHtml(b.package)}</span>
              </div>
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>💰 Advance: ₹${b.advance} (${escapeHtml(b.paymentAccount || 'Cash')})</span>
              </div>
            </div>
            <div style="margin-top: 0.4rem;">
              <button class="btn btn-primary btn-log-pending-shoot" data-id="${b.id}" style="width: 100%; padding: 0.45rem; font-size: 0.72rem; border-radius: 6px;">
                Log Shoot & Payments
              </button>
            </div>
          </li>
        `;
      }).join('');

      pendingShootsGrid.querySelectorAll('.btn-log-pending-shoot').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-id');
          const booking = bookings.find(b => b.id === id);
          if (booking) {
            addShootForm.reset();
            shootBookingId.value = booking.id;
            shootClientName.value = booking.clientName;
            shootDate.value = booking.date;
            
            const [h, m] = (booking.time || '10:00').split(':');
            const hrs = parseInt(h);
            shootTimeHour.value = String(hrs % 12 || 12).padStart(2, '0');
            shootTimeMinute.value = m;
            shootTimeAmpm.value = hrs >= 12 ? 'PM' : 'AM';

            shootAdvanceAmount.value = booking.advance;
            shootAdvanceAccount.value = booking.paymentAccount || 'Cash';
            shootBalanceAmount.value = Math.max(0, parsePackagePrice(booking.package) - booking.advance);
            shootBalanceAccount.value = booking.paymentAccount || 'Cash';

            shootModal.style.display = 'flex';
            shootModal.offsetHeight;
            shootModal.classList.remove('hidden');
          }
        });
      });
    }

    // 2. Render Completed Shoots (sort newest first)
    const filteredCompleted = shoots.filter(s => {
      return !searchFilter ||
        s.clientName.toLowerCase().includes(searchFilter) ||
        s.date.includes(searchFilter);
    });

    const completedCountSpan = document.getElementById('completed-shoots-count');
    if (completedCountSpan) completedCountSpan.textContent = filteredCompleted.length;

    if (filteredCompleted.length === 0) {
      shootsGrid.innerHTML = `
        <li class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">📷</div>
          <p>No completed shoots logged yet.</p>
        </li>
      `;
    } else {
      filteredCompleted.sort((a, b) => {
        const dateTimeA = new Date(`${a.date}T${a.time || '10:00'}`);
        const dateTimeB = new Date(`${b.date}T${b.time || '10:00'}`);
        return dateTimeB - dateTimeA;
      });

      shootsGrid.innerHTML = filteredCompleted.map(s => {
        const dateObj = new Date(s.date);
        const formattedDate = dateObj.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const [hours, minutes] = (s.time || '10:00').split(':');
        const timeHrs = parseInt(hours);
        const ampm = timeHrs >= 12 ? 'PM' : 'AM';
        const formattedTime = `${timeHrs % 12 || 12}:${minutes} ${ampm}`;

        const totalPay = (s.advanceAmount || 0) + (s.balanceAmount || 0);

        return `
          <li class="booking-card" style="border-left: 4px solid #2e7d32;" data-id="${s.id}">
            <div class="booking-card-header">
              <div class="booking-client-info">
                <h3 class="booking-client-name">${escapeHtml(s.clientName)}</h3>
                <span class="booking-shoot-badge" style="background: rgba(46,125,50,0.1); color: #2e7d32;">Completed Shoot</span>
              </div>
              <div class="booking-actions">
                <button class="btn-edit-contact btn-edit-shoot" data-id="${s.id}" title="Edit shoot log">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button class="btn-delete-gallery btn-delete-shoot" data-id="${s.id}" title="Delete shoot log">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="booking-card-body" style="padding: 0.4rem 0; display: flex; flex-direction: column; gap: 3px;">
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>📅 ${formattedDate} • ${formattedTime}</span>
              </div>
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>📷 Photos: <strong>${s.photosCount} files</strong></span>
              </div>
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>💵 Advance: ₹${s.advanceAmount} (${s.advanceAccount})</span>
              </div>
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>💵 Balance: ₹${s.balanceAmount} (${s.balanceAccount})</span>
              </div>
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: var(--text-secondary);">
                <span>💰 Total: <strong>₹${totalPay}</strong></span>
              </div>
              ${s.albumIncluded ? `
              <div class="booking-detail-item" style="display: flex; align-items: center; gap: 4px; font-size: 0.74rem; color: #1565C0; font-weight: 600; margin-top: 2px;">
                <span>📖 Album Included</span>
              </div>` : ''}
              ${s.specialRequests ? `
              <div class="booking-detail-item" style="display: flex; align-items: flex-start; gap: 4px; font-size: 0.72rem; color: var(--text-light); margin-top: 3px;">
                <span>📝 ${escapeHtml(s.specialRequests)}</span>
              </div>` : ''}
            </div>
          </li>
        `;
      }).join('');

      shootsGrid.querySelectorAll('.btn-edit-shoot').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const button = e.target.closest('.btn-edit-shoot');
          const id = button.getAttribute('data-id');
          window.editShoot(id);
        });
      });

      shootsGrid.querySelectorAll('.btn-delete-shoot').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const button = e.target.closest('.btn-delete-shoot');
          const id = button.getAttribute('data-id');
          window.deleteShoot(id);
        });
      });
    }
  };

  window.editShoot = (id) => {
    const s = shoots.find(item => item.id === id);
    if (!s) return;

    editShootId.value = s.id;
    editShootClientName.value = s.clientName;
    editShootDate.value = s.date;
    
    const [h, m] = (s.time || '10:00').split(':');
    const hrs = parseInt(h);
    editShootTimeHour.value = String(hrs % 12 || 12).padStart(2, '0');
    editShootTimeMinute.value = m;
    editShootTimeAmpm.value = hrs >= 12 ? 'PM' : 'AM';

    editShootPhotosCount.value = s.photosCount;
    editShootAdvanceAmount.value = s.advanceAmount;
    editShootAdvanceAccount.value = s.advanceAccount;
    editShootBalanceAmount.value = s.balanceAmount;
    editShootBalanceAccount.value = s.balanceAccount;
    editShootSpecialRequests.value = s.specialRequests || '';
    editShootAlbumIncluded.checked = !!s.albumIncluded;

    editShootModal.style.display = 'flex';
    editShootModal.offsetHeight;
    editShootModal.classList.remove('hidden');
  };

  // --- Shoot Modals Event Handlers ---
  if (addShootBtn) {
    addShootBtn.addEventListener('click', () => {
      addShootForm.reset();
      shootBookingId.value = "";
      shootModal.style.display = 'flex';
      shootModal.offsetHeight;
      shootModal.classList.remove('hidden');
    });
  }

  const closeShoot = () => {
    shootModal.classList.add('hidden');
    setTimeout(() => {
      shootModal.style.display = 'none';
    }, 400);
  };

  if (closeShootBtn) {
    closeShootBtn.addEventListener('click', closeShoot);
  }

  if (shootModal) {
    shootModal.addEventListener('click', (e) => {
      if (e.target === shootModal) {
        closeShoot();
      }
    });
  }

  if (addShootForm) {
    addShootForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const bookingId = shootBookingId.value;
      const clientName = shootClientName.value;
      const date = shootDate.value;
      const time = convertTimeTo24H(shootTimeHour.value, shootTimeMinute.value, shootTimeAmpm.value);
      const photosCount = parseInt(shootPhotosCount.value) || 0;
      const advanceAmount = parseFloat(shootAdvanceAmount.value) || 0;
      const advanceAccount = shootAdvanceAccount.value;
      const balanceAmount = parseFloat(shootBalanceAmount.value) || 0;
      const balanceAccount = shootBalanceAccount.value;
      const specialRequests = shootSpecialRequests.value;
      const albumIncluded = shootAlbumIncluded.checked;

      if (!clientName.trim() || !date || !time) return;

      await window.addShoot(bookingId, clientName, date, time, photosCount, advanceAmount, advanceAccount, balanceAmount, balanceAccount, specialRequests, albumIncluded);
      closeShoot();
    });
  }

  // --- Edit Shoot Modal Handlers ---
  const closeEditShoot = () => {
    editShootModal.classList.add('hidden');
    setTimeout(() => {
      editShootModal.style.display = 'none';
    }, 400);
  };

  if (closeEditShootBtn) {
    closeEditShootBtn.addEventListener('click', closeEditShoot);
  }

  if (editShootModal) {
    editShootModal.addEventListener('click', (e) => {
      if (e.target === editShootModal) {
        closeEditShoot();
      }
    });
  }

  if (editShootForm) {
    editShootForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = editShootId.value;
      const clientName = editShootClientName.value;
      const date = editShootDate.value;
      const time = convertTimeTo24H(editShootTimeHour.value, editShootTimeMinute.value, editShootTimeAmpm.value);
      const photosCount = parseInt(editShootPhotosCount.value) || 0;
      const advanceAmount = parseFloat(editShootAdvanceAmount.value) || 0;
      const advanceAccount = editShootAdvanceAccount.value;
      const balanceAmount = parseFloat(editShootBalanceAmount.value) || 0;
      const balanceAccount = editShootBalanceAccount.value;
      const specialRequests = editShootSpecialRequests.value;
      const albumIncluded = editShootAlbumIncluded.checked;

      if (!clientName.trim() || !date || !time) return;

      await window.updateShoot(id, clientName, date, time, photosCount, advanceAmount, advanceAccount, balanceAmount, balanceAccount, specialRequests, albumIncluded);
      closeEditShoot();
    });
  }

  // Initialize Custom Autocompletes for Client Name fields
  const galleryClientNameAutocomplete = document.getElementById('gallery-client-name-autocomplete');
  const editGalleryClientNameAutocomplete = document.getElementById('edit-gallery-client-name-autocomplete');
  const bookingClientNameAutocomplete = document.getElementById('booking-client-name-autocomplete');
  const editBookingClientNameAutocomplete = document.getElementById('edit-booking-client-name-autocomplete');
  setupAutocomplete(galleryClientName, galleryClientNameAutocomplete);
  setupAutocomplete(editGalleryClientName, editGalleryClientNameAutocomplete);
  setupAutocomplete(bookingClientName, bookingClientNameAutocomplete);
  setupAutocomplete(editBookingClientName, editBookingClientNameAutocomplete);

  // Initialize Shoot Client Name autocomplete
  const shootClientNameAutocomplete = document.getElementById('shoot-client-name-autocomplete');
  const editShootClientNameAutocomplete = document.getElementById('edit-shoot-client-name-autocomplete');
  setupAutocomplete(shootClientName, shootClientNameAutocomplete);
  setupAutocomplete(editShootClientName, editShootClientNameAutocomplete);

  // Initialize Album Client Name autocomplete
  const albumClientNameAutocomplete = document.getElementById('album-client-name-autocomplete');
  const editAlbumClientNameAutocomplete = document.getElementById('edit-album-client-name-autocomplete');
  setupAutocomplete(albumClientName, albumClientNameAutocomplete);
  setupAutocomplete(editAlbumClientName, editAlbumClientNameAutocomplete);

});
