import { db } from './db';

const MIGRATION_FLAG_KEY = 'cs_migrated_to_dexie';

function isExtensionContextValid(): boolean {
	try {
		return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
	} catch {
		return false;
	}
}

function checkMigrationFlag(): boolean {
	try {
		return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
	} catch {
		return false;
	}
}

function setMigrationFlag(): void {
	try {
		localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
	} catch (error) {
		console.warn('Failed to set migration flag:', error);
	}
}

export async function migrateFromChromeStorage(): Promise<void> {
	// Check if migration already completed
	if (checkMigrationFlag()) {
		return;
	}

	// Check if extension context is valid
	if (!isExtensionContextValid()) {
		return;
	}

	try {
		// Read data from chrome.storage.sync
		const data = await new Promise<{
			content?: string;
			layout?: any;
			buttonLayout?: any;
		}>((resolve, reject) => {
			chrome.storage.sync.get(['content', 'layout', 'buttonLayout'], (result) => {
				if (chrome.runtime?.lastError) {
					reject(chrome.runtime.lastError);
					return;
				}
				resolve(result);
			});
		});

		// Migrate data using a transaction for atomicity
		await db.transaction('rw', db.notes, db.layout, db.buttonLayout, async () => {
			// Migrate note content
			if (data.content !== undefined) {
				await db.notes.put({
					id: 1,
					content: data.content,
					updatedAt: Date.now()
				});
			}

			// Migrate panel layout
			if (data.layout !== undefined) {
				await db.layout.put({
					id: 1,
					...data.layout
				});
			}

			// Migrate button layout
			if (data.buttonLayout !== undefined) {
				await db.buttonLayout.put({
					id: 1,
					...data.buttonLayout
				});
			}
		}).catch((error) => {
			console.error('Migration transaction failed:', error);
			// Don't set migration flag if transaction failed
			throw error; // Re-throw to prevent flag from being set
		});

		// Set migration flag only after successful transaction
		setMigrationFlag();

		// Clear chrome.storage.sync after successful migration
		try {
			await chrome.storage.sync.remove(['content', 'layout', 'buttonLayout']);
		} catch (error) {
			console.warn('Failed to clear chrome.storage.sync after migration:', error);
			// Don't throw - migration was successful even if cleanup fails
		}
	} catch (error) {
		console.warn('Migration from chrome.storage.sync failed:', error);
		// Don't throw - allow app to continue with Dexie (will be empty)
	}
}

