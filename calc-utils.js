// calc-utils.js — shared helper functions used across Zaculators calculator pages
// (toast messages, input validation, number/currency/percent formatting, save/share/print/load)

function showToast(message, duration) {
  duration = duration || 2500;
  var toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, duration);
}

function showValidationError(inputEl, message) {
  if (!inputEl) return;
  var errorEl = inputEl.parentElement ? inputEl.parentElement.querySelector('.error-message') : null;
  if (message) {
    inputEl.classList.add('input-error');
    if (errorEl) errorEl.textContent = message;
  } else {
    inputEl.classList.remove('input-error');
    if (errorEl) errorEl.textContent = '';
  }
}

function isInRange(value, min, max) {
  return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
}

function formatNumber(value, decimals) {
  if (typeof decimals !== 'number') decimals = 2;
  var num = Number(value);
  if (!isFinite(num)) return '0';
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatCurrency(value) {
  var num = Number(value);
  if (!isFinite(num)) return '$0.00';
  var sign = num < 0 ? '-' : '';
  return sign + '$' + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value, decimals) {
  if (typeof decimals !== 'number') decimals = 1;
  var num = Number(value);
  if (!isFinite(num)) return '0%';
  return num.toFixed(decimals) + '%';
}

function calcLoanPayment(principal, monthlyRate, termMonths) {
  principal = Number(principal); monthlyRate = Number(monthlyRate); termMonths = Number(termMonths);
  if (!isFinite(principal) || !isFinite(termMonths) || termMonths <= 0) return 0;
  if (!monthlyRate) return principal / termMonths;
  var pow = Math.pow(1 + monthlyRate, termMonths);
  return principal * (monthlyRate * pow) / (pow - 1);
}

function saveResults(id, data) {
  try {
    id = id || (typeof CALCULATOR_ID !== 'undefined' ? CALCULATOR_ID : null);
    data = data || (typeof latestData !== 'undefined' ? latestData : null);
    if (!id || !data) { showToast('Run the calculator first'); return; }
    localStorage.setItem('zaculators_' + id, JSON.stringify({ data: data, savedAt: Date.now() }));
    showToast('✓ Results saved');
  } catch (e) {
    showToast('Could not save results on this device');
  }
}

function loadResults(id) {
  try {
    id = id || (typeof CALCULATOR_ID !== 'undefined' ? CALCULATOR_ID : null);
    if (!id) return null;
    var raw = localStorage.getItem('zaculators_' + id);
    if (!raw) return null;
    var parsed = JSON.parse(raw);
    return parsed && parsed.data ? parsed.data : null;
  } catch (e) {
    return null;
  }
}

function shareResults(title, data) {
  try {
    title = title || (typeof CALCULATOR_TITLE !== 'undefined' ? CALCULATOR_TITLE : document.title);
    data = data || (typeof latestData !== 'undefined' ? latestData : null);
    var text = title;
    if (data && typeof data === 'object') {
      text += '\n' + Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n');
    }
    text += '\n' + window.location.href;
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: window.location.href }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(function () { showToast('📤 Copied to clipboard'); });
    } else {
      showToast('Sharing is not supported on this browser');
    }
  } catch (e) {
    showToast('Could not share results');
  }
}

function printResults() {
  try { window.print(); } catch (e) {}
}
