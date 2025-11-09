import Dexie, { type Table } from 'dexie';

export interface Note {
	id: number;
	content: string;
	updatedAt: number;
}

export interface Layout {
	id: number;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	visible?: boolean;
	minimized?: boolean;
}

export interface ButtonLayout {
	id: number;
	x?: number;
	y?: number;
}

class CrystalSkullDB extends Dexie {
	notes!: Table<Note>;
	layout!: Table<Layout>;
	buttonLayout!: Table<ButtonLayout>;

	constructor() {
		super('CrystalSkullDB');
		
		// Version 1: Initial schema
		this.version(1).stores({
			notes: '++id, content, updatedAt',
			layout: '++id, x, y, width, height, visible, minimized',
			buttonLayout: '++id, x, y'
		});
		
		// Future version example:
		// this.version(2).stores({
		//   notes: '++id, content, updatedAt, tags',
		//   layout: '++id, x, y, width, height, visible, minimized',
		//   buttonLayout: '++id, x, y'
		// }).upgrade(tx => {
		//   // Migration logic for version 2
		//   // Example: Add default 'tags' field to existing notes
		//   return tx.notes.toCollection().modify(note => {
		//     note.tags = [];
		//   });
		// });
	}
}

export const db = new CrystalSkullDB();

