# Gemini API Backend Template Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a modular Google Gemini API backend template in `my-app` supporting prompt templates (`{{variable}}` binding + system instructions), basic text generation, multimodal input (File/Blob/Base64/Buffer), and Next.js App Router API endpoints.

**Architecture:** A clean 2-layer architecture inside `my-app`: `lib/gemini/*` provides framework-agnostic server utilities (`client.ts`, `prompts.ts`, `multimodal.ts`, `service.ts`, `types.ts`), and `app/api/gemini/{generate,multimodal}/route.ts` exposes standard Next.js Route Handlers with unified JSON envelopes and HTTP error handling.

**Tech Stack:** Next.js 16.4.2 (App Router), TypeScript 5, `@google/genai` (official Google Gen AI SDK), Node.js built-in test runner (`node --test`).

---

### Task 1: Install `@google/genai` and Add Environment Template

**Files:**
- Modify: `my-app/package.json`
- Create: `my-app/.env.example`

**Step 1: Install `@google/genai`**
Run: `npm install @google/genai` in `my-app`

**Step 2: Create `my-app/.env.example`**
Document `GEMINI_API_KEY` and `GEMINI_DEFAULT_MODEL`.

---

### Task 2: Core Types, Error Handling, and Prompt Template Engine (`types.ts`, `prompts.ts`)

**Files:**
- Create: `my-app/lib/gemini/types.ts`
- Create: `my-app/lib/gemini/prompts.ts`
- Test: `my-app/lib/gemini/__tests__/prompts.test.ts`

**Step 1: Write unit tests for template interpolation and missing variable errors**
**Step 2: Implement `types.ts` and `prompts.ts`**
**Step 3: Run tests to verify they pass**

---

### Task 3: Multimodal Input Helper (`multimodal.ts`)

**Files:**
- Create: `my-app/lib/gemini/multimodal.ts`
- Test: `my-app/lib/gemini/__tests__/multimodal.test.ts`

**Step 1: Write unit tests for Base64/Buffer/File conversion, MIME validation, and size limits**
**Step 2: Implement `multimodal.ts`**
**Step 3: Run tests to verify they pass**

---

### Task 4: Gemini Client & Service Layer (`client.ts`, `service.ts`, `index.ts`)

**Files:**
- Create: `my-app/lib/gemini/client.ts`
- Create: `my-app/lib/gemini/service.ts`
- Create: `my-app/lib/gemini/index.ts`
- Test: `my-app/lib/gemini/__tests__/service.test.ts`

**Step 1: Write unit tests for `generateText`, `generateFromTemplate`, and `generateMultimodal` using injectable/mocked SDK client**
**Step 2: Implement `client.ts`, `service.ts`, and `index.ts`**
**Step 3: Run tests to verify they pass**

---

### Task 5: Next.js App Router API Route Handlers

**Files:**
- Create: `my-app/app/api/gemini/generate/route.ts`
- Create: `my-app/app/api/gemini/multimodal/route.ts`

**Step 1: Implement `POST /api/gemini/generate` and `GET /api/gemini/generate` (returns available prompt templates)**
**Step 2: Implement `POST /api/gemini/multimodal` supporting both `multipart/form-data` and `application/json`**
**Step 3: Verify TypeScript compilation and `npm run build`**
