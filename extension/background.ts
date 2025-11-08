const notesUrl = chrome.runtime.getURL('notes.html');

chrome.action.onClicked.addListener(async () => {
	const tabs = await chrome.tabs.query({ url: notesUrl });
	if (tabs[0]?.id) {
		await chrome.tabs.update(tabs[0].id, { active: true });
	} else {
		await chrome.tabs.create({ url: notesUrl });
	}
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.type === 'close-notes-tab' && sender.tab?.id) {
		chrome.tabs.remove(sender.tab.id).catch(() => {
			// Ignore errors if tab is already closed
		});
	}
	return true;
});

