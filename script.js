const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const OPENAI_MODEL = 'gpt-4.1-mini';
const STORAGE_KEY = 'schematch.openai.apiKey';
const SAMPLE_PAYLOAD = {
  schema: {
    user_id: 'number',
    email: 'string',
    status: 'string',
    marketing_opt_in: 'boolean'
  },
  response: {
    user_id: '123abc',
    status: 'active',
    marketing_opt_in: 'yes'
  }
};

const FIELD_LABELS = {
  schema: 'Expected Schema',
  response: 'Actual API Response'
};

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  banner.textContent = msg;
  banner.classList.add('visible');
}

function setActionStatus(message, isError = false) {
  const status = document.getElementById('actionStatus');

  if (!status) {
    return;
  }

  status.textContent = message;
  status.dataset.state = message ? (isError ? 'error' : 'success') : '';
}

function hideError() {
  document.getElementById('errorBanner').classList.remove('visible');
}

function formatJSON(value) {
  return JSON.stringify(JSON.parse(value), null, 2);
}

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getStoredApiKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

function saveApiKey(value) {
  localStorage.setItem(STORAGE_KEY, value.trim());
}

function clearApiKey() {
  localStorage.removeItem(STORAGE_KEY);
}

function getActualType(value) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  return typeof value;
}

function normalizeExpectedType(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validateContract(schema, response) {
  const errors = [];

  if (!schema || Array.isArray(schema) || typeof schema !== 'object') {
    return {
      valid: false,
      errors: ['Schema must be a JSON object with top-level fields mapped to expected type names.']
    };
  }

  if (!response || Array.isArray(response) || typeof response !== 'object') {
    return {
      valid: false,
      errors: ['Response must be a JSON object.']
    };
  }

  for (const field of Object.keys(schema)) {
    if (!(field in response)) {
      errors.push(`Missing field: "${field}"`);
      continue;
    }

    const expectedType = normalizeExpectedType(schema[field]);
    const actualType = getActualType(response[field]);

    if (!expectedType) {
      errors.push(`Field "${field}": expected type must be a string like string, number, or boolean.`);
      continue;
    }

    if (actualType !== expectedType) {
      errors.push(`Field "${field}": expected ${expectedType}, got ${actualType}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return '';
  }

  const parts = [];

  for (const item of data.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (typeof contentItem.text === 'string' && contentItem.text.trim()) {
        parts.push(contentItem.text.trim());
        continue;
      }

      if (typeof contentItem.output_text === 'string' && contentItem.output_text.trim()) {
        parts.push(contentItem.output_text.trim());
      }
    }
  }

  return parts.join('\n\n').trim();
}

async function requestAIDiagnosis(apiKey, errors, schema, response) {
  const prompt = [
    'You are an API debugging assistant.',
    '',
    'The following errors were found when validating an API response against its expected schema:',
    '',
    `Errors: ${JSON.stringify(errors)}`,
    '',
    `Schema: ${JSON.stringify(schema, null, 2)}`,
    '',
    `Actual Response: ${JSON.stringify(response, null, 2)}`,
    '',
    'Explain clearly:',
    '1. What broke',
    '2. Why it likely happened',
    '3. How to fix it'
  ].join('\n');

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt
    })
  });

  if (!res.ok) {
    let message = `OpenAI returned ${res.status}`;

    try {
      const errorData = await res.json();
      message = errorData.error?.message || message;
    } catch {
    }

    throw new Error(message);
  }

  const data = await res.json();
  const text = extractResponseText(data);

  if (!text) {
    throw new Error('OpenAI returned a response, but no readable text was found in the payload.');
  }

  return text;
}

function renderResult(result, aiText = '', aiError = '') {
  const resultElement = document.getElementById('result');
  resultElement.classList.add('visible', result.valid ? 'valid' : 'invalid');
  document.getElementById('resultTitle').textContent = result.valid
    ? 'Contract Valid - Response matches schema'
    : `Contract Invalid - ${result.errors.length} error${result.errors.length > 1 ? 's' : ''} detected`;

  let bodyHTML = '';

  if (!result.valid && result.errors.length > 0) {
    bodyHTML += `<div class="errors-list">
      <div class="errors-title">Validation Errors</div>
      ${result.errors.map((error) => `<div class="error-item">${escapeHTML(error)}</div>`).join('')}
    </div>`;
  }

  if (aiText) {
    bodyHTML += `<div class="ai-section">
      <div class="ai-label">AI Diagnosis</div>
      <div class="ai-text">${formatAI(escapeHTML(aiText))}</div>
    </div>`;
  } else if (!result.valid) {
    bodyHTML += `<div class="info-callout">${escapeHTML(aiError || 'Add an OpenAI API key to receive AI diagnosis for invalid responses.')}</div>`;
  }

  if (!bodyHTML) {
    bodyHTML = '<div class="ai-text success-copy">All fields match the expected schema. No issues found.</div>';
  }

  document.getElementById('resultBody').innerHTML = bodyHTML;
}

function buildResultText() {
  const result = document.getElementById('result');
  const title = document.getElementById('resultTitle').textContent.trim();
  const body = document.getElementById('resultBody').innerText.trim();

  if (!result.classList.contains('visible') || !title) {
    return '';
  }

  return [title, body].filter(Boolean).join('\n\n');
}

function syncApiKeyUI() {
  const apiKeyField = document.getElementById('apiKey');
  const status = document.getElementById('apiKeyStatus');
  const hasKey = Boolean(getStoredApiKey());

  if (apiKeyField && !apiKeyField.value) {
    apiKeyField.value = getStoredApiKey();
  }

  if (status) {
    status.textContent = hasKey
      ? 'Key saved in this browser.'
      : 'No key saved. Use a test key for AI diagnosis.';
  }
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
  const apiKeyField = document.getElementById('apiKey');

  if (apiKeyField) {
    apiKeyField.value = getStoredApiKey();
    apiKeyField.addEventListener('blur', () => {
      const value = apiKeyField.value.trim();

      if (value) {
        saveApiKey(value);
      } else {
        clearApiKey();
      }

      syncApiKeyUI();
    });
  }

  syncApiKeyUI();
  setActionStatus('');
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
  setActionStatus('');
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
    const schema = JSON.parse(schemaField.value);
    const response = JSON.parse(responseField.value);
    const validationResult = validateContract(schema, response);
    let aiText = '';
    let aiError = '';

    if (!validationResult.valid) {
      const apiKey = getStoredApiKey();

      if (apiKey) {
        try {
          aiText = await requestAIDiagnosis(apiKey, validationResult.errors, schema, response);
        } catch (error) {
          aiError = `AI diagnosis unavailable: ${error.message}`;
        }
      }
    }

    renderResult(validationResult, aiText, aiError);
  } catch(e) {
    showError('Validation failed: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.classList.remove('loading');
  }
}

function clearSavedKey() {
  const apiKeyField = document.getElementById('apiKey');
  clearApiKey();

  if (apiKeyField) {
    apiKeyField.value = '';
  }

  syncApiKeyUI();
}

function loadSamplePayload() {
  const schemaField = document.getElementById('schema');
  const responseField = document.getElementById('response');

  schemaField.value = JSON.stringify(SAMPLE_PAYLOAD.schema, null, 2);
  responseField.value = JSON.stringify(SAMPLE_PAYLOAD.response, null, 2);
  setFieldValidity(schemaField, true);
  setFieldValidity(responseField, true);
  hideError();
  setActionStatus('Sample payload loaded.');
}

async function copyResult() {
  const text = buildResultText();

  if (!text) {
    setActionStatus('Run a validation before copying the result.', true);
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setActionStatus('Result copied to clipboard.');
  } catch (error) {
    setActionStatus(`Copy failed: ${error.message}`, true);
  }
}