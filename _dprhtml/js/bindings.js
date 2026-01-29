// DOM binding utilities to replace knockout data-bindings

/**
 * Bind an observable to an input's value (two-way binding)
 * @param {HTMLElement} element - The input element
 * @param {Function} observable - The observable to bind
 * @param {string} eventType - The event type ('change' or 'input')
 */
export function bindValue(element, observable, eventType = "change") {
	if (!element) return;

	const update = () => {
		element.value = observable() ?? "";
	};

	element.addEventListener(eventType, () => {
		observable(element.value);
	});

	observable.subscribe(update);
	update();
}

/**
 * Bind an observable to a text input (uses 'input' event for immediate updates)
 */
export function bindTextInput(element, observable) {
	bindValue(element, observable, "input");
}

/**
 * Bind an observable to a checkbox's checked state
 */
export function bindChecked(element, observable) {
	if (!element) return;

	const update = () => {
		element.checked = !!observable();
	};

	element.addEventListener("change", () => {
		observable(element.checked);
	});

	observable.subscribe(update);
	update();
}

/**
 * Bind an observable to an element's visibility
 */
export function bindVisible(element, observable) {
	if (!element) return;

	const update = () => {
		element.style.display = observable() ? "" : "none";
	};

	observable.subscribe(update);
	update();
}

/**
 * Bind an observable to an element's text content
 */
export function bindText(element, observable) {
	if (!element) return;

	const update = () => {
		element.textContent = observable() ?? "";
	};

	observable.subscribe(update);
	update();
}

/**
 * Bind an observable to an element's innerHTML
 */
export function bindHtml(element, observable) {
	if (!element) return;

	const update = () => {
		element.innerHTML = observable() ?? "";
	};

	observable.subscribe(update);
	update();
}

/**
 * Bind CSS classes to observables
 * @param {HTMLElement} element - The element
 * @param {Object} classMap - Map of class names to observables or functions
 */
export function bindCss(element, classMap) {
	if (!element) return;

	for (const [className, observableOrFn] of Object.entries(classMap)) {
		const update = () => {
			const value =
				typeof observableOrFn === "function" ? observableOrFn() : observableOrFn;
			element.classList.toggle(className, !!value);
		};

		if (typeof observableOrFn === "function" && observableOrFn.subscribe) {
			observableOrFn.subscribe(update);
		}
		update();
	}
}

/**
 * Bind a click handler to an element
 */
export function bindClick(element, handler, context = null) {
	if (!element) return;

	element.addEventListener("click", (event) => {
		if (context) {
			handler.call(context, context, event);
		} else {
			handler(event);
		}
	});
}

/**
 * Bind an observable to an element's disabled state (enable binding)
 */
export function bindEnable(element, observable) {
	if (!element) return;

	const update = () => {
		element.disabled = !observable();
	};

	observable.subscribe(update);
	update();
}

/**
 * Bind an observable to an element's disabled state (disable binding)
 */
export function bindDisable(element, observable) {
	if (!element) return;

	const update = () => {
		element.disabled = !!observable();
	};

	observable.subscribe(update);
	update();
}

/**
 * Bind attributes to observables
 * @param {HTMLElement} element - The element
 * @param {Object} attrMap - Map of attribute names to observables or values
 */
export function bindAttr(element, attrMap) {
	if (!element) return;

	for (const [attrName, observableOrValue] of Object.entries(attrMap)) {
		const update = () => {
			const value =
				typeof observableOrValue === "function"
					? observableOrValue()
					: observableOrValue;
			if (value === null || value === undefined) {
				element.removeAttribute(attrName);
			} else {
				element.setAttribute(attrName, value);
			}
		};

		if (
			typeof observableOrValue === "function" &&
			observableOrValue.subscribe
		) {
			observableOrValue.subscribe(update);
		}
		update();
	}
}

/**
 * Bind options to a select element
 * @param {HTMLSelectElement} element - The select element
 * @param {Function} optionsObservable - Observable array of options
 * @param {Object} config - Configuration object
 */
export function bindOptions(element, optionsObservable, config = {}) {
	if (!element) return;

	const {
		optionsText = null,
		optionsValue = null,
		value = null,
		valueAllowUnset = false,
	} = config;

	const updateOptions = () => {
		const options = optionsObservable();
		const currentValue = value ? value() : element.value;

		element.innerHTML = "";

		for (const option of options) {
			const optionElement = document.createElement("option");

			if (optionsValue) {
				optionElement.value =
					typeof optionsValue === "function"
						? optionsValue(option)
						: option[optionsValue];
			} else if (typeof option === "object") {
				optionElement.value = option.value ?? option;
			} else {
				optionElement.value = option;
			}

			if (optionsText) {
				optionElement.textContent =
					typeof optionsText === "function"
						? optionsText(option)
						: option[optionsText];
			} else if (typeof option === "object") {
				optionElement.textContent = option.label ?? option.text ?? option.value;
			} else {
				optionElement.textContent = option;
			}

			element.appendChild(optionElement);
		}

		// Restore value
		if (value) {
			const val = value();
			if (val !== undefined && val !== null) {
				element.value = val;
			}
		} else if (currentValue) {
			element.value = currentValue;
		}
	};

	optionsObservable.subscribe(updateOptions);
	updateOptions();

	// Bind value observable if provided
	if (value) {
		element.addEventListener("change", () => {
			value(element.value);
		});

		value.subscribe((newValue) => {
			if (newValue !== undefined && newValue !== null) {
				element.value = newValue;
			}
		});
	}
}

/**
 * Bind selected options to a multi-select element
 */
export function bindSelectedOptions(element, observable) {
	if (!element) return;

	const update = () => {
		const values = observable();
		const options = element.options;
		for (let i = 0; i < options.length; i++) {
			options[i].selected = values.includes(options[i].value);
		}
	};

	element.addEventListener("change", () => {
		const selected = [];
		const options = element.selectedOptions;
		for (let i = 0; i < options.length; i++) {
			selected.push(options[i].value);
		}
		observable(selected);
	});

	observable.subscribe(update);
	update();
}

/**
 * Bind a foreach template to an array observable
 * @param {HTMLElement} container - The container element
 * @param {Function} arrayObservable - The observable array
 * @param {Function} templateFn - Function that creates DOM for each item
 */
export function bindForEach(container, arrayObservable, templateFn) {
	if (!container) return;

	const update = () => {
		const items = arrayObservable();
		container.innerHTML = "";

		for (let i = 0; i < items.length; i++) {
			const itemElement = templateFn(items[i], i);
			if (itemElement) {
				container.appendChild(itemElement);
			}
		}
	};

	arrayObservable.subscribe(update);
	update();
}

/**
 * Bind form submission
 */
export function bindSubmit(form, handler, context = null) {
	if (!form) return;

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		if (context) {
			handler.call(context);
		} else {
			handler();
		}
	});
}

/**
 * Bind a radio button group to an observable
 */
export function bindRadio(elements, observable) {
	if (!elements || elements.length === 0) return;

	const update = () => {
		const currentValue = observable();
		for (const element of elements) {
			element.checked = element.value === String(currentValue);
		}
	};

	for (const element of elements) {
		element.addEventListener("change", () => {
			if (element.checked) {
				observable(element.value);
			}
		});
	}

	observable.subscribe(update);
	update();
}

/**
 * Bind a change event handler
 */
export function bindChange(element, handler, context = null) {
	if (!element) return;

	element.addEventListener("change", (event) => {
		if (context) {
			handler.call(context, context, event);
		} else {
			handler(event);
		}
	});
}
