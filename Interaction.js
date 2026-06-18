(function () {

  /* ── State ── */
  let val  = '0';
  let expr = '';
  let prev = null;
  let op   = null;
  let wait = false;
  let done = false;
  let history = [];
  let calcHistory = [];
  let scientificMode = false;
  let currentTheme = 'dark';

  // Mock currency rates (USD base)
  const currencyRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 150.5,
    PHP: 55.8
  };

  /* ── DOM References ── */
  const numEl  = document.getElementById('num');
  const exprEl = document.getElementById('expr');
  const sciPanel = document.getElementById('sciPanel');
  const historyPanel = document.getElementById('historyPanel');
  const currencyPanel = document.getElementById('currencyPanel');
  const historyList = document.getElementById('historyList');

  /* ────────────────────────────────────────
     DISPLAY
  ──────────────────────────────────────── */

  function render() {
    const s   = formatVal(val);
    const len = s.length;

    numEl.style.fontSize =
      len > 13 ? '26px' :
      len > 10 ? '34px' :
      len >  7 ? '42px' : '52px';

    numEl.textContent  = s;
    
    // Animate expression update
    exprEl.classList.remove('update');
    void exprEl.offsetWidth;
    exprEl.textContent = expr;
    if (expr) exprEl.classList.add('update');
  }

  function formatVal(v) {
    return v === 'ERR' ? 'Error' : v;
  }

  function flashDisplay() {
    numEl.classList.remove('flash');
    void numEl.offsetWidth;
    numEl.classList.add('flash');
    setTimeout(() => numEl.classList.remove('flash'), 200);
  }

  function highlightOperator(activeOp) {
    document.querySelectorAll('.key-op').forEach(btn => {
      btn.classList.toggle('lit', btn.dataset.o === activeOp && wait);
    });
  }

  /* ────────────────────────────────────────
     INPUT HANDLERS
  ──────────────────────────────────────── */

  function inputDigit(d) {
    if (done) {
      val  = (d === '.') ? '0' : d;
      expr = '';
      history = [d];
      done = false;
      wait = false;
    } else if (wait) {
      val  = d;
      wait = false;
    } else {
      val = (val === '0') ? d : val + d;
    }
    
    // Update expr to show current calculation
    if (prev !== null && op) {
      expr = prev + ' ' + op + ' ' + val;
    }
    
    render();
  }

  function inputDot() {
    if (wait) {
      val  = '0.';
      wait = false;
      render();
      return;
    }
    if (!val.includes('.')) {
      val += '.';
      render();
    }
  }

  function handleOperator(o) {
    const cur = parseFloat(val);

    if (prev !== null && !wait) {
      const res = calculate(prev, cur, op);
      const s   = formatResult(res);
      val  = s;
      expr = s + ' ' + o;
      prev = (typeof res === 'number') ? res : null;
    } else {
      expr = val + ' ' + o;
      prev = cur;
    }

    // Add to history
    history.push(val);
    history.push(o);

    op   = o;
    wait = true;
    done = false;
    highlightOperator(o);
    render();
  }

  function handleEquals() {
    if (prev === null) return;

    const cur = parseFloat(val);
    const res = calculate(prev, cur, op);

    flashDisplay();
    val  = formatResult(res);
    
    // Add current number to history
    history.push(cur);
    history.push('=');
    history.push(val);
    
    // Build complete expression
    const completeExpr = history.join(' ').substring(0, 80);
    expr = completeExpr;
    
    // Add to calculation history
    addToHistory(completeExpr, val);
    
    prev = null;
    op   = null;
    wait = false;
    done = true;
    highlightOperator(null);
    render();
  }

  function handleClear() {
    val  = '0';
    expr = '';
    prev = null;
    op   = null;
    wait = false;
    done = false;
    history = [];
    highlightOperator(null);
    render();
  }

  function handleDelete() {
    if (done) { handleClear(); return; }
    val = (val.length > 1) ? val.slice(0, -1) : '0';
    render();
  }

  function handleSign() {
    const n = parseFloat(val);
    if (!isNaN(n) && n !== 0) {
      val = String(-n);
      render();
    }
  }

  /* ────────────────────────────────────────
     SCIENTIFIC FUNCTIONS
  ──────────────────────────────────────── */

  function applySciFunction(func) {
    const n = parseFloat(val);
    if (isNaN(n)) return;

    let result;
    const rad = n * (Math.PI / 180); // Convert to radians

    switch(func) {
      case 'sin':
        result = Math.sin(rad);
        break;
      case 'cos':
        result = Math.cos(rad);
        break;
      case 'tan':
        result = Math.tan(rad);
        break;
      case 'log':
        result = Math.log10(n);
        break;
      case 'sqrt':
        result = Math.sqrt(n);
        break;
      case 'pow2':
        result = n * n;
        break;
      default:
        return;
    }

    val = formatResult(result);
    expr = func + '(' + n + ')';
    done = true;
    flashDisplay();
    render();
  }

  /* ────────────────────────────────────────
     MATH
  ──────────────────────────────────────── */

  function calculate(a, b, o) {
    switch (o) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return (b === 0) ? 'ERR' : a / b;
      default:  return b;
    }
  }

  function formatResult(n) {
    if (typeof n !== 'number') return n;
    const fixed = parseFloat(n.toFixed(10));
    if (Math.abs(fixed) > 1e13) return fixed.toExponential(4);
    return String(fixed);
  }

  /* ────────────────────────────────────────
     HISTORY MANAGEMENT
  ──────────────────────────────────────── */

  function addToHistory(expression, result) {
    calcHistory.unshift({ expr: expression, result: result, time: new Date().toLocaleTimeString() });
    if (calcHistory.length > 50) calcHistory.pop();
    updateHistoryDisplay();
  }

  function updateHistoryDisplay() {
    historyList.innerHTML = '';
    calcHistory.forEach((item, index) => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `<strong>${item.expr}</strong><br><small>${item.time}</small>`;
      historyItem.onclick = () => {
        val = String(item.result);
        expr = item.expr;
        done = true;
        render();
      };
      historyList.appendChild(historyItem);
    });
  }

  /* ────────────────────────────────────────
     THEME MANAGEMENT
  ──────────────────────────────────────── */

  function cycleTheme() {
    const themes = ['dark', 'light', 'neon'];
    const currentIndex = themes.indexOf(currentTheme);
    currentTheme = themes[(currentIndex + 1) % themes.length];
    
    document.body.classList.remove('light-theme', 'neon-theme');
    if (currentTheme === 'light') {
      document.body.classList.add('light-theme');
    } else if (currentTheme === 'neon') {
      document.body.classList.add('neon-theme');
    }

    const themeEmojis = { dark: '🌙', light: '☀️', neon: '⚡' };
    document.getElementById('themeBtn').textContent = themeEmojis[currentTheme];
    
    localStorage.setItem('calcTheme', currentTheme);
  }

  function loadTheme() {
    const savedTheme = localStorage.getItem('calcTheme') || 'dark';
    currentTheme = savedTheme;
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
    } else if (savedTheme === 'neon') {
      document.body.classList.add('neon-theme');
    }
  }

  /* ────────────────────────────────────────
     CURRENCY CONVERTER
  ──────────────────────────────────────── */

  function convertCurrency() {
    const amount = parseFloat(document.getElementById('currencyAmount').value) || 1;
    const from = document.getElementById('fromCurrency').value;
    const to = document.getElementById('toCurrencyCode').value;
    
    const amountInUSD = amount / currencyRates[from];
    const result = amountInUSD * currencyRates[to];
    
    document.getElementById('toCurrency').value = result.toFixed(2);
  }

  /* ────────────────────────────────────────
     RIPPLE EFFECT
  ──────────────────────────────────────── */

  function spawnRipple(btn, e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple-el';
    const rect = btn.getBoundingClientRect();
    ripple.style.left = (e.clientX - rect.left) + 'px';
    ripple.style.top  = (e.clientY - rect.top)  + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 450);
  }

  /* ────────────────────────────────────────
     CLICK / TAP EVENTS
  ──────────────────────────────────────── */

  document.getElementById('keypad').addEventListener('click', function (e) {
    const btn = e.target.closest('.key');
    if (!btn) return;

    spawnRipple(btn, e);
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 130);

    if      (btn.dataset.d !== undefined)   inputDigit(btn.dataset.d);
    else if (btn.dataset.o)                 handleOperator(btn.dataset.o);
    else if (btn.dataset.a === 'clear')     handleClear();
    else if (btn.dataset.a === 'delete')    handleDelete();
    else if (btn.dataset.a === 'sign')      handleSign();
    else if (btn.dataset.a === 'dot')       inputDot();
    else if (btn.dataset.a === 'eq')        handleEquals();
  });

  // Scientific functions
  document.getElementById('sciPanel').addEventListener('click', function (e) {
    const btn = e.target.closest('.key-sci');
    if (!btn || !btn.dataset.f) return;
    
    spawnRipple(btn, e);
    btn.classList.add('pressed');
    setTimeout(() => btn.classList.remove('pressed'), 130);
    
    applySciFunction(btn.dataset.f);
  });

  // Panel toggles with exclusive opening
  function closeAllPanels() {
    sciPanel.style.display = 'none';
    historyPanel.style.display = 'none';
    currencyPanel.style.display = 'none';
    document.getElementById('sciBtn').style.opacity = '0.5';
    document.getElementById('historyBtn').style.opacity = '0.5';
    document.getElementById('currencyBtn').style.opacity = '0.5';
  }

  document.getElementById('sciBtn').addEventListener('click', function () {
    const isVisible = sciPanel.style.display !== 'none';
    if (isVisible) {
      closeAllPanels();
    } else {
      closeAllPanels();
      sciPanel.style.display = 'grid';
      this.style.opacity = '1';
    }
  });

  document.getElementById('historyBtn').addEventListener('click', function () {
    const isVisible = historyPanel.style.display !== 'none';
    if (isVisible) {
      closeAllPanels();
    } else {
      closeAllPanels();
      historyPanel.style.display = 'block';
      this.style.opacity = '1';
    }
  });

  document.getElementById('currencyBtn').addEventListener('click', function () {
    const isVisible = currencyPanel.style.display !== 'none';
    if (isVisible) {
      closeAllPanels();
    } else {
      closeAllPanels();
      currencyPanel.style.display = 'block';
      this.style.opacity = '1';
    }
  });

  document.getElementById('themeBtn').addEventListener('click', cycleTheme);

  document.getElementById('closeHistory').addEventListener('click', function () {
    historyPanel.style.display = 'none';
    document.getElementById('historyBtn').style.opacity = '0.5';
  });

  document.getElementById('closeCurrency').addEventListener('click', function () {
    currencyPanel.style.display = 'none';
    document.getElementById('currencyBtn').style.opacity = '0.5';
  });

  document.getElementById('clearHistory').addEventListener('click', function () {
    calcHistory = [];
    updateHistoryDisplay();
  });

  // Currency converter listeners
  document.getElementById('currencyAmount').addEventListener('input', convertCurrency);
  document.getElementById('fromCurrency').addEventListener('change', convertCurrency);
  document.getElementById('toCurrencyCode').addEventListener('change', convertCurrency);

  document.querySelector('.currency-swap').addEventListener('click', function () {
    const from = document.getElementById('fromCurrency').value;
    const to = document.getElementById('toCurrencyCode').value;
    document.getElementById('fromCurrency').value = to;
    document.getElementById('toCurrencyCode').value = from;
    convertCurrency();
  });

  /* ────────────────────────────────────────
     KEYBOARD EVENTS
  ──────────────────────────────────────── */

  document.addEventListener('keydown', function (e) {
    if      (e.key >= '0' && e.key <= '9')          inputDigit(e.key);
    else if (e.key === '.')                          inputDot();
    else if (e.key === '+')                          handleOperator('+');
    else if (e.key === '-')                          handleOperator('−');
    else if (e.key === '*')                          handleOperator('×');
    else if (e.key === '/') { e.preventDefault();   handleOperator('÷'); }
    else if (e.key === 'Enter' || e.key === '=')     handleEquals();
    else if (e.key === 'Escape')                     handleClear();
    else if (e.key === 'Backspace' || e.key === 'Delete') handleDelete();
  });

  /* ── Init ── */
  loadTheme();
  render();

})();