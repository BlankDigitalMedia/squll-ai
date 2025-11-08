<script lang="ts">
	import { onMount } from 'svelte';
	import { loadButtonLayout, saveButtonLayout, type FloatingButtonLayout } from '@/storage';

	type Props = {
		onToggle?: () => void;
	};

	let { onToggle }: Props = $props();

	let button: HTMLButtonElement | null = $state(null);
	let isDragging = $state(false);
	let hasDragged = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let initialDragPosition = $state({ x: 0, y: 0 });
	let hostElement: HTMLElement | null = $state(null);
	let position = $state({ x: 0, y: 0 });

	function handleDragStart(e: MouseEvent) {
		if (!button) return;
		isDragging = true;
		hasDragged = false;
		const rect = button.getBoundingClientRect();
		dragStart = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
		initialDragPosition = { x: e.clientX, y: e.clientY };
		e.preventDefault();
		e.stopPropagation();
	}

	function handleMouseMove(e: MouseEvent) {
		if (isDragging && button && hostElement) {
			const newX = e.clientX - dragStart.x;
			const newY = e.clientY - dragStart.y;
			const buttonSize = 56; // Button diameter
			const constrainedX = Math.max(0, Math.min(newX, window.innerWidth - buttonSize));
			const constrainedY = Math.max(0, Math.min(newY, window.innerHeight - buttonSize));
			
			// Check if mouse actually moved from initial position
			if (Math.abs(e.clientX - initialDragPosition.x) > 5 || Math.abs(e.clientY - initialDragPosition.y) > 5) {
				hasDragged = true;
			}
			
			position.x = constrainedX;
			position.y = constrainedY;
			hostElement.style.left = `${constrainedX}px`;
			hostElement.style.top = `${constrainedY}px`;
		}
	}

	function handleMouseUp() {
		if (isDragging) {
			if (hostElement && position.x !== undefined && position.y !== undefined) {
				saveButtonLayout({
					x: position.x,
					y: position.y
				});
			}
		}
		isDragging = false;
	}

	function handleClick(e: MouseEvent) {
		// Only toggle if we didn't just drag
		if (!hasDragged && onToggle) {
			onToggle();
		}
		// Reset flag for next interaction
		hasDragged = false;
	}

	onMount(() => {
		hostElement = document.getElementById('button-root');
		
		if (!hostElement) return;

		loadButtonLayout().then((layout) => {
			const defaultLayout = {
				x: window.innerWidth * 0.02, // 2% from left
				y: window.innerHeight * 0.9 // 90% from top (near bottom)
			};

			const finalLayout = { ...defaultLayout, ...layout };

			if (finalLayout.x !== undefined && finalLayout.y !== undefined) {
				position.x = finalLayout.x;
				position.y = finalLayout.y;
				hostElement!.style.left = `${finalLayout.x}px`;
				hostElement!.style.top = `${finalLayout.y}px`;
			}
		});

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);

		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	});
</script>

<button
	bind:this={button}
	class="floating-button"
	class:dragging={isDragging}
	onmousedown={handleDragStart}
	onclick={handleClick}
	tabindex="0"
	aria-label="Toggle note panel"
>
	B
</button>

<style>
	.floating-button {
		position: absolute;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: rgba(45, 45, 45, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: white;
		font-size: 24px;
		font-weight: 600;
		cursor: move;
		display: flex;
		align-items: center;
		justify-content: center;
		user-select: none;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition: transform 0.1s ease, box-shadow 0.1s ease;
		padding: 0;
		margin: 0;
		outline: none;
	}

	.floating-button:hover {
		transform: scale(1.05);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
	}

	.floating-button:active {
		transform: scale(0.98);
	}

	.floating-button.dragging {
		cursor: grabbing;
		transform: scale(1.05);
	}
</style>

