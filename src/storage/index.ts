import { db } from './db';
import { migrateFromChromeStorage } from './migrate';

// Initialize database and run migration on first load
let dbInitPromise: Promise<void> | null = null;

function isExtensionPage(): boolean {
	try {
		return typeof location !== 'undefined' && location.protocol === 'chrome-extension:';
	} catch {
		return false;
	}
}

async function callBackground<T = any>(type: string, payload?: any): Promise<T> {
	return await new Promise<T>((resolve, reject) => {
		try {
			chrome.runtime.sendMessage({ type, payload }, (response) => {
				// In MV3, errors are surfaced via lastError
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const lastError = (chrome.runtime as any)?.lastError;
				if (lastError) {
					reject(lastError);
					return;
				}
				resolve(response as T);
			});
		} catch (err) {
			reject(err);
		}
	});
}

async function ensureDbInitialized(): Promise<void> {
	if (dbInitPromise) return dbInitPromise;

	dbInitPromise = (async () => {
		try {
			// Only open Dexie and run migration from an extension page (chrome-extension:// origin).
			// Content scripts should delegate storage to the background page.
			if (isExtensionPage()) {
				await db.open();
				await migrateFromChromeStorage();
			}
		} catch (error) {
			console.warn('Failed to initialize Dexie database:', error);
			dbInitPromise = null; // Allow retry on next call
			throw error;
		}
	})();

	return dbInitPromise;
}

function isExtensionContextValid(): boolean {
	try {
		// chrome.runtime.id is only available when the extension context is valid
		return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
	} catch {
		return false;
	}
}

export async function loadNote(): Promise<string> {
	try {
		await ensureDbInitialized();
		if (!isExtensionPage()) {
			const res = await callBackground<{ content: string }>('storage:getNote');
			return res?.content ?? '';
		} else {
			const note = await db.notes.get(1);
			return note?.content || '';
		}
	} catch (error) {
		console.error('[Storage] Failed to load note:', error);
		// Fallback to localStorage
		try {
			return localStorage.getItem('cs_note') || '';
		} catch {
			return '';
		}
	}
}

export async function saveNote(content: string): Promise<void> {
	try {
		await ensureDbInitialized();
		if (!isExtensionPage()) {
			await callBackground('storage:saveNote', { content });
		} else {
			await db.notes.put({
				id: 1,
				content,
				updatedAt: Date.now()
			});
		}
	} catch (error) {
		console.error('[Storage] Failed to save note:', error);
		// Fallback to localStorage only
		try {
			localStorage.setItem('cs_note', content);
		} catch {
			// ignore
		}
	}
}

export type PanelLayout = {
	x: number;
	y: number;
	width: number;
	height: number;
	visible: boolean;
	minimized?: boolean;
};

export type FloatingButtonLayout = {
	x: number;
	y: number;
};

export async function loadLayout(): Promise<Partial<PanelLayout>> {
	try {
		await ensureDbInitialized();
		if (!isExtensionPage()) {
			const res = await callBackground<Partial<PanelLayout>>('storage:getLayout');
			return res ?? {};
		} else {
			const layout = await db.layout.get(1);
			if (!layout) return {};
			// Remove id from result
			const { id, ...layoutData } = layout;
			return layoutData;
		}
	} catch (error) {
		console.error('[Storage] Failed to load layout:', error);
		// Fallback to localStorage
		try {
			const raw = localStorage.getItem('cs_layout');
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	}
}

export async function saveLayout(layout: Partial<PanelLayout>): Promise<void> {
	try {
		await ensureDbInitialized();
		if (!isExtensionPage()) {
			await callBackground('storage:saveLayout', { layout });
		} else {
			await db.layout.put({
				id: 1,
				...layout
			});
		}
	} catch (error) {
		console.error('[Storage] Failed to save layout:', error);
		// Fallback to localStorage only
		try {
			localStorage.setItem('cs_layout', JSON.stringify(layout));
		} catch {
			// ignore
		}
	}
}

export async function loadButtonLayout(): Promise<Partial<FloatingButtonLayout>> {
	try {
		await ensureDbInitialized();
		if (!isExtensionPage()) {
			const res = await callBackground<Partial<FloatingButtonLayout>>('storage:getButtonLayout');
			return res ?? {};
		} else {
			const buttonLayout = await db.buttonLayout.get(1);
			if (!buttonLayout) return {};
			// Remove id from result
			const { id, ...layoutData } = buttonLayout;
			return layoutData;
		}
	} catch (error) {
		console.error('[Storage] Failed to load button layout:', error);
		// Fallback to localStorage
		try {
			const raw = localStorage.getItem('cs_button_layout');
			return raw ? JSON.parse(raw) : {};
		} catch {
			return {};
		}
	}
}

export async function saveButtonLayout(layout: Partial<FloatingButtonLayout>): Promise<void> {
	try {
		await ensureDbInitialized();
		if (!isExtensionPage()) {
			await callBackground('storage:saveButtonLayout', { layout });
		} else {
			await db.buttonLayout.put({
				id: 1,
				...layout
			});
		}
	} catch (error) {
		console.error('[Storage] Failed to save button layout:', error);
		// Fallback to localStorage only
		try {
			localStorage.setItem('cs_button_layout', JSON.stringify(layout));
		} catch {
			// ignore
		}
	}
}
