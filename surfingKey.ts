import { Keymap } from "obsidian";

class UniqueStrings {
	private usedStrings: Set<string> = new Set();
	private index: number = 0;
	private characters = "QWERTASDFGZXCVB";

	generateUniqueString(): string {
		let result = "";

		while (this.usedStrings.has(result) || result === "") {
			this.index++;
			let currentIndex = this.index;
			result = "";
			for (let i = 0; i < 2; i++) {
				const charIndex = currentIndex % this.characters.length;
				result += this.characters.charAt(charIndex);
				currentIndex = Math.floor(currentIndex / this.characters.length);
			}
		}

		this.usedStrings.add(result);
		return result;
	}
}

export default class ElementMonitor {
	private doc: Document;
	private overlay: HTMLElement;
	private uniqueStrings: UniqueStrings;
	private elementsWithUniqueStrings: Map<string, Element> = new Map();
	private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

	constructor(doc: Document) {
		this.doc = doc;
		this.uniqueStrings = new UniqueStrings();
		this.overlay = this.createOverlay();
	}

	private createOverlay(): HTMLElement {
		const overlay = document.body.createDiv({
			cls: 'surfing-key-overlay',
		});

		overlay.createDiv({
			cls: 'inputDisplay',
			attr: {
				id: 'inputDisplay',
			}
		});
		return overlay;
	}

	attachStringsToElements(): void {
		const processQueue = (queue: HTMLElement[]) => {
			if (!queue.length) return;
			const element = queue.shift();
			if (!element) {
				processQueue(queue);
				return;
			}

			const pushChildren = (child: HTMLElement) => {
				queue.push(child);
				if (child instanceof SVGSVGElement) return true;
				return !!(child.nodeType === Node.TEXT_NODE && child.textContent?.trim() && child.textContent !== "/");
			};

			const hasSvgOrTextContentChild = Array.from(element.childNodes).some(pushChildren);
			if (hasSvgOrTextContentChild) {
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
			processQueue(queue);
		};
		processQueue([this.doc.documentElement]);
		this.doc.body.appendChild(this.overlay);
	}



	monitorUserInput(): void {
		const inputQueue: string[] = [];
		this.keydownHandler = (e) => {
			e.stopPropagation();
			e.preventDefault();

			if (e.key === 'Escape') {
				this.removeOverlay();
				return;
			}

			if (Keymap.isModifier(e, 'Mod') || Keymap.isModifier(e, 'Shift') || Keymap.isModifier(e, 'Alt')) {
				return;
			}

			if(!(/^[qwertasdfgzxcvbQWERTASDFGZXCVB]$/i.test(e.key))) {
				if(e.key === 'Backspace' || e.key === 'Delete') {
					inputQueue.pop();
					// 当删除输入的字符串后，重新显示所有隐藏的元素
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
					// 当输入的字符串没有命中时，隐藏相关的元素
					span.hide();
				}
			});

			if (this.elementsWithUniqueStrings.has(inputString)) {
				let elementToClick = this.elementsWithUniqueStrings.get(inputString);

				if (elementToClick instanceof SVGSVGElement && elementToClick.parentElement) {
					elementToClick = elementToClick.parentElement;
				}

				this.removeOverlay();
				elementToClick?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			}
		};

		window.addEventListener('keydown', this.keydownHandler);
	}


	init(): void {
		this.attachStringsToElements();
		this.monitorUserInput();
		this.doc.addEventListener('click', (e) => {
			if (e.target === this.doc.body) {
				this.removeOverlay();
			}
		});
	}

	removeOverlay(): void {
		this.overlay.remove();
		if (this.keydownHandler) {
			window.removeEventListener('keydown', this.keydownHandler);
			this.keydownHandler = null;
		}
	}
}

