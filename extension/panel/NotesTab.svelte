<script lang="ts">
	import Panel from './Panel.svelte';

	function handleMinimize() {
		chrome.runtime.sendMessage({ type: 'close-notes-tab' }).catch(() => {
			// Ignore errors if background script is not available
		});
	}
</script>

<div class="notes-tab-container">
	<Panel tabMode={true} onMinimize={handleMinimize} />
</div>

<style>
	.notes-tab-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		background: rgba(255, 255, 255, 0.25);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
	}
</style>

