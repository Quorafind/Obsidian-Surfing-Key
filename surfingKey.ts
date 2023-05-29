import { Keymap } from "obsidian";
import SurfingKeyPlugin, {SurfingKeyModal} from "./surfingKeyIndex";

class UniqueStrings {
	private usedStrings: Set<string> = new Set();
	private twoCharIndex: number = 0;
	private threeCharIndex: number = 0;
	private threeCharFirstIndex: number = 0;
	private characters = "QWERTASDFGZXCVB";

	public usedChars: Set<string> = new Set();


	private findUnusedChar(): string {
		let result = "";
		let usedCharsArray = Array.from(this.usedChars);
		for (let i = 0; i < this.characters.length; i++) {
			if (!usedCharsArray.includes(this.characters.charAt(i))) {
				result = this.characters.charAt(i);
				break;
			}
		}
		return result;
	}

	generateUniqueString(): string {
		let result = "";

		if (this.usedStrings.size < 210) {
			if (this.twoCharIndex >= this.characters.length * this.characters.length - 15) {
				throw new Error("All possible two character strings have been generated!");
			}

			do {
				let firstChar = this.characters.charAt(Math.floor(this.twoCharIndex / this.characters.length));
				this.usedChars.add(firstChar);
				let secondChar = this.characters.charAt(this.twoCharIndex % this.characters.length);
				result = firstChar + secondChar;
				this.twoCharIndex++;
			} while (this.usedStrings.has(result));
		} else {
			if (this.usedStrings.size >= 210 + 225) {
				throw new Error("All possible strings have been generated!");
			}
			if (this.threeCharFirstIndex >= 225) {
				throw new Error("All possible three character strings have been generated!");
			}
			do {
				let firstChar = this.findUnusedChar();
				let secondChar = this.characters.charAt(Math.floor(this.threeCharIndex / this.characters.length));
				let thirdChar = this.characters.charAt(this.threeCharIndex % this.characters.length);

				result = firstChar + secondChar + thirdChar;

				this.threeCharIndex++;
				if (this.threeCharIndex >= this.characters.length * this.characters.length) {
					this.threeCharIndex = 0;
					this.threeCharFirstIndex++;
				}
			} while (this.usedStrings.has(result));
		}

		this.usedStrings.add(result);
		return result;
	}
}

export default class ElementMonitor {
	private plugin: SurfingKeyPlugin;
	private modal: SurfingKeyModal;

	private doc: Document | HTMLElement;
	private overlay: HTMLElement;
	private uniqueStrings: UniqueStrings;
	private elementsWithUniqueStrings: Map<string, Element> = new Map();
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

	removed: boolean = false;

	private cb: ()=> void;


	constructor(doc: Document | HTMLElement, cb: ()=> void, plugin: SurfingKeyPlugin) {
		this.doc = doc;
		this.plugin = plugin;
		this.uniqueStrings = new UniqueStrings();
		this.overlay = this.createOverlay();
		this.cb = cb;
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

		const rules = [
			(child: HTMLElement) => child instanceof SVGSVGElement && !child.classList?.contains('canvas-background') && !child.classList?.contains('canvas-edges') ? true : null,
			(child: HTMLElement) => child instanceof HTMLInputElement && child.type === "checkbox" ? true : null,
			(child: HTMLElement) => child.classList?.contains('canvas-node-label') ? false : null,
			(child: HTMLElement) => child.classList?.contains('canvas-node-container') ? true : null,
			// Add more rules as needed...
		];
		const processQueue = (queue: HTMLElement[]) => {
			if (!queue.length) return;
			const element = queue.shift();
			if (!element) {
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

				for (const rule of rules) {
					const result = rule(child);
					if (result !== null) {
						return result;
					}
				}

				// Default return value if no rules matched
				return !!(child.nodeType === Node.TEXT_NODE && child.textContent?.trim() && child.textContent !== "/");
			};


			const hasSvgOrTextContentChild = (Array.from(element.childNodes).some(pushChildren) || element.classList?.contains('canvas-color-picker-item') || (element instanceof HTMLInputElement && element.type === "search") || (element instanceof HTMLSelectElement)) && !element?.classList?.contains('canvas-icon-placeholder');
			if (hasSvgOrTextContentChild) {
				const style = window.getComputedStyle(element);
				if (style.display !== "none" && this.isElementInViewport(element)) {
					const elementPosition = element.getBoundingClientRect();
					if (elementPosition.top !== 0 || elementPosition.left !== 0) {
						const uniqueString = this.uniqueStrings.generateUniqueString();
						this.elementsWithUniqueStrings.set(uniqueString, element);

						const stringElement = this.overlay.createEl('span', {
							cls: 'surfing-key-string',
							attr: {
								id: uniqueString,
							}
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
		processQueue([this.doc instanceof Document ? this.doc.documentElement : this.doc]);
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
					// this.overlay.querySelectorAll('.surfing-key-string').forEach((span: HTMLSpanElement) => span.show());
					// Update here
					for (const [uniqueString, _] of this.elementsWithUniqueStrings.entries()) {
						const stringElement = document.getElementById(uniqueString);
						stringElement?.show();
					}
				}
				return;
			}

			const input = e.key.toUpperCase();

			if (inputQueue.length >= 2 && this.uniqueStrings.usedChars.has(inputQueue.join('')[0])) {
				inputQueue.shift();
			} else if (inputQueue.length >= 3) {
				inputQueue.shift();
			}
			inputQueue.push(input);

			const inputDisplay = this.overlay.querySelector('#inputDisplay');
			if (inputDisplay) {
				inputDisplay.textContent = inputQueue.join('');
			}

			const inputString = inputQueue.join('');

			// this.overlay.querySelectorAll('.surfing-key-string').forEach((span: HTMLSpanElement) => {
			// Update here
			for (const [uniqueString, _] of this.elementsWithUniqueStrings.entries()) {
				const stringElement = document.getElementById(uniqueString);
				if (stringElement && stringElement.textContent?.startsWith(inputString)) {
					stringElement.style.backgroundColor = 'yellow';
					stringElement.style.color = 'black';
				} else {
					stringElement?.hide();
				}
			}

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
					if(elementToClick instanceof HTMLInputElement) {
						if(document && document.activeElement !== elementToClick) {
							(document.activeElement as HTMLElement)?.blur();
						}
						setTimeout(()=>{
							(elementToClick as HTMLInputElement)?.focus();
						},0)
					}
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
			this.cb();
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

