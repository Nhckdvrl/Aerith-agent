export type SelectItem = {
	label: string;
	value: string;
};

export type SelectListState = {
	items: SelectItem[];
	selectedIndex: number;
};

export function createSelectList(items: SelectItem[]): SelectListState {
	return { items, selectedIndex: 0 };
}

export function moveSelection(state: SelectListState, direction: "up" | "down"): void {
	if (state.items.length === 0) {
		return;
	}
	const delta = direction === "up" ? -1 : 1;
	state.selectedIndex = (state.selectedIndex + delta + state.items.length) % state.items.length;
}

export function renderSelectList(state: SelectListState): { text: string; style?: string }[][] {
	return state.items.map((item, index) => {
		const selected = index === state.selectedIndex;
		return [
			{ text: selected ? "> " : "  ", style: selected ? "\u001b[1m" : undefined },
			{ text: item.label, style: selected ? "\u001b[1m\u001b[36m" : undefined },
		];
	});
}

export function getSelectedValue(state: SelectListState): string | undefined {
	return state.items[state.selectedIndex]?.value;
}
