import { mount } from 'svelte';
import Panel from './panel/Panel.svelte';
import FloatingButton from './panel/FloatingButton.svelte';
import { loadLayout, saveLayout } from '@/storage';

let panelInstance: ReturnType<typeof mount> | null = null;
let buttonInstance: ReturnType<typeof mount> | null = null;
let hostElement: HTMLElement | null = null;
let buttonHostElement: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

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
				existingButtonHost.style.left = `${window.innerWidth * 0.02}px`;
				existingButtonHost.style.top = `${window.innerHeight * 0.9}px`;
			}
			// Remount button if needed
			if (!buttonInstance && existingButtonHost.shadowRoot && existingButtonHost.shadowRoot.childNodes.length === 0) {
				const btnShadow = existingButtonHost.shadowRoot;
				// Inject CSS if needed
				const alreadyHasLink = Array.from(btnShadow.querySelectorAll('link')).some((l) =>
					(l as HTMLLinkElement).href.includes('content-script.css')
				);
				if (!alreadyHasLink) {
					const styleLink2 = document.createElement('link');
					styleLink2.rel = 'stylesheet';
					styleLink2.href = chrome.runtime.getURL('content-script.css');
					btnShadow.appendChild(styleLink2);
				}
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
				x: window.innerWidth * 0.15,
				y: window.innerHeight * 0.1,
				width: window.innerWidth * 0.49,
				height: window.innerHeight * 0.8,
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
	host.style.zIndex = '2147483647';
	host.style.pointerEvents = 'none';
	document.documentElement.appendChild(host);
	const shadow = host.attachShadow({ mode: 'open' });
	shadowRoot = shadow;
	// Inject compiled CSS into the shadow root so Svelte styles apply
	const styleLink = document.createElement('link');
	styleLink.rel = 'stylesheet';
	styleLink.href = chrome.runtime.getURL('content-script.css');
	shadow.appendChild(styleLink);
	const mountPoint = document.createElement('div');
	mountPoint.style.pointerEvents = 'auto';
	mountPoint.style.width = '100%';
	mountPoint.style.height = '100%';
	shadow.appendChild(mountPoint);

	// Create a separate host element for the floating button (outside panel host)
	const buttonHost = document.createElement('div');
	buttonHost.id = 'button-root';
	buttonHost.style.position = 'fixed';
	buttonHost.style.zIndex = '2147483647';
	buttonHost.style.pointerEvents = 'none';
	// Set initial position (will be overridden by FloatingButton component if saved position exists)
	buttonHost.style.left = `${window.innerWidth * 0.02}px`; // 2% from left
	buttonHost.style.top = `${window.innerHeight * 0.9}px`; // 90% from top (near bottom)
	document.documentElement.appendChild(buttonHost);
	// Attach a shadow root for style isolation and inject stylesheet
	const buttonShadow = buttonHost.attachShadow({ mode: 'open' });
	const styleLink2 = document.createElement('link');
	styleLink2.rel = 'stylesheet';
	styleLink2.href = chrome.runtime.getURL('content-script.css');
	buttonShadow.appendChild(styleLink2);
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
			x: window.innerWidth * 0.15,
			y: window.innerHeight * 0.1,
			width: window.innerWidth * 0.49,
			height: window.innerHeight * 0.8,
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

