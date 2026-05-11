# Schematch

Schematch is a lightweight API contract validator for comparing an expected JSON schema against an actual API response. It validates and formats JSON entirely in the browser, and can optionally call OpenAI directly for AI-assisted diagnostics.

Production URL: https://ntemposd.me/schematch/

## Features

- Validates two JSON inputs: expected schema and actual API response
- Auto-formats valid pasted or blurred JSON for readability
- Blocks submission when either JSON input is invalid
- Shows field-specific parse errors before any AI request is made
- Displays contract validation results, error lists, and optional AI diagnosis text
- Works as a static site on GitHub Pages with no backend
- Includes a one-click sample payload and copy-result action for demos

## Project Files

- `index.html`: app markup and metadata
- `styles.css`: visual styling and typography
- `script.js`: JSON validation, local contract checking, API key storage, and OpenAI request logic
- `schematch.svg`: site logo and favicon source
- `og-card.png`: share preview image

## How It Works

1. Users paste JSON into the schema and response fields.
2. On paste and blur, valid JSON is reformatted with indentation.
3. Invalid JSON surfaces an inline banner error and disables the submit button.
4. On submit, the app validates the schema and response locally in the browser.
5. If validation fails and an OpenAI API key is saved, the app requests an AI diagnosis directly from OpenAI.
6. The UI renders whether the contract is valid, lists validation errors, and shows the AI explanation when present.
7. You can load a sample payload for quick testing and copy the current result text after validation.

## Notes

- Current validation is focused on top-level field presence and simple type matching.
- Nested schema rules, enums, and full OpenAPI spec support are not currently implemented.
- The OpenAI API key is stored in local browser storage, which is convenient for static hosting but should only be used on a browser you control.

## Deployment

The app is designed to deploy as a plain static site through GitHub Pages.

1. Push changes to `main`.
2. Let the existing `pages-build-deployment` flow publish the site.
3. The production experience is served from `https://ntemposd.me/schematch/` via an external redirect layered on top of the GitHub Pages deployment.

Because the app uses only relative asset paths, there is no backend or build step required for deployment.

## Local Development

Run any static file server from the project root.

PowerShell example:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/` in your browser.

For a quick JavaScript syntax check:

```powershell
node --check .\script.js
```
