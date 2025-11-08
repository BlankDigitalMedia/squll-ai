# Agents Guide: Crystal Skull v2

This document provides essential context for AI agents working with this codebase.

## Project Overview

**Crystal Skull Notepad** is a Chrome browser extension that provides a Notion-style floating notepad overlay for taking notes while browsing. The project consists of two main parts:

1. **SvelteKit Web Application** (`src/`) - Currently unused scaffolding (default SvelteKit routes). The storage utilities (`src/storage/`) are shared with the extension.
2. **Chrome Extension** (`extension/`) - Browser extension implementation (the main application)

## Technology Stack

- **Framework**: SvelteKit 2.x with Svelte 5 (using runes: `$state`, `$props`, `$derived`)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (using `@import 'tailwindcss'` syntax)
- **Build Tool**: Vite
- **Extension APIs**: Chrome Extension Manifest V3

## Project Structure

```
crystal-skull-v2/
├── src/                    # SvelteKit application
│   ├── routes/            # SvelteKit routes
│   ├── lib/               # Shared components and utilities
│   ├── storage/           # Chrome storage abstraction layer
│   └── app.css            # Global styles (Tailwind imports)
│
├── extension/             # Chrome extension code
│   ├── background.ts      # Service worker (extension entry point)
│   ├── content-script.ts  # Content script (injects panel into pages)
│   ├── panel/             # Panel components (Svelte)
│   │   ├── Panel.svelte   # Main notepad panel component
│   │   └── FloatingButton.svelte  # Floating toggle button
│   ├── manifest.json      # Extension manifest
│   └── vite.config.ts     # Extension-specific Vite config
│
└── static/                # Static assets
```

## Key Concepts

### Extension Architecture

The extension uses a **Shadow DOM** approach for isolation with **two separate shadow roots**:

1. **Background Script** (`extension/background.ts`): Listens for extension icon clicks and sends messages to content scripts
2. **Content Script** (`extension/content-script.ts`): 
   - Creates **two separate shadow DOM roots** for complete isolation:
     - `#extension-root` - Hosts the Panel component
     - `#button-root` - Hosts the FloatingButton component
   - Mounts both Svelte components inside their respective shadow DOMs
   - Handles panel visibility toggling
   - Manages panel positioning and sizing
   - Coordinates visibility between panel and floating button
3. **Panel Component** (`extension/panel/Panel.svelte`): The main UI component with drag/resize functionality
   - Draggable via header
   - Resizable via bottom-right handle
   - Minimizable (hides panel, shows floating button)
4. **FloatingButton Component** (`extension/panel/FloatingButton.svelte`): A draggable floating button that appears when the panel is minimized
   - Toggles panel visibility on click
   - Draggable to reposition (distinguishes drag from click)
   - Position persists across sessions
   - Default position: 2% from left, 90% from top (near bottom-left)
5. **Shadow-root Styles**: Styles do not leak into Shadow DOM. The content script injects the compiled stylesheet (`content-script.css`) into both shadow roots and sets appropriate backgrounds on host and mount elements so the windows are opaque.

### Storage Layer

The `src/storage/index.ts` module provides a clean abstraction over Chrome's storage API:

- `loadNote()` / `saveNote()` - Note content persistence
- `loadLayout()` / `saveLayout()` - Panel position, size, visibility, and minimized state
- `loadButtonLayout()` / `saveButtonLayout()` - FloatingButton position persistence
- Uses `chrome.storage.sync` for cross-device synchronization
- Resiliency: When the extension context is invalidated (e.g., service worker restarts), storage calls fall back to `localStorage` (`cs_note`, `cs_layout`, `cs_button_layout`) to avoid runtime errors; sync storage resumes on next valid context.

### Svelte 5 Patterns

This project uses **Svelte 5 runes**:

- `$state()` - Reactive state variables
- `$props()` - Component props
- `$derived()` - Computed values (when needed)

**Example pattern:**
```typescript
let content = $state('');
let { onLayoutChange }: Props = $props();
```

## Svelte MCP Tools

AI agents have access to comprehensive Svelte 5 and SvelteKit documentation through the Svelte MCP server. Use these tools when working with Svelte code:

### 1. `list-sections`

**Use this FIRST** when working with Svelte/SvelteKit topics. Returns a structured list of all available documentation sections with titles, use_cases, and paths.

**Workflow:**
- Call `list-sections` at the start when asked about Svelte or SvelteKit topics
- Analyze the returned sections, especially the `use_cases` field
- Identify which sections are relevant for the task

### 2. `get-documentation`

Retrieves full documentation content for specific sections. Accepts single or multiple sections.

**Workflow:**
- After calling `list-sections`, analyze the `use_cases` field
- Use `get-documentation` to fetch **ALL** relevant documentation sections
- Don't fetch just one section - get all that are relevant to the task

### 3. `svelte-autofixer`

Analyzes Svelte code and returns issues and suggestions.

**MANDATORY USAGE:**
- **MUST** use this tool whenever writing Svelte code **before** sending it to the user
- Keep calling it until no issues or suggestions are returned
- This ensures code follows Svelte 5 best practices

**Parameters:**
- `code`: The Svelte component/module code
- `desired_svelte_version`: Use `5` (read from package.json if possible)
- `filename`: Component name with `.svelte` extension
- `async`: Set to `true` if using top-level await or async components

### 4. `playground-link`

Generates a Svelte Playground link with the provided code.

**Usage Rules:**
- **ONLY** call after user explicitly confirms they want a playground link
- **NEVER** call if code was written to files in the project
- Ask the user first: "Would you like a playground link to test this code?"

## Development Workflows

### Running the Application

```bash
# Development server (SvelteKit app)
npm run dev

# Extension development (watch mode)
npm run dev:ext

# Build extension for production
npm run build:ext
```

### Extension Development

1. Build the extension: `npm run build:ext`
2. Load unpacked extension from `extension/dist/` in Chrome
3. Use `npm run dev:ext` for watch mode during development
4. If styles are missing in the panel, confirm `content-script.css` is present in `extension/dist`, listed under `web_accessible_resources`, and injected into the shadow root.

## Code Conventions

### File Organization

- **Svelte components**: Use PascalCase (`Panel.svelte`)
- **TypeScript modules**: Use kebab-case (`content-script.ts`)
- **Storage utilities**: Centralized in `src/storage/index.ts`

### Import Paths

- Use `@/storage` alias for storage utilities (configured in Vite)
- Use `$lib/` for SvelteKit lib imports
  - IDE TypeScript may flag alias errors in the extension folder; builds are correct via Vite `resolve.alias`.

### Styling Guidelines

- **Tailwind CSS v4** is used throughout
- Component-scoped styles in `<style>` blocks for Panel component
- Global styles in `src/app.css` (Tailwind imports only)
- Prefer Tailwind utility classes over custom CSS when possible

### TypeScript

- Strict typing is expected
- Use proper types for Chrome API calls
- Define prop types explicitly: `type Props = { ... }`

## Important Patterns

### Shadow DOM Isolation

The extension creates a shadow DOM to prevent CSS conflicts:

```typescript
const host = document.createElement('div');
host.id = 'extension-root';
const shadow = host.attachShadow({ mode: 'open' });
```

To ensure styles apply inside the shadow root, inject the compiled stylesheet:

```typescript
const styleLink = document.createElement('link');
styleLink.rel = 'stylesheet';
styleLink.href = chrome.runtime.getURL('content-script.css');
shadow.appendChild(styleLink);
```

### Debounced Saving

Note content is saved with a 300ms debounce to avoid excessive storage writes:

```typescript
function debouncedSave(text: string) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveNote(text);
  }, 300);
}
```

### Layout Persistence

**Panel Layout:**
- Position, size, visibility, and minimized state are persisted
- Saved on drag/resize end and when minimized/shown
- Loaded on initialization
- Defaults: 15% from left, 10% from top, 49% width, 80% height

**FloatingButton Layout:**
- Position is persisted separately from panel layout
- Saved when button is dragged to a new position
- Loaded on initialization
- Defaults: 2% from left, 90% from top (near bottom-left)
- Button visibility is inverse of panel visibility (shown when panel is hidden)

## Common Tasks

### Adding a New Feature

1. Determine if it belongs in the web app (`src/`) or extension (`extension/`)
2. For extension features, consider Shadow DOM isolation
3. Use storage layer for persistence needs
4. Follow Svelte 5 runes patterns

### Modifying the Panel

- Edit `extension/panel/Panel.svelte`
- Panel is draggable (via header) and resizable (via bottom-right handle)
- Layout changes trigger `onLayoutChange` callback which saves to storage
- Minimize button triggers `onMinimize` callback which toggles visibility

### Modifying the FloatingButton

- Edit `extension/panel/FloatingButton.svelte`
- Button is draggable (entire button surface)
- Distinguishes between drag and click: only toggles panel if no significant drag occurred
- Position changes trigger `saveButtonLayout()` automatically
- Button visibility is managed by content script based on panel state

### Adding Storage

- Add functions to `src/storage/index.ts`
- Use `chrome.storage.sync` for cross-device sync
- Return Promises for async operations

## Testing Considerations

- Extension must be loaded in Chrome for testing
- Content script runs on all pages (`<all_urls>`)
- Panel state persists across page reloads
- Storage syncs across devices (if Chrome sync is enabled)

## Build Configuration

- **SvelteKit**: Uses `@sveltejs/adapter-auto`
- **Extension**: Separate Vite config (`extension/vite.config.ts`)
- **TypeScript**: Strict mode enabled
- **ESLint + Prettier**: Configured for code quality

### Manifest Notes (MV3)
- `background.service_worker`: `background.js`
- `"permissions": ["storage", "scripting"]`
- `"web_accessible_resources"` includes `content-script.css` so it can be loaded inside the shadow root
- Background script gracefully handles "Receiving end does not exist" by injecting the content script and retrying

## Dependencies

Key dependencies:
- `@sveltejs/kit`: ^2.47.1
- `svelte`: ^5.41.0
- `tailwindcss`: ^4.1.14
- `@types/chrome`: ^0.0.268
- `vite`: ^7.1.10

## Notes for AI Agents

1. **Web app is scaffolding** - The `src/routes/` directory contains default SvelteKit pages that are currently unused. Only `src/storage/` is actively used by the extension.
2. **Two shadow roots** - The extension creates separate shadow DOMs for panel and floating button for complete isolation
3. **Shadow DOM** means extension styles won't affect page styles (and vice versa)
4. **Storage operations** are async - always use Promises/async-await
5. **Svelte 5 runes** are required - don't use old Svelte 4 patterns
6. **Panel positioning** uses fixed positioning with manual left/top/width/height
7. **FloatingButton positioning** also uses fixed positioning, separate from panel
8. **Extension manifest** is V3 - service worker, not background page
9. **Svelte MCP tools** - Use `list-sections` first, then `get-documentation` for Svelte topics
10. **Code validation** - Always run `svelte-autofixer` on Svelte code before finalizing
11. **Button vs Panel visibility** - They are inverse: button shows when panel is hidden, and vice versa

## Common Pitfalls

- ❌ Don't forget to rebuild extension after changes (`npm run build:ext`)
- ❌ Don't use Svelte 4 patterns (`let:` instead of `$state`)
- ❌ Don't assume styles leak between extension and page (Shadow DOM isolation)
- ❌ Don't forget to handle async storage operations properly
- ✅ Always use the storage abstraction layer, not direct Chrome API calls
- ✅ Remember panel state persists across page reloads

## Troubleshooting

- Background error “Receiving end does not exist”
  - Cause: Message sent before content script initializes
  - Fix: Background injects `content-script.js` with `chrome.scripting.executeScript` and retries

- Content script error “Extension context invalidated”
  - Cause: Old content script remains after service worker restart/extension reload
  - Fix: Storage helpers fall back to `localStorage`; refresh page to restore synced storage usage

- Transparent panel background
  - Ensure `content-script.css` is injected into both shadow roots (panel and button)
  - Confirm `content-script.css` is listed under `web_accessible_resources` and exists in `extension/dist`

- FloatingButton not appearing when panel is minimized
  - Check that `button-root` element is created in content script
  - Verify button shadow root has stylesheet injected
  - Confirm `updateButtonVisibility()` is called with correct state

