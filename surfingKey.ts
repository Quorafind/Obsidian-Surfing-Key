import { Keymap } from "obsidian";
import SurfingKeyPlugin, {SurfingKeyModal} from "./surfingKeyIndex";

class UniqueStrings {
	private usedStrings: Set<string> = new Set();
	private index: number = 0;
	private secondIndex: number = 0;
	private characters = "QWERTASDFGZXCVB";

	generateUniqueString(): string {
		let result = "";
		do {
			const firstChar = this.characters.charAt(this.index);
			const secondChar = this.characters.charAt(this.secondIndex);
			result = firstChar + secondChar;
			this.advanceIndices();
		} while (this.usedStrings.has(result));

		this.usedStrings.add(result);
		return result;
	}

	private advanceIndices(): void {
		this.secondIndex++;
		if (this.secondIndex >= this.characters.length) {
			this.secondIndex = 0;
			this.index++;
			if (this.index >= this.characters.length) {
				this.index = 0; // We've exhausted all possible combinations.
			}
		}
	}
}


export default class ElementMonitor {
	private plugin: SurfingKeyPlugin;
	private modal: SurfingKeyModal;

	private doc: Document;
	private overlay: HTMLElement;
	private uniqueStrings: UniqueStrings;
	private elementsWithUniqueStrings: Map<string, Element> = new Map();
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

	removed: boolean = false;


	constructor(doc: Document, plugin: SurfingKeyPlugin) {
		this.doc = doc;
		this.plugin = plugin;
		this.uniqueStrings = new UniqueStrings();
		this.overlay = this.createOverlay();
	}

	private createOverlay(): HTMLElement {
		this.modal = new SurfingKeyModal(app, this.plugin, this);
		this.modal.open();
		this.modal.containerEl.empty();
		const overlay = this.modal.containerEl;
		overlay.addClasses(['surfing-key-overlay']);

		overlay.createDiv({
			cls: 'inputDisplay',
			attr: {
				id: 'inputDisplay',
			}
		});
		return overlay;
	}

	private isElementInViewport(el: Element): boolean {
		const rect = el.getBoundingClientRect();
		return (
			rect.top >= 0 &&
			rect.left >= 0 &&
			rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
			rect.right <= (window.innerWidth || document.documentElement.clientWidth)
		);
	}

	attachStringsToElements(): void {
		const processQueue = (queue: HTMLElement[]) => {
			if (!queue.length) return;
			const element = queue.shift();
			if (!element) {
				processQueue(queue);
				return;
			}

			if(element.classList?.contains('node-insert-event')) {
				processQueue(queue);
				return;
			}

			const pushChildren = (child: HTMLElement) => {
				// Get computed style of the child
				if (child instanceof Element) {
					const style = window.getComputedStyle(child as Element);
					// Ignore if the display property is "none"
					if (style.display === "none") {
						return false;
					}
				}
				queue.push(child);
				if (child instanceof SVGSVGElement && !child.classList?.contains('canvas-background') && !child.classList?.contains('canvas-edges') && !child.classList?.contains('lucide-align-left')) return true;
				else if (child.classList?.contains('canvas-node-container')) return true;
				return !!(child.nodeType === Node.TEXT_NODE && child.textContent?.trim() && child.textContent !== "/")
			};


			const hasSvgOrTextContentChild = Array.from(element.childNodes).some(pushChildren);
			if (hasSvgOrTextContentChild) {
				const style = window.getComputedStyle(element);
				if (style.display !== "none" && this.isElementInViewport(element)) {
					const elementPosition = element.getBoundingClientRect();
					if (elementPosition.top !== 0 || elementPosition.left !== 0) {
						const uniqueString = this.uniqueStrings.generateUniqueString();
						this.elementsWithUniqueStrings.set(uniqueString, element);

						const stringElement = this.overlay.createEl('span', {
							cls: 'surfing-key-string',
						});
						stringElement.textContent = uniqueString;

						const midPointX = elementPosition.left + elementPosition.width / 2;
						const midPointY = elementPosition.top + elementPosition.height / 2;

						const stringElementRect = stringElement.getBoundingClientRect();
						const overlayRect = this.overlay.getBoundingClientRect();
						const stringWidth = stringElementRect.width;
						const stringHeight = stringElementRect.height;

						const rightPosition = midPointX + stringWidth / 2;
						const bottomPosition = midPointY + stringHeight / 2;

						if (rightPosition > overlayRect.right) {
							stringElement.style.left = `${midPointX - stringWidth}px`;
						} else {
							stringElement.style.left = `${midPointX}px`;
						}

						if (bottomPosition > overlayRect.bottom) {
							stringElement.style.top = `${midPointY - stringHeight}px`;
						} else if (midPointY + stringHeight / 2 > overlayRect.bottom) {
							stringElement.style.top = `${midPointY - stringHeight}px`;
						} else {
							stringElement.style.top = `${midPointY - 2}px`;
						}
					}
				}
			}
			processQueue(queue);
		};
		processQueue([this.doc.documentElement]);
	}



	monitorUserInput(): void {
		const inputQueue: string[] = [];
		let isTickPressed = false;  // 初始化变量来捕获 '`' 字符输入
		this.keydownHandler = (e) => {
			if(!this.overlay) return;

			e.stopPropagation();
			e.preventDefault();

			if (e.key === 'Escape') {
				this.removeOverlay();
				return;
			}

			if (Keymap.isModifier(e, 'Mod') || Keymap.isModifier(e, 'Shift') || Keymap.isModifier(e, 'Alt')) {
				return;
			}

			// 判断 '`' 字符是否被按下
			if (e.key === '`') {
				isTickPressed = true;
				return;
			}

			if(!(/^[qwertasdfgzxcvbQWERTASDFGZXCVB]$/i.test(e.key))) {
				if(e.key === 'Backspace' || e.key === 'Delete') {
					inputQueue.pop();
					isTickPressed = false;
					const inputDisplay = this.overlay.querySelector('#inputDisplay');
					if (inputDisplay) {
						inputDisplay.textContent = inputQueue.join('');
					}
					this.overlay.querySelectorAll('span').forEach(span => span.show());
				}
				return;
			}

			const input = e.key.toUpperCase();
			if (inputQueue.length >= 2) {
				inputQueue.shift();
			}
			inputQueue.push(input);

			const inputDisplay = this.overlay.querySelector('#inputDisplay');
			if (inputDisplay) {
				inputDisplay.textContent = inputQueue.join('');
			}

			const inputString = inputQueue.join('');

			this.overlay.querySelectorAll('span').forEach(span => {
				if (span.textContent && span.textContent.startsWith(inputQueue.join(''))) {
					span.style.backgroundColor = 'yellow';
					span.style.color = 'black';
				} else {
					span.style.backgroundColor = '';
					span.hide();
				}
			});

			if (this.elementsWithUniqueStrings.has(inputString)) {
				let elementToClick = this.elementsWithUniqueStrings.get(inputString);

				if (elementToClick instanceof SVGSVGElement && elementToClick.parentElement) {
					elementToClick = elementToClick.parentElement;
				}

				this.removeOverlay();

				// 当 '`' 字符被按下时，触发右键点击，否则触发左键点击
				if (isTickPressed) {
					elementToClick?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: elementToClick.getBoundingClientRect().left + elementToClick.clientWidth / 2, clientY: elementToClick.getBoundingClientRect().top + elementToClick.clientHeight / 2}));
				} else {
					elementToClick?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				}
				isTickPressed = false;  // 重置状态
			}
		};

		window.addEventListener('keydown', this.keydownHandler, true);
	}




	init(): void {
		this.attachStringsToElements();
		this.monitorUserInput();
	}

	removeOverlay(): void {
		if (this.modal && !this.removed) {
			this.removed = true; // 设置状态为已移除，防止递归调用
			setTimeout(()=>{
				this.modal.close();
			}, 0);
		}
		if (this.keydownHandler) {
			window.removeEventListener('keydown', this.keydownHandler, true);
			this.keydownHandler = null;
		}
	}
}

