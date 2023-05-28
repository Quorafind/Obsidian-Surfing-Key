import {App, Modal, Plugin } from 'obsidian';
import ElementMonitor from "./surfingKey";

export default class SurfingKeyPlugin extends Plugin {
	documentMonitor: ElementMonitor;

	async onload() {
		this.addCommand({
			id: 'surfing-obsidian',
			name: 'Surfing Obsidian',
			callback: () => {
				this.documentMonitor = new ElementMonitor(document, this);
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


export class SurfingKeyModal extends Modal {
	private plugin: SurfingKeyPlugin;
	private elementMonitor: ElementMonitor;

	constructor(app: App, plugin: SurfingKeyPlugin, elementMonitor: ElementMonitor) {
		super(app);

		this.app = app;
		this.plugin = plugin;
		this.elementMonitor = elementMonitor;
	}

	onOpen() {
		this.containerEl.addEventListener('click', ()=>{
			this.close();
		})
	}

	onClose() {
		this.containerEl.empty();
		if (!this.elementMonitor.removed) { // 添加条件检查，如果已经移除就不再调用removeOverlay
			this.elementMonitor.removeOverlay();
		}
	}
}
