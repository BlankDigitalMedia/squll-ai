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

export default defineConfig({
	plugins: [
		svelte(),
		{
			name: 'copy-assets',
			writeBundle() {
				const distDir = resolve(__dirname, 'dist');
				mkdirSync(distDir, { recursive: true });
				copyFileSync(
					resolve(__dirname, 'manifest.json'),
					resolve(distDir, 'manifest.json')
				);
				copyFileSync(
					resolve(__dirname, 'notes.html'),
					resolve(distDir, 'notes.html')
				);
				// Copy icons folder
				const iconsSrc = resolve(__dirname, 'icons');
				const iconsDest = resolve(distDir, 'icons');
				if (statSync(iconsSrc).isDirectory()) {
					copyRecursive(iconsSrc, iconsDest);
				}
			}
		}
	],
	resolve: {
		alias: {
			'@': resolve(__dirname, '../src')
		}
	},
	build: {
		outDir: resolve(__dirname, 'dist'),
		emptyOutDir: true,
			rollupOptions: {
			input: {
				background: resolve(__dirname, 'background.ts'),
				'content-script': resolve(__dirname, 'content-script.ts'),
				notes: resolve(__dirname, 'notes.ts')
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: '[name]-[hash].js',
				assetFileNames: '[name].[ext]'
			}
		}
	}
});

