/**
 * RHYTHM CLICKS STUDIO - Photo Selection Portal JavaScript
 * Website: www.rhythmclicksstudio.com
 * Contact: +91 97127 01002
 * Gandhinagar & Ahmedabad, Gujarat
 *
 * Features:
 * - Trilingual i18n (EN, HI, GU)
 * - Filename extraction and validation (e.g. _CS_0548.jpg)
 * - Sequential number tracking (1. _CS_0548.jpg, 2. _CS_0550.jpg, ...)
 * - Automatic Alphanumeric Natural Sorting
 * - 1-Click WhatsApp template generator with sequential list
 * - 1-Click Copy Formatted List to clipboard
 * - Milestone deadline calculator
 */

// Application State
const state = {
  currentLang: localStorage.getItem('rhythm_lang') || 'en',
  clientName: '',
  selectedPhotos: [], // Array of string filenames
  studioWhatsAppNumber: '919712701002' // Official Rhythm Clicks Studio contact number
};

// DOM Elements
const elements = {
  langBtns: document.querySelectorAll('.lang-btn'),
  clientNameInput: document.getElementById('clientNameInput'),
  photoInput: document.getElementById('photoInput'),
  btnAddPhoto: document.getElementById('btnAddPhoto'),
  btnOpenPasteModal: document.getElementById('btnOpenPasteModal'),
  btnSortPhotos: document.getElementById('btnSortPhotos'),
  btnClearAll: document.getElementById('btnClearAll'),
  photoTagsGrid: document.getElementById('photoTagsGrid'),
  photoCountBadge: document.getElementById('photoCountBadge'),
  btnSendWhatsApp: document.getElementById('btnSendWhatsApp'),
  btnCopyTemplate: document.getElementById('btnCopyTemplate'),
  templateCodePreview: document.getElementById('templateCodePreview'),
  calcGalleryDate: document.getElementById('calcGalleryDate'),
  resSelectionDate: document.getElementById('resSelectionDate'),
  resEditingDate: document.getElementById('resEditingDate'),
  resExpiryDate: document.getElementById('resExpiryDate'),
  pasteModal: document.getElementById('pasteModal'),
  bulkPasteTextarea: document.getElementById('bulkPasteTextarea'),
  btnCancelPaste: document.getElementById('btnCancelPaste'),
  btnConfirmPaste: document.getElementById('btnConfirmPaste'),
  toastContainer: document.getElementById('toastContainer'),
  faqItems: document.querySelectorAll('.faq-item')
};

// ============================================================================
// Internationalization (i18n) Engine
// ============================================================================
function setLanguage(lang) {
  if (!translations[lang]) return;
  state.currentLang = lang;
  localStorage.setItem('rhythm_lang', lang);

  // Update active button state
  elements.langBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });

  // Update all text nodes with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Update placeholder attributes
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[lang][key]) {
      el.placeholder = translations[lang][key];
    }
  });

  // Update dynamic count badge & template preview
  updatePhotoCountDisplay();
  updateTemplatePreview();
}

// ============================================================================
// Toast Notification Helper
// ============================================================================
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ============================================================================
// Photo Tag & Selection Logic (Sequential)
// ============================================================================
function cleanFilename(raw) {
  // Strip leading list bullets, numbers, hyphens, and whitespace
  let cleaned = raw.trim().replace(/^(\d+[\.\)\-:]\s*|[-*•\s]+)/, '').trim();
  return cleaned;
}

function addPhotoNumber(rawNumber) {
  const cleaned = cleanFilename(rawNumber);
  if (!cleaned) return false;

  // Case-insensitive duplicate check
  const exists = state.selectedPhotos.some(
    p => p.toLowerCase() === cleaned.toLowerCase()
  );

  if (exists) {
    showToast(translations[state.currentLang].toast_duplicate);
    return false;
  }

  state.selectedPhotos.push(cleaned);
  renderPhotoTags();
  updateTemplatePreview();
  return true;
}

function removePhotoNumber(index) {
  state.selectedPhotos.splice(index, 1);
  renderPhotoTags();
  updateTemplatePreview();
}

function clearAllPhotos() {
  if (state.selectedPhotos.length === 0) return;
  state.selectedPhotos = [];
  renderPhotoTags();
  updateTemplatePreview();
  showToast(translations[state.currentLang].toast_cleared);
}

function sortPhotosInSequence() {
  if (state.selectedPhotos.length < 2) return;
  
  // Natural alphanumeric sort (handles _CS_0548.jpg, _CS_0550.jpg correctly)
  state.selectedPhotos.sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });

  renderPhotoTags();
  updateTemplatePreview();
  showToast(translations[state.currentLang].toast_sorted);
}

function updatePhotoCountDisplay() {
  const count = state.selectedPhotos.length;
  const unit = count === 1 ? 'Photo' : 'Photos';
  elements.photoCountBadge.textContent = `${count} ${unit}`;
}

function renderPhotoTags() {
  elements.photoTagsGrid.innerHTML = '';
  updatePhotoCountDisplay();

  if (state.selectedPhotos.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = translations[state.currentLang].builder_empty_state;
    elements.photoTagsGrid.appendChild(empty);
    return;
  }

  state.selectedPhotos.forEach((photo, idx) => {
    const tag = document.createElement('div');
    tag.className = 'photo-tag';
    tag.innerHTML = `
      <span class="tag-seq-num">${idx + 1}.</span>
      <span class="tag-filename">${photo}</span>
      <button type="button" class="remove-btn" title="Remove" aria-label="Remove ${photo}">✕</button>
    `;

    tag.querySelector('.remove-btn').addEventListener('click', () => {
      removePhotoNumber(idx);
    });

    elements.photoTagsGrid.appendChild(tag);
  });
}

// ============================================================================
// Sequential Template Formatter (Client Name & Numbers Only)
// ============================================================================
function generateFormattedTemplate() {
  const clientName = state.clientName.trim() || '[Client Name]';
  
  // Format with clean sequential numbering (1. _CS_0548.jpg, 2. _CS_0550.jpg, ...)
  const photoList = state.selectedPhotos.length > 0
    ? state.selectedPhotos.map((num, i) => `${i + 1}. ${num}`).join('\n')
    : '1. _CS_0548.jpg\n2. _CS_0550.jpg\n3. ... [Add your filenames above]';

  return `📸 Photo Selection & Delivery Details
Studio: Rhythm Clicks Studio
Client Name: ${clientName}
Selected Photo Numbers:
${photoList}`;
}

function updateTemplatePreview() {
  elements.templateCodePreview.textContent = generateFormattedTemplate();
}

function copyTemplateToClipboard() {
  const text = generateFormattedTemplate();
  navigator.clipboard.writeText(text).then(() => {
    showToast(translations[state.currentLang].toast_copied);
  }).catch(() => {
    // Fallback
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    document.execCommand('copy');
    document.body.removeChild(tempTextarea);
    showToast(translations[state.currentLang].toast_copied);
  });
}

function sendViaWhatsApp() {
  if (state.selectedPhotos.length === 0 && !state.clientName.trim()) {
    showToast(translations[state.currentLang].toast_empty_submit);
    elements.clientNameInput.focus();
    return;
  }

  const message = generateFormattedTemplate();
  const encoded = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${state.studioWhatsAppNumber}?text=${encoded}`;
  window.open(whatsappUrl, '_blank');
}

// ============================================================================
// Milestone Date Calculator
// ============================================================================
function formatDate(dateObj) {
  const day = String(dateObj.getDate()).padStart(2, '0');
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const month = monthNames[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month} ${year}`;
}

function updateMilestoneDates() {
  const dateVal = elements.calcGalleryDate.value;
  if (!dateVal) return;

  const baseDate = new Date(dateVal);
  if (isNaN(baseDate.getTime())) return;

  // 1. Selection Deadline: +30 Days
  const selectionDeadline = new Date(baseDate);
  selectionDeadline.setDate(baseDate.getDate() + 30);

  // 2. Editing Finished: Selection Deadline + 20 Days
  const editingFinished = new Date(selectionDeadline);
  editingFinished.setDate(selectionDeadline.getDate() + 20);

  // 3. Final Gallery Expiry: Editing + 30 Days
  const finalExpiry = new Date(editingFinished);
  finalExpiry.setDate(editingFinished.getDate() + 30);

  elements.resSelectionDate.textContent = formatDate(selectionDeadline);
  elements.resEditingDate.textContent = formatDate(editingFinished);
  elements.resExpiryDate.textContent = formatDate(finalExpiry);
}

// ============================================================================
// Event Listeners Setup
// ============================================================================
function initEventListeners() {
  // Language Switcher Buttons
  elements.langBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.getAttribute('data-lang'));
    });
  });

  // Client Name Input
  elements.clientNameInput.addEventListener('input', e => {
    state.clientName = e.target.value;
    updateTemplatePreview();
  });

  // Photo Input (Add on Enter or Comma)
  elements.photoInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = elements.photoInput.value.replace(',', '');
      if (addPhotoNumber(val)) {
        elements.photoInput.value = '';
      }
    }
  });

  // Add Photo Button
  elements.btnAddPhoto.addEventListener('click', () => {
    if (addPhotoNumber(elements.photoInput.value)) {
      elements.photoInput.value = '';
      elements.photoInput.focus();
    }
  });

  // Sort in Sequence Button
  if (elements.btnSortPhotos) {
    elements.btnSortPhotos.addEventListener('click', sortPhotosInSequence);
  }

  // Clear All Button
  elements.btnClearAll.addEventListener('click', clearAllPhotos);

  // Paste Modal Handlers
  elements.btnOpenPasteModal.addEventListener('click', () => {
    elements.pasteModal.classList.add('active');
    elements.bulkPasteTextarea.focus();
  });

  elements.btnCancelPaste.addEventListener('click', () => {
    elements.pasteModal.classList.remove('active');
    elements.bulkPasteTextarea.value = '';
  });

  elements.btnConfirmPaste.addEventListener('click', () => {
    const raw = elements.bulkPasteTextarea.value;
    if (raw.trim()) {
      // Split by commas, new lines, semicolons, or tabs
      const items = raw.split(/[\n,;\t]+/);
      let addedCount = 0;
      items.forEach(item => {
        if (addPhotoNumber(item)) {
          addedCount++;
        }
      });
      if (addedCount > 0) {
        showToast(`Added ${addedCount} filename(s) in sequence!`);
      }
    }
    elements.pasteModal.classList.remove('active');
    elements.bulkPasteTextarea.value = '';
  });

  // Modal Backdrop Click to close
  elements.pasteModal.addEventListener('click', e => {
    if (e.target === elements.pasteModal) {
      elements.pasteModal.classList.remove('active');
    }
  });

  // Export Buttons (Only WhatsApp and Copy Template)
  elements.btnSendWhatsApp.addEventListener('click', sendViaWhatsApp);
  elements.btnCopyTemplate.addEventListener('click', copyTemplateToClipboard);

  // Calculator Date Change
  elements.calcGalleryDate.addEventListener('change', updateMilestoneDates);

  // FAQ Accordion Toggles
  elements.faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other FAQ items
      elements.faqItems.forEach(other => {
        other.classList.remove('active');
        const otherAnswer = other.querySelector('.faq-answer');
        if (otherAnswer) otherAnswer.style.maxHeight = null;
      });

      if (!isActive) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      } else {
        item.classList.remove('active');
        answer.style.maxHeight = null;
      }
    });
  });
}

// ============================================================================
// Initialization on Page Load
// ============================================================================
// Ensure page always starts at the top on fresh load
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Clean any leftover URL hash if reloading
if (window.location.hash) {
  history.replaceState(null, null, window.location.pathname);
}
window.scrollTo(0, 0);

document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);

  // Set default calculator date to today
  const today = new Date().toISOString().split('T')[0];
  elements.calcGalleryDate.value = today;
  updateMilestoneDates();

  // Initialize Language & Events
  setLanguage(state.currentLang);
  initEventListeners();
  renderPhotoTags();
  updateTemplatePreview();

  // Force scroll to top after layout renders
  setTimeout(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, 20);
});
