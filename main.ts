import { Plugin } from 'obsidian';
import ElementMonitor from "./surfingKey";

export default class MyPlugin extends Plugin {
	documentMonitor: ElementMonitor;

	async onload() {
		this.addCommand({
			id: 'surfing-obsidian',
			name: 'Surfing Obsidian',
			callback: () => {
				this.documentMonitor = new ElementMonitor(document);
				this.documentMonitor.init();
			}
		});
	}

	onunload() {
		if (this.documentMonitor) {
			this.documentMonitor.removeOverlay();
		}
	}
}
