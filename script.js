const WEBHOOK = 'https://ntemposd.app.n8n.cloud/webhook/api-validator';

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = msg;
  banner.classList.add('visible');
}

function hideError() {
  document.getElementById('errorBanner').classList.remove('visible');
}

function formatAI(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/### (.*?)(\n|$)/g, '<strong>$1</strong>\n')
    .replace(/^- /gm, 'â†’ ');
}

async function validate() {
  hideError();
  const schemaRaw = document.getElementById('schema').value.trim();
  const responseRaw = document.getElementById('response').value.trim();
  const btn = document.getElementById('submitBtn');
  const result = document.getElementById('result');

  if (!schemaRaw || !responseRaw) {
    showError('Both fields are required.');
    return;
  }

  let schema, response;
  try { schema = JSON.parse(schemaRaw); } catch(e) { showError('Invalid JSON in Expected Schema: ' + e.message); return; }
  try { response = JSON.parse(responseRaw); } catch(e) { showError('Invalid JSON in Actual API Response: ' + e.message); return; }

  btn.disabled = true;
  btn.classList.add('loading');
  result.classList.remove('visible', 'valid', 'invalid');

  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'Expected Schema (JSON)': schemaRaw,
        'Actual API Response (JSON)': responseRaw
      })
    });

    const data = await res.json();
    const isValid = data.valid;
    const errors = data.errors || [];
    const aiText = data.ai_explanation || '';

    result.classList.add('visible', isValid ? 'valid' : 'invalid');
    document.getElementById('resultTitle').textContent = isValid
      ? 'âœ“ Contract Valid â€” Response matches schema'
      : `âœ— Contract Invalid â€” ${errors.length} error${errors.length > 1 ? 's' : ''} detected`;

    let bodyHTML = '';

    if (!isValid && errors.length > 0) {
      bodyHTML += `<div class="errors-list">
        <div class="errors-title">Validation Errors</div>
        ${errors.map(e => `<div class="error-item">${e}</div>`).join('')}
      </div>`;
    }

    if (aiText) {
      bodyHTML += `<div class="ai-section">
        <div class="ai-label">AI Diagnosis</div>
        <div class="ai-text">${formatAI(aiText)}</div>
      </div>`;
    }

    if (!bodyHTML) {
      bodyHTML = `<div class="ai-text" style="color:var(--accent)">All fields match the expected schema. No issues found.</div>`;
    }

    document.getElementById('resultBody').innerHTML = bodyHTML;

  } catch(e) {
    showError('Request failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}
