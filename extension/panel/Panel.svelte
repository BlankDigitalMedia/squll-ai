<script lang="ts">
	import { onMount } from 'svelte';
	import { loadNote, saveNote, saveLayout, type PanelLayout } from '@/storage';

	type Props = {
		tabMode?: boolean;
		onLayoutChange?: (layout: Partial<PanelLayout>) => void;
		onMinimize?: () => void;
	};

	let { tabMode = false, onLayoutChange, onMinimize }: Props = $props();

	let content = $state('');
	let editor: HTMLDivElement | null = $state(null);
	let isDragging = $state(false);
	let isResizing = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let resizeStart = $state({ x: 0, y: 0, width: 0, height: 0 });
	let panel: HTMLDivElement | null = $state(null);
	let hostElement: HTMLElement | null = $state(null);

	let saveTimeout: ReturnType<typeof setTimeout> | null = null;

	function debouncedSave(text: string) {
		if (saveTimeout) clearTimeout(saveTimeout);
		saveTimeout = setTimeout(() => {
			saveNote(text);
		}, 300);
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLDivElement;
		content = target.innerText || '';
		debouncedSave(content);
	}

	function handleDragStart(e: MouseEvent) {
		if (!panel || tabMode) return;
		isDragging = true;
		const rect = panel.getBoundingClientRect();
		dragStart = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
		e.preventDefault();
		e.stopPropagation();
	}

	function handleResizeStart(e: MouseEvent) {
		if (!panel || tabMode) return;
		isResizing = true;
		const rect = panel.getBoundingClientRect();
		resizeStart = {
			x: e.clientX,
			y: e.clientY,
			width: rect.width,
			height: rect.height
		};
		e.preventDefault();
		e.stopPropagation();
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging && panel && hostElement) {
			const newX = e.clientX - dragStart.x;
			const newY = e.clientY - dragStart.y;
			hostElement.style.left = `${Math.max(0, Math.min(newX, window.innerWidth - 100))}px`;
			hostElement.style.top = `${Math.max(0, Math.min(newY, window.innerHeight - 100))}px`;
		}

		if (isResizing && panel && hostElement) {
			const deltaX = e.clientX - resizeStart.x;
			const deltaY = e.clientY - resizeStart.y;
			const newWidth = resizeStart.width + deltaX;
			const newHeight = resizeStart.height + deltaY;
			hostElement.style.width = `${Math.max(300, newWidth)}px`;
			hostElement.style.height = `${Math.max(200, newHeight)}px`;
		}
	}

	function handleMouseUp() {
		if (isDragging || isResizing) {
			if (hostElement && onLayoutChange) {
				const rect = hostElement.getBoundingClientRect();
				onLayoutChange({
					x: rect.left,
					y: rect.top,
					width: rect.width,
					height: rect.height
				});
			}
		}
		isDragging = false;
		isResizing = false;
	}

	function handleMinimize() {
		if (tabMode) {
			chrome.runtime.sendMessage({ type: 'close-notes-tab' }).catch(() => {
				// Ignore errors if background script is not available
			});
		} else if (onMinimize) {
			onMinimize();
		}
	}

	onMount(() => {
		if (!tabMode) {
			hostElement = document.getElementById('extension-root');
		}

		loadNote().then((savedContent) => {
			content = savedContent;
			if (editor && savedContent) {
				editor.textContent = savedContent;
			}
		});

		if (!tabMode) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
		}

		return () => {
			if (!tabMode) {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			}
			if (saveTimeout) clearTimeout(saveTimeout);
		};
	});
</script>

<div
	bind:this={panel}
	class="panel"
	class:dragging={isDragging}
	class:resizing={isResizing}
>
	<div class="header" onmousedown={handleDragStart} role="button" tabindex="0" aria-label={tabMode ? "Notes header" : "Drag to move panel"} class:tab-mode={tabMode}>
		<div class="header-title">Notes</div>
		<button
			class="minimize-button"
			onclick={(e) => {
				e.stopPropagation();
				handleMinimize();
			}}
			aria-label={tabMode ? "Close tab" : "Minimize panel"}
			title={tabMode ? "Close" : "Minimize"}
		>
			−
		</button>
	</div>
	<div class="editor-container">
		<div
			bind:this={editor}
			class="editor"
			contenteditable="true"
			oninput={handleInput}
			role="textbox"
			aria-label="Note editor"
		>
		</div>
	</div>
	{#if !tabMode}
		<div class="resize-handle" onmousedown={handleResizeStart} role="button" tabindex="0" aria-label="Resize panel"></div>
	{/if}
</div>

<style>
	.panel {
		position: relative;
		width: 100%;
		height: 100%;
		background: rgba(255, 255, 255, 0.25);
		backdrop-filter: blur(24px) saturate(180%);
		-webkit-backdrop-filter: blur(24px) saturate(180%);
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.2);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), 
			inset 0 1px 0 rgba(255, 255, 255, 0.3);
		display: flex;
		flex-direction: column;
		min-width: 300px;
		min-height: 200px;
		overflow: hidden;
		color: #000000;
	}

	:global(.notes-tab-container .panel) {
		border-radius: 0;
		border: none;
		min-width: 0;
		min-height: 0;
	}

	.panel.dragging {
		cursor: move;
	}

	.panel.resizing {
		cursor: nwse-resize;
	}

	.header {
		background: rgba(255, 255, 255, 0.15);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		padding: 12px 16px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.1);
		cursor: move;
		user-select: none;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.header.tab-mode {
		cursor: default;
	}

	.header-title {
		font-size: 14px;
		font-weight: 500;
		color: rgba(0, 0, 0, 0.85);
		text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
		flex: 1;
	}

	.minimize-button {
		background: transparent;
		border: none;
		color: rgba(0, 0, 0, 0.7);
		font-size: 18px;
		font-weight: 600;
		line-height: 1;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 4px;
		transition: background-color 0.15s ease, color 0.15s ease;
		flex-shrink: 0;
		outline: none;
	}

	.minimize-button:hover {
		background: rgba(0, 0, 0, 0.1);
		color: rgba(0, 0, 0, 0.9);
	}

	.minimize-button:active {
		background: rgba(0, 0, 0, 0.15);
	}

	.editor-container {
		flex: 1;
		overflow: auto;
		padding: 24px;
		background: rgba(255, 255, 255, 0.05);
		color: #000000;
	}

	.editor {
		width: 100%;
		min-height: 100%;
		outline: none;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue',
			Arial, sans-serif;
		font-size: 16px;
		line-height: 1.6;
		color: #000000 !important;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.editor:focus {
		outline: none;
	}

	.editor:empty:before {
		content: 'Start typing...';
		color: rgba(0, 0, 0, 0.5) !important;
	}

	.resize-handle {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 20px;
		height: 20px;
		cursor: nwse-resize;
		background: linear-gradient(-45deg, transparent 40%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 0.3) 50%, transparent 50%);
	}

	.resize-handle:hover {
		background: linear-gradient(-45deg, transparent 40%, rgba(0, 0, 0, 0.5) 40%, rgba(0, 0, 0, 0.5) 50%, transparent 50%);
	}
</style>

