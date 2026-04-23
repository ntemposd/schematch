# Schematch

Schematch is a lightweight API contract validator for comparing an expected JSON schema against an actual API response. It validates and formats JSON on the client, then sends both payloads to a webhook for contract analysis and AI-assisted diagnostics.

## Features

- Validates two JSON inputs: expected schema and actual API response
- Auto-formats valid pasted or blurred JSON for readability
- Blocks submission when either JSON input is invalid
- Shows field-specific parse errors before any network request is made
- Displays contract validation results, error lists, and AI diagnosis text

## Project Files

- `index.html`: app markup and metadata
- `styles.css`: visual styling and typography
- `script.js`: JSON validation, formatting, button state, and webhook request logic
- `schematch.svg`: site logo and favicon source
- `og-card.png`: share preview image

## How It Works

1. Users paste JSON into the schema and response fields.
2. On paste and blur, valid JSON is reformatted with indentation.
3. Invalid JSON surfaces an inline banner error and disables the submit button.
4. On submit, the app sends both JSON strings to the configured webhook.
5. The UI renders whether the contract is valid, lists validation errors, and shows the AI explanation when present.

## Notes

- Current validation is focused on top-level field presence and primitive types.
- Nested objects, arrays, enums, and full OpenAPI spec support are not currently handled in the UI copy.
