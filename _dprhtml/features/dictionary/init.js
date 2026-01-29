import * as DprGlobals from "../../dpr_globals.js";
import {
	createObservable,
	createObservableArray,
	createWritableComputed,
} from "../../js/observables.js";
import {
	bindTextInput,
	bindValue,
	bindChecked,
} from "../../js/bindings.js";

export const featureName = "dictionary";

export class DictionaryTabViewModel {
	constructor() {
		this.query = createObservable("");
		this.type = createObservable("");
		this.showAdvancedOptions = createObservable(false);
		this.options = createObservableArray();
		this.entry = createObservable("");

		// Initialize options
		const n2nKeys = Object.keys(DPR_G.G_nikToNumber);
		for (let i = 0; i < n2nKeys.length; i += 1) {
			this.options.push(`x${n2nKeys[i]}`);
		}

		const hnKeys = Object.keys(DPR_G.G_hNumbers);
		for (let i = 0; i < hnKeys.length; i += 1) {
			this.options.push(`m${hnKeys[i]}`);
		}

		// Create writable computed for rx
		this.rx = createWritableComputed({
			read: () => {
				return this.option("rx");
			},
			write: (val) => {
				let opts = this.options().filter((x) => x.toLowerCase() !== "rx");
				if (val) {
					opts = [...opts, "rx"];
				}
				this.options(opts);
			},
			owner: this,
		});

		// Subscribe to query changes to convert to unicode
		this.query.subscribe((x) => {
			const converted = this.rx()
				? DPR_translit_mod.toUniRegEx(x)
				: DPR_translit_mod.toUni(x);
			if (converted !== x) {
				this.query(converted);
			}
		});
	}

	option(optionName) {
		return this.options.indexOf(optionName) > -1;
	}

	bindDOM(rootElement) {
		if (!rootElement) return;

		// Bind query input
		bindTextInput(rootElement.querySelector("#dictin"), this.query);

		// Bind type select
		bindValue(rootElement.querySelector("#dictType"), this.type);

		// Bind rx checkbox
		bindChecked(rootElement.querySelector("#soregexp"), this.rx);

		// Bind other option checkboxes - these use the option() method
		// For these, we need custom binding since they check options array
		this._bindOptionCheckbox(rootElement.querySelector("#sofuzzy"), "fz");
		this._bindOptionCheckbox(rootElement.querySelector("#sofulltext"), "ft");
		this._bindOptionCheckbox(rootElement.querySelector("#sostartword"), "sw");
		this._bindOptionCheckbox(rootElement.querySelector("#soMATm"), "mm");
		this._bindOptionCheckbox(rootElement.querySelector("#soMATa"), "ma");
		this._bindOptionCheckbox(rootElement.querySelector("#soMATt"), "mt");
		this._bindOptionCheckbox(rootElement.querySelector("#soNSv"), "xv");
		this._bindOptionCheckbox(rootElement.querySelector("#soNSd"), "xd");
		this._bindOptionCheckbox(rootElement.querySelector("#soNSa"), "xa");
		this._bindOptionCheckbox(rootElement.querySelector("#soNSm"), "xm");
		this._bindOptionCheckbox(rootElement.querySelector("#soNSk"), "xk");
		this._bindOptionCheckbox(rootElement.querySelector("#soNSs"), "xs");
		this._bindOptionCheckbox(rootElement.querySelector("#soNSy"), "xy");
	}

	_bindOptionCheckbox(element, optionName) {
		if (!element) return;

		const update = () => {
			element.checked = this.option(optionName);
		};

		element.addEventListener("change", () => {
			let opts = this.options().filter(
				(x) => x.toLowerCase() !== optionName.toLowerCase(),
			);
			if (element.checked) {
				opts = [...opts, optionName];
			}
			this.options(opts);
		});

		this.options.subscribe(update);
		update();
	}
}

export const ViewModel = new DictionaryTabViewModel();
DprGlobals.singleton.DictionaryTabViewModel = ViewModel;

export const initializeSidebarTab = () => {
	const sidebarTab = $(`#${featureName}TabContent`)[0];
	ViewModel.bindDOM(sidebarTab);
	DPR_dict_mod.parseDictURLParameters();
	DPROpts.dictOptions();
	DPR_PAL.enablePopover("#dictinInfo", "click", "bottom");
};

export const initializeFeature = async (sectionId) => {
	await DPR_config_mod.getconfig();
	DPR_dict_mod.parseDictURLParameters();
	try {
		await DPR_dict_mod.startDictLookup(sectionId);
	} catch (ex) {
		console.error("Unexpected exception. Is a bug. Find and fix.", ex);
	}
};
