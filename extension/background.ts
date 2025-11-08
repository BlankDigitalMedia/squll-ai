chrome.action.onClicked.addListener(() => {
	chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
		if (tabs[0]?.id) {
			chrome.tabs.sendMessage(tabs[0].id, { type: 'toggle-panel' }).catch((error) => {
				// Content script might not be ready yet, try injecting it
				if (error.message.includes('Receiving end does not exist')) {
					chrome.scripting.executeScript({
						target: { tabId: tabs[0].id! },
						files: ['content-script.js']
					}).then(() => {
						// Wait a bit for the script to initialize, then send message
						setTimeout(() => {
							chrome.tabs.sendMessage(tabs[0].id!, { type: 'toggle-panel' }).catch(() => {
								// Ignore errors on retry
							});
						}, 100);
					}).catch(() => {
						// Ignore injection errors
					});
				}
			});
		}
	});
});

