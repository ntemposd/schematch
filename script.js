const WEBHOOK = 'https://ntemposd.app.n8n.cloud/webhook/api-validator';

const FIELD_LABELS = {
  schema: 'Expected Schema',
  response: 'Actual API Response'
};

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = msg;
  banner.classList.add('visible');
}

function hideError() {
  document.getElementById('errorBanner').classList.remove('visible');
}

function formatJSON(value) {
  return JSON.stringify(JSON.parse(value), null, 2);
}

function updateSubmitState() {
  const schemaField = document.getElementById('schema');
  const responseField = document.getElementById('response');
  const button = document.getElementById('submitBtn');
  const hasInvalidField = [schemaField, responseField].some(
    (textarea) => textarea.dataset.jsonValid === 'false'
  );

  if (!button.classList.contains('loading')) {
    button.disabled = hasInvalidField;
  }
}

function setFieldValidity(textarea, isValid) {
  textarea.dataset.jsonValid = String(isValid);
  textarea.setAttribute('aria-invalid', String(!isValid));
  updateSubmitState();
}

function validateJSONField(textarea, options = {}) {
  const { formatIfValid = false, showErrorMessage = false } = options;
  const raw = textarea.value.trim();

  if (!raw) {
    setFieldValidity(textarea, true);
    return true;
  }

  try {
    const formatted = formatJSON(raw);

    if (formatIfValid) {
      textarea.value = formatted;
    }

    setFieldValidity(textarea, true);
    hideError();
    return true;
  } catch (error) {
    setFieldValidity(textarea, false);

    if (showErrorMessage) {
      showError(`Invalid JSON in ${FIELD_LABELS[textarea.id]}: ${error.message}`);
    }

    return false;
  }
}

function attachJSONHandlers(textarea) {
  textarea.addEventListener('paste', () => {
    queueMicrotask(() => {
      validateJSONField(textarea, { formatIfValid: true, showErrorMessage: true });
    });
  });

  textarea.addEventListener('blur', () => {
    validateJSONField(textarea, { formatIfValid: true, showErrorMessage: true });
  });

  textarea.addEventListener('input', () => {
    setFieldValidity(textarea, true);
    hideError();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  attachJSONHandlers(document.getElementById('schema'));
  attachJSONHandlers(document.getElementById('response'));
  updateSubmitState();
});

function formatAI(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/### (.*?)(\n|$)/g, '<strong>$1</strong>\n')
    .replace(/^- /gm, '→ ');
}

async function validate() {
  hideError();
  const schemaField = document.getElementById('schema');
  const responseField = document.getElementById('response');
  const schemaRaw = schemaField.value.trim();
  const responseRaw = responseField.value.trim();
  const btn = document.getElementById('submitBtn');
  const result = document.getElementById('result');

  if (!schemaRaw || !responseRaw) {
    showError('Both fields are required.');
    return;
  }

  if (!validateJSONField(schemaField, { formatIfValid: true, showErrorMessage: true })) {
    return;
  }

  if (!validateJSONField(responseField, { formatIfValid: true, showErrorMessage: true })) {
    return;
  }

  btn.disabled = true;
  btn.classList.add('loading');
  result.classList.remove('visible', 'valid', 'invalid');

  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schema: schemaRaw,
        response: responseRaw
      })
    });

    if (!res.ok) {
      throw new Error('Webhook returned ' + res.status);
    }

    const data = await res.json();
    const isValid = data.valid;
    const errors = data.errors || [];
    const aiText = data.ai_explanation || '';

    result.classList.add('visible', isValid ? 'valid' : 'invalid');
    document.getElementById('resultTitle').textContent = isValid
      ? 'Contract Valid — Response matches schema'
      : `Contract Invalid — ${errors.length} error${errors.length > 1 ? 's' : ''} detected`;

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