import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function copyRecursive(src: string, dest: string) {
	mkdirSync(dest, { recursive: true });
	const entries = readdirSync(src, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = resolve(src, entry.name);
		const destPath = resolve(dest, entry.name);
		if (entry.isDirectory()) {
			copyRecursive(srcPath, destPath);
		} else {
			copyFileSync(srcPath, destPath);
		}
	}
}

// Common resolve aliases used across builds
const commonResolve = {
	alias: {
		'@': resolve(__dirname, '../src')
	}
};

// 1) Build content-script as a single-file IIFE (no imports)
const contentScriptConfig = defineConfig({
	plugins: [svelte({ emitCss: true, compilerOptions: { css: 'external' } })],
	resolve: commonResolve,
	esbuild: { charset: 'ascii' },
	build: {
		outDir: resolve(__dirname, 'dist'),
		emptyOutDir: true,
		cssCodeSplit: true,
		rollupOptions: {
			input: {
				'content-script': resolve(__dirname, 'content-script.ts')
			},
			output: {
				entryFileNames: '[name].js',
				assetFileNames: (assetInfo) => {
					// Force deterministic CSS filename for the content script entry
					if (assetInfo.name === 'style.css') return 'content-script.css';
					return '[name].[ext]';
				},
				format: 'iife',
				// Single entry → allowed
				inlineDynamicImports: true,
				manualChunks: undefined
			}
		}
	}
});

// 2) Build background as a single-file IIFE (no imports)
const backgroundConfig = defineConfig({
	plugins: [svelte({ emitCss: true, compilerOptions: { css: 'external' } })],
	resolve: commonResolve,
	esbuild: { charset: 'ascii' },
	build: {
		outDir: resolve(__dirname, 'dist'),
		emptyOutDir: false,
		cssCodeSplit: true,
		rollupOptions: {
			input: {
				background: resolve(__dirname, 'background.ts')
			},
			output: {
				entryFileNames: '[name].js',
				assetFileNames: (assetInfo) => {
					// Background shouldn't have component CSS, but keep deterministic naming if it does
					if (assetInfo.name === 'style.css') return 'background.css';
					return '[name].[ext]';
				},
				format: 'iife',
				// Single entry → allowed
				inlineDynamicImports: true,
				manualChunks: undefined
			}
		}
	}
});

// 3) Build notes tab as a single-file IIFE (loaded via <script src="notes.js">)
// Copy manifest, notes.html and icons in this final step
	const notesTabConfig = defineConfig({
	plugins: [
		svelte({ emitCss: true, compilerOptions: { css: 'external' } }),
		{
			name: 'copy-assets',
			writeBundle() {
				const distDir = resolve(__dirname, 'dist');
				mkdirSync(distDir, { recursive: true });
				copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'));
				copyFileSync(resolve(__dirname, 'notes.html'), resolve(distDir, 'notes.html'));
				// Copy icons folder
				const iconsSrc = resolve(__dirname, 'icons');
				const iconsDest = resolve(distDir, 'icons');
				if (statSync(iconsSrc).isDirectory()) {
					copyRecursive(iconsSrc, iconsDest);
				}
			}
		}
	],
	resolve: commonResolve,
	esbuild: { charset: 'ascii' },
	build: {
		outDir: resolve(__dirname, 'dist'),
		emptyOutDir: false,
		cssCodeSplit: true,
		rollupOptions: {
			input: {
				notes: resolve(__dirname, 'notes.ts')
			},
			output: {
				entryFileNames: '[name].js',
				assetFileNames: (assetInfo) => {
					// Force deterministic CSS filename for notes tab entry
					if (assetInfo.name === 'style.css') return 'notes.css';
					return '[name].[ext]';
				},
				format: 'iife',
				// Single entry → allowed
				inlineDynamicImports: true,
				manualChunks: undefined
			}
		}
	}
});

export default defineConfig(() => {
	const target = process.env.EXT_TARGET || 'content-script';
	if (target === 'content-script') return contentScriptConfig;
	if (target === 'background') return backgroundConfig;
	if (target === 'notes') return notesTabConfig;
	return contentScriptConfig;
});
