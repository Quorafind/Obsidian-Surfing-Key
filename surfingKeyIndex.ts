import {App, Keymap, Modal, Plugin} from 'obsidian';
import ElementMonitor from "./surfingKey";

export default class SurfingKeyPlugin extends Plugin {
	documentMonitor: ElementMonitor | null = null;
	private lastKeypressTime = 0;
	private keyComboPressed = false;

	async onload() {
		this.addCommand({
			id: 'surfing-obsidian',
			name: 'Surfing Obsidian',
			callback: () => {
				if(!this.documentMonitor) {
					this.documentMonitor = new ElementMonitor(activeDocument, ()=>{
						this.documentMonitor = null;
					}, this);
					this.documentMonitor.init();
				}
			}
		});

		this.registerDomEvent(window, 'keydown', (event: KeyboardEvent) => {
			let focusedElement: Document | HTMLElement = activeDocument;
			if(!activeDocument.querySelector('.modal-container')) {
				return;
			} else {
				focusedElement = activeDocument.querySelector('.modal-container') as HTMLElement;
			}
			if (Keymap.isModEvent(event) && event.key === 'g') {
				const currentTime = new Date().getTime();

				// Check if the last keypress was less than 1000ms ago
				if (currentTime - this.lastKeypressTime <= 1000) {
					if (!this.keyComboPressed) {
						if(!this.documentMonitor) {
							this.documentMonitor = new ElementMonitor(focusedElement,()=>{
								this.documentMonitor = null;
							}, this);
							this.documentMonitor.init();
						}
						this.keyComboPressed = true;
					}
				} else {
					this.keyComboPressed = false;
				}

				this.lastKeypressTime = currentTime;

				// Set keyComboPressed back to false after 1 second, regardless of its current value
				setTimeout(()=>{
					this.keyComboPressed = false;
				}, 1000);
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
