import { fireEvent, within } from "@testing-library/react";

// SearchableSelect renders a combobox input + dropdown of divs instead of a
// native <select>, so tests pick options via mousedown rather than change events.
export function chooseSearchableOption(combobox: HTMLElement, optionLabel: string | RegExp) {
  const container = combobox.closest(".searchable-select-container") as HTMLElement;
  const wrapper = container.querySelector(".searchable-select-input-wrapper") as HTMLElement;
  fireEvent.mouseDown(wrapper);
  const dropdown = container.querySelector(".searchable-select-dropdown") as HTMLElement;
  fireEvent.mouseDown(within(dropdown).getByText(optionLabel));
}
