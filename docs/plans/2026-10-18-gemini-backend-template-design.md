# Next.js Gemini API Backend Template Design

- **Date**: 2026-10-18
- **Target Project**: `my-app` (Next.js 16.4.2 App Router, TypeScript)
- **SDK**: `@google/genai`

## 1. Goal & Scope

Create a reusable backend-only Google Gemini API integration template for the Next.js App Router server (`my-app`). The template includes:
1. **Prompt Template System & Basic Text Generation**: System instructions + `{{variable}}` interpolation with missing-variable validation, plus raw prompt support.
2. **Multimodal Input Support**: Helpers to convert `File` / `Blob` (from `multipart/form-data`), Base64 strings, or `Buffer` into Gemini `inlineData` parts with MIME type and size validation.
3. **App Router API Endpoints**: Ready-to-use `POST /api/gemini/generate` and `POST /api/gemini/multimodal` Route Handlers with consistent JSON responses and error handling.

## 2. Directory Structure

```text
my-app/
├── .env.example
├── lib/
│   └── gemini/
│       ├── types.ts          # Shared TypeScript interfaces & custom error classes
│       ├── client.ts         # Singleton GoogleGenAI client & model resolution
│       ├── prompts.ts        # Prompt template registry, interpolation, & presets
│       ├── multimodal.ts     # File/Blob/Base64/Buffer -> Part converter & validation
│       ├── service.ts        # Core service functions (generateText, generateFromTemplate, generateMultimodal)
│       └── index.ts          # Barrel exports
└── app/
    └── api/
        └── gemini/
            ├── generate/
            │   └── route.ts  # POST endpoint for text & prompt template generation
            └── multimodal/
                └── route.ts  # POST endpoint for multimodal (FormData or JSON Base64) analysis
```

## 3. Component Details

### 3.1 `lib/gemini/client.ts`
- Uses `@google/genai` (`GoogleGenAI`).
- Reads `process.env.GEMINI_API_KEY` lazily on server call so builds succeed without an API key set at build time.
- Throws `GeminiError` (`CONFIG_ERROR`, HTTP 500) if `GEMINI_API_KEY` is missing at runtime.
- Default model: `process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash"`.

### 3.2 `lib/gemini/prompts.ts`
- Defines `PromptTemplateConfig` with `id`, `description`, `systemInstruction`, `template`, `requiredVariables`, and optional `defaultConfig` (`temperature`, `maxOutputTokens`, `topP`).
- Built-in example templates:
  - `summarize`: Summarize text into bullet points with target length/tone.
  - `translate`: Translate text into target language preserving tone.
  - `code-review`: Review code snippet for bugs, security, and improvements.
  - `media-describe`: Analyze attached image/document with custom focus.
- Provides `renderTemplate(templateString, variables)` and `resolvePromptTemplate(templateId, variables)` which validate all `{{varName}}` placeholders.

### 3.3 `lib/gemini/multimodal.ts`
- Supported MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif`, `application/pdf`, `text/plain`, `text/csv`, `audio/mpeg`, `audio/wav`, `video/mp4`.
- Max inline size default: 20 MB (`20 * 1024 * 1024` bytes).
- Functions:
  - `fileToGenerativePart(file: File | Blob, mimeTypeOverride?: string): Promise<Part>`
  - `base64ToGenerativePart(base64Data: string, mimeType: string): Part`
  - `bufferToGenerativePart(buffer: Buffer | Uint8Array, mimeType: string): Part`

### 3.4 `lib/gemini/service.ts`
- `generateText(options)`: Accepts `prompt`, optional `systemInstruction`, `model`, and generation config; returns `{ text, model, usage }`.
- `generateFromTemplate(options)`: Accepts `templateId`, `variables`, optional overrides; renders prompt and calls `generateText`.
- `generateMultimodal(options)`: Accepts `prompt` (or `templateId` + `variables`), `media` array (`Part[]`), optional `systemInstruction` and config; invokes `ai.models.generateContent` with combined `[...mediaParts, { text: prompt }]`.

### 3.5 API Route Handlers
- `POST /api/gemini/generate`:
  - Accepts JSON body: either `{ prompt, systemInstruction?, model?, config? }` or `{ templateId, variables, model?, config? }`.
  - Returns `{ success: true, data: { text, model, usage } }` or `{ success: false, error: { code, message } }`.
- `POST /api/gemini/multimodal`:
  - Supports both `multipart/form-data` (`files` field(s) + `prompt` or `templateId`/`variables`) and `application/json` (`media: [{ data, mimeType }]` + `prompt` or `templateId`/`variables`).
  - Returns `{ success: true, data: { text, model, usage } }` or `{ success: false, error: { code, message } }`.
