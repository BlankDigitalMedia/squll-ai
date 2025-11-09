import { mount } from 'svelte';
import Panel from './panel/Panel.svelte';
import FloatingButton from './panel/FloatingButton.svelte';
import { loadLayout, saveLayout } from '@/storage';
import './content-script.css';

const MAX_Z_INDEX = 2147483647;
const DEFAULT_PANEL_LAYOUT = {
	X_PERCENT: 0.15,
	Y_PERCENT: 0.1,
	WIDTH_PERCENT: 0.49,
	HEIGHT_PERCENT: 0.8
};
const DEFAULT_BUTTON_LAYOUT = {
	X_PERCENT: 0.02,
	Y_PERCENT: 0.9
};

let panelInstance: ReturnType<typeof mount> | null = null;
let buttonInstance: ReturnType<typeof mount> | null = null;
let hostElement: HTMLElement | null = null;
let buttonHostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

// Track copied style hashes per shadow to avoid duplicates
const shadowToCopiedStyles = new WeakMap<ShadowRoot, Set<string>>();
let headObserver: MutationObserver | null = null;
let registeredShadows: Set<ShadowRoot> = new Set();

function hashText(text: string): string {
	let h = 0;
	for (let i = 0; i < text.length; i++) {
		h = (h * 31 + text.charCodeAt(i)) | 0;
	}
	return `${h}:${text.length}`;
}

function copyStyleIntoShadow(styleEl: HTMLStyleElement, targetShadow: ShadowRoot) {
	const text = styleEl.textContent || '';
	if (!text) return;
	const copied = shadowToCopiedStyles.get(targetShadow) ?? new Set<string>();
	const key = hashText(text);
	if (copied.has(key)) return;
	const clone = document.createElement('style');
	clone.textContent = text;
	targetShadow.appendChild(clone);
	copied.add(key);
	shadowToCopiedStyles.set(targetShadow, copied);
}

function shouldMirrorStyle(styleEl: HTMLStyleElement): boolean {
	const text = styleEl.textContent || '';
	if (!text) return false;
	// Heuristic: Svelte component CSS contains hashed selectors like `.svelte-xxxx`
	// Match our key selectors to be safe and future-proof.
	const hintSelectors = ['.svelte-', '.panel', '.floating-button', '.header', '.editor', '.resize-handle', '.notes-tab-container'];
	return hintSelectors.some((s) => text.includes(s));
}

function ensureHeadObserver() {
	if (headObserver) return;
	headObserver = new MutationObserver((mutations) => {
		for (const m of mutations) {
			for (const node of Array.from(m.addedNodes)) {
				if (node instanceof HTMLStyleElement && shouldMirrorStyle(node)) {
					for (const s of registeredShadows) {
						copyStyleIntoShadow(node, s);
					}
				}
			}
		}
	});
	if (document.head) {
		headObserver.observe(document.head, { childList: true });
	}
}

function injectStyles(targetShadow: ShadowRoot) {
	// 1) Mirror any Svelte-injected <style> from document.head into the shadow root.
	registeredShadows.add(targetShadow);
	ensureHeadObserver();
	for (const styleEl of Array.from(document.head.querySelectorAll('style'))) {
		if (shouldMirrorStyle(styleEl)) {
			copyStyleIntoShadow(styleEl as HTMLStyleElement, targetShadow);
		}
	}

	// 2) Additionally, link external CSS if it ever exists (no-ops if missing).
	const ensureLink = (href: string) => {
		const alreadyHas = Array.from(targetShadow.querySelectorAll('link')).some(
			(l) => (l as HTMLLinkElement).href.includes(href)
		);
		if (!alreadyHas) {
			const url = chrome.runtime.getURL(href);
			// Only append if the asset actually exists to avoid console noise
			fetch(url, { method: 'HEAD' })
				.then((res) => {
					if (res.ok) {
						const link = document.createElement('link');
						link.rel = 'stylesheet';
						link.href = url;
						targetShadow.appendChild(link);
					}
				})
				.catch(() => {
					/* ignore */
				});
		}
	};
	ensureLink('content-script.css');
	ensureLink('style.css');
	ensureLink('notes.css');
}

function updateButtonVisibility(show: boolean) {
	if (buttonHostElement) {
		buttonHostElement.style.display = show ? 'block' : 'none';
	}
}

function initPanel() {
	if (hostElement) return;

	// Check if already exists (e.g., page reload)
	const existing = document.getElementById('extension-root');
	if (existing && existing.shadowRoot) {
		hostElement = existing;
		shadowRoot = existing.shadowRoot;
		// Find button host if it exists (outside the panel host)
		const existingButtonHost = document.getElementById('button-root') as HTMLElement | null;
		if (existingButtonHost) {
			buttonHostElement = existingButtonHost;
			// Set initial position if not already set
			if (!existingButtonHost.style.left || !existingButtonHost.style.top) {
				existingButtonHost.style.left = `${window.innerWidth * DEFAULT_BUTTON_LAYOUT.X_PERCENT}px`;
				existingButtonHost.style.top = `${window.innerHeight * DEFAULT_BUTTON_LAYOUT.Y_PERCENT}px`;
			}
			// Remount button if needed
			if (!buttonInstance && existingButtonHost.shadowRoot && existingButtonHost.shadowRoot.childNodes.length === 0) {
				const btnShadow = existingButtonHost.shadowRoot;
				// Inject CSS if needed
				injectStyles(btnShadow);
				const buttonMountPoint = document.createElement('div');
				buttonMountPoint.style.pointerEvents = 'auto';
				btnShadow.appendChild(buttonMountPoint);
				buttonInstance = mount(FloatingButton, {
					target: buttonMountPoint,
					props: {
						onToggle: () => {
							togglePanel();
						}
					}
				});
			}
		}
		// Panel should already be mounted, but restore layout (position, size, visibility)
		loadLayout().then((layout) => {
			const defaultLayout = {
				x: window.innerWidth * DEFAULT_PANEL_LAYOUT.X_PERCENT,
				y: window.innerHeight * DEFAULT_PANEL_LAYOUT.Y_PERCENT,
				width: window.innerWidth * DEFAULT_PANEL_LAYOUT.WIDTH_PERCENT,
				height: window.innerHeight * DEFAULT_PANEL_LAYOUT.HEIGHT_PERCENT,
				visible: layout.visible !== undefined ? layout.visible : true
			};

			const finalLayout = { ...defaultLayout, ...layout };

			if (finalLayout.x !== undefined && finalLayout.y !== undefined) {
				existing.style.left = `${finalLayout.x}px`;
				existing.style.top = `${finalLayout.y}px`;
			}
			if (finalLayout.width !== undefined && finalLayout.height !== undefined) {
				existing.style.width = `${finalLayout.width}px`;
				existing.style.height = `${finalLayout.height}px`;
			}

			existing.style.display = finalLayout.visible ? 'block' : 'none';
			updateButtonVisibility(!finalLayout.visible);
			// If panel was minimized, ensure button is visible
			if (layout.minimized) {
				updateButtonVisibility(true);
			}
		});
		return;
	}

	const host = document.createElement('div');
	host.id = 'extension-root';
	host.style.position = 'fixed';
	host.style.zIndex = String(MAX_Z_INDEX);
	host.style.pointerEvents = 'none';
	document.documentElement.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });
	shadowRoot = shadow;
	// Inject compiled CSS into the shadow root so Svelte styles apply
	injectStyles(shadow);
	const mountPoint = document.createElement('div');
	mountPoint.style.pointerEvents = 'auto';
	mountPoint.style.width = '100%';
	mountPoint.style.height = '100%';
	shadow.appendChild(mountPoint);

	// Create a separate host element for the floating button (outside panel host)
	const buttonHost = document.createElement('div');
	buttonHost.id = 'button-root';
	buttonHost.style.position = 'fixed';
	buttonHost.style.zIndex = String(MAX_Z_INDEX);
	buttonHost.style.pointerEvents = 'none';
	buttonHost.style.display = 'block'; // Ensure button is visible by default, will be controlled by updateButtonVisibility
	// Set initial position (will be overridden by FloatingButton component if saved position exists)
	buttonHost.style.left = `${window.innerWidth * DEFAULT_BUTTON_LAYOUT.X_PERCENT}px`; // 2% from left
	buttonHost.style.top = `${window.innerHeight * DEFAULT_BUTTON_LAYOUT.Y_PERCENT}px`; // 90% from top (near bottom)
	document.documentElement.appendChild(buttonHost);
	// Attach a shadow root for style isolation and inject stylesheet
	const buttonShadow = buttonHost.attachShadow({ mode: 'open' });
	injectStyles(buttonShadow);
	const buttonMountPoint = document.createElement('div');
	buttonMountPoint.style.pointerEvents = 'auto';
	buttonShadow.appendChild(buttonMountPoint);
	buttonHostElement = buttonHost;
	// Mount the floating button immediately
	buttonInstance = mount(FloatingButton, {
		target: buttonMountPoint,
		props: {
			onToggle: () => {
				togglePanel();
			}
		}
	});

	hostElement = host;

	loadLayout().then((layout) => {
		const defaultLayout = {
			x: window.innerWidth * DEFAULT_PANEL_LAYOUT.X_PERCENT,
			y: window.innerHeight * DEFAULT_PANEL_LAYOUT.Y_PERCENT,
			width: window.innerWidth * DEFAULT_PANEL_LAYOUT.WIDTH_PERCENT,
			height: window.innerHeight * DEFAULT_PANEL_LAYOUT.HEIGHT_PERCENT,
			visible: layout.visible !== undefined ? layout.visible : true
		};

		const finalLayout = { ...defaultLayout, ...layout };

		if (finalLayout.x !== undefined && finalLayout.y !== undefined) {
			host.style.left = `${finalLayout.x}px`;
			host.style.top = `${finalLayout.y}px`;
		}
		if (finalLayout.width !== undefined && finalLayout.height !== undefined) {
			host.style.width = `${finalLayout.width}px`;
			host.style.height = `${finalLayout.height}px`;
		}

		host.style.display = finalLayout.visible ? 'block' : 'none';

		panelInstance = mount(Panel, {
			target: mountPoint,
			props: {
				onLayoutChange: (layout: Parameters<typeof saveLayout>[0]) => {
					saveLayout(layout);
				},
				onMinimize: () => {
					togglePanel();
				}
			}
		});

		// Set initial button visibility based on panel visibility
		updateButtonVisibility(!finalLayout.visible);
	});
}

function togglePanel() {
	if (!hostElement) {
		initPanel();
		return;
	}

	const isVisible = hostElement.style.display !== 'none';
	const newVisibility = !isVisible;
	// If minimizing, capture position/size BEFORE hiding; if showing, don't overwrite saved geometry
	if (!newVisibility) {
		const rect = hostElement.getBoundingClientRect();
		saveLayout({
			x: rect.left,
			y: rect.top,
			width: rect.width,
			height: rect.height,
			visible: newVisibility,
			minimized: true
		});
	} else {
		// Only update visibility flags when showing again
		saveLayout({ visible: true, minimized: false });
	}
	hostElement.style.display = newVisibility ? 'block' : 'none';
	updateButtonVisibility(!newVisibility);
}

// Set up message listener before initialization
chrome.runtime.onMessage.addListener((message) => {
	if (message.type === 'toggle-panel') {
		togglePanel();
	}
	return true; // Indicates we will send a response asynchronously
});

// Initialize panel after message listener is set up
initPanel();

