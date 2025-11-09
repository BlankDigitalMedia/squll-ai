import { mount } from 'svelte';
import NotesTab from './panel/NotesTab.svelte';
import './notes.css';

const app = document.getElementById('app');
if (app) {
	mount(NotesTab, { target: app });
}

