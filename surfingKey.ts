class UniqueStrings {
	private usedStrings: Set<string> = new Set();
	private index: number = 0;
	private characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	generateUniqueString(): string {
		let result = "";

		while (this.usedStrings.has(result) || result === "") {
			this.index++;
			let currentIndex = this.index;
			result = "";
			for (let i = 0; i < 3; i++) {
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
		const overlay = document.createElement('div');
		overlay.style.position = 'absolute';
		overlay.style.top = '0';
		overlay.style.left = '0';
		overlay.style.width = '100%';
		overlay.style.height = '100%';
		overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
		overlay.style.zIndex = '99999';
		overlay.style.pointerEvents = 'none';
		return overlay;
	}

	attachStringsToElements(): void {
		const queue: Element[] = [this.doc.documentElement];
		while (queue.length > 0) {
			const element = queue.shift();
			if (!element) {
				continue;
			}

			queue.push(...Array.from(element.children));

			const uniqueString = this.uniqueStrings.generateUniqueString();
			this.elementsWithUniqueStrings.set(uniqueString, element);

			const elementPosition = element.getBoundingClientRect();

			const stringElement = document.createElement('span');
			stringElement.textContent = uniqueString;
			stringElement.style.position = 'absolute';
			stringElement.style.top = `${elementPosition.top}px`;
			stringElement.style.left = `${elementPosition.left}px`;
			stringElement.style.zIndex = '100000';
			stringElement.style.pointerEvents = 'none';

			this.overlay.appendChild(stringElement);
		}
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

			const input = e.key.toUpperCase();
			if (inputQueue.length >= 3) {
				inputQueue.shift();
			}
			inputQueue.push(input);

			const inputString = inputQueue.join('');
			if (this.elementsWithUniqueStrings.has(inputString)) {
				this.elementsWithUniqueStrings.get(inputString)?.dispatchEvent(new Event('click'));
				this.removeOverlay();
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
