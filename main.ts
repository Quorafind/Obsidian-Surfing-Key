import { Plugin } from 'obsidian';
import ElementMonitor from "./surfingKey";

export default class MyPlugin extends Plugin {

	async onload() {
		this.addCommand({
		    id: 'surfing-obsidian',
		    name: 'Surfing Obsidian',
		    callback: () => {
				const documentMonitor = new ElementMonitor(document);
				documentMonitor.init();
			}
		});
	}

	onunload() {

	}

}
