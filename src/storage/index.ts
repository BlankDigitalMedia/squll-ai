function isExtensionContextValid(): boolean {
	try {
		// chrome.runtime.id is only available when the extension context is valid
		return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
	} catch {
		return false;
	}
}

export async function loadNote(): Promise<string> {
	return new Promise((resolve) => {
		try {
			if (!isExtensionContextValid()) {
				resolve(localStorage.getItem('cs_note') || '');
				return;
			}
			chrome.storage.sync.get(['content'], (res) => {
				if (chrome.runtime?.lastError) {
					resolve(localStorage.getItem('cs_note') || '');
					return;
				}
				resolve(res.content || '');
			});
		} catch {
			resolve(localStorage.getItem('cs_note') || '');
		}
	});
}

export async function saveNote(content: string): Promise<void> {
	try {
		if (!isExtensionContextValid()) {
			localStorage.setItem('cs_note', content);
			return;
		}
		await chrome.storage.sync.set({ content });
	} catch {
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
	return new Promise((resolve) => {
		const fallback = () => {
			try {
				const raw = localStorage.getItem('cs_layout');
				resolve(raw ? JSON.parse(raw) : {});
			} catch {
				resolve({});
			}
		};
		try {
			if (!isExtensionContextValid()) {
				fallback();
				return;
			}
			chrome.storage.sync.get(['layout'], (res) => {
				if (chrome.runtime?.lastError) {
					fallback();
					return;
				}
				resolve(res.layout || {});
			});
		} catch {
			fallback();
		}
	});
}

export async function saveLayout(layout: Partial<PanelLayout>): Promise<void> {
	try {
		if (!isExtensionContextValid()) {
			localStorage.setItem('cs_layout', JSON.stringify(layout));
			return;
		}
		await chrome.storage.sync.set({ layout });
	} catch {
		try {
			localStorage.setItem('cs_layout', JSON.stringify(layout));
		} catch {
			// ignore
		}
	}
}

export async function loadButtonLayout(): Promise<Partial<FloatingButtonLayout>> {
	return new Promise((resolve) => {
		const fallback = () => {
			try {
				const raw = localStorage.getItem('cs_button_layout');
				resolve(raw ? JSON.parse(raw) : {});
			} catch {
				resolve({});
			}
		};
		try {
			if (!isExtensionContextValid()) {
				fallback();
				return;
			}
			chrome.storage.sync.get(['buttonLayout'], (res) => {
				if (chrome.runtime?.lastError) {
					fallback();
					return;
				}
				resolve(res.buttonLayout || {});
			});
		} catch {
			fallback();
		}
	});
}

export async function saveButtonLayout(layout: Partial<FloatingButtonLayout>): Promise<void> {
	try {
		if (!isExtensionContextValid()) {
			localStorage.setItem('cs_button_layout', JSON.stringify(layout));
			return;
		}
		await chrome.storage.sync.set({ buttonLayout: layout });
	} catch {
		try {
			localStorage.setItem('cs_button_layout', JSON.stringify(layout));
		} catch {
			// ignore
		}
	}
}

