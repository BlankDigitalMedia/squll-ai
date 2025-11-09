const notesUrl = chrome.runtime.getURL('notes.html');

// Centralized Dexie-backed storage in the extension origin
import { db } from '@/storage/db';

let dbOpened = false;
async function ensureDbOpen(): Promise<void> {
	if (dbOpened) return;
	await db.open();
	dbOpened = true;
}

function stripId<T extends { id: number }>(obj: T): Omit<T, 'id'> {
	const { id, ...rest } = obj;
	return rest;
}

chrome.action.onClicked.addListener(async () => {
	const tabs = await chrome.tabs.query({ url: notesUrl });
	if (tabs[0]?.id) {
		await chrome.tabs.update(tabs[0].id, { active: true });
	} else {
		await chrome.tabs.create({ url: notesUrl });
	}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		try {
			if (message.type === 'close-notes-tab' && sender.tab?.id) {
				await chrome.tabs.remove(sender.tab.id).catch(() => {
					// Ignore errors if tab is already closed
				});
				sendResponse({ ok: true });
				return;
			}

			// Storage bridge
			if (message.type?.startsWith('storage:')) {
				await ensureDbOpen();
				switch (message.type) {
					case 'storage:getNote': {
						const note = await db.notes.get(1);
						sendResponse({ content: note?.content ?? '' });
						return;
					}
					case 'storage:saveNote': {
						const { content } = message.payload ?? {};
						await db.notes.put({ id: 1, content: content ?? '', updatedAt: Date.now() });
						sendResponse({ ok: true });
						return;
					}
					case 'storage:getLayout': {
						const layout = await db.layout.get(1);
						if (!layout) {
							sendResponse({});
						} else {
							sendResponse(stripId(layout));
						}
						return;
					}
					case 'storage:saveLayout': {
						const { layout } = message.payload ?? {};
						await db.layout.put({ id: 1, ...(layout ?? {}) });
						sendResponse({ ok: true });
						return;
					}
					case 'storage:getButtonLayout': {
						const bl = await db.buttonLayout.get(1);
						if (!bl) {
							sendResponse({});
						} else {
							sendResponse(stripId(bl));
						}
						return;
					}
					case 'storage:saveButtonLayout': {
						const { layout } = message.payload ?? {};
						await db.buttonLayout.put({ id: 1, ...(layout ?? {}) });
						sendResponse({ ok: true });
						return;
					}
					default:
						sendResponse({ error: 'Unknown storage action' });
						return;
				}
			}

			// Default no-op
			sendResponse({ ok: true });
		} catch (error) {
			sendResponse({ error: String(error) });
		}
	})();
	return true; // keep channel open for async response
});

