import { mount } from 'svelte';
import NotesTab from './panel/NotesTab.svelte';

const app = document.getElementById('app');
if (app) {
	mount(NotesTab, { target: app });
}

