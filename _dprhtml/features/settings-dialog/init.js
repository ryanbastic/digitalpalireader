import * as DprGlobals from "../../dpr_globals.js";
import { createObservable } from "../../js/observables.js";
import {
	bindClick,
	bindCss,
	bindVisible,
	bindChecked,
	bindValue,
	bindEnable,
} from "../../js/bindings.js";

export class SettingsDialogViewModel {
	constructor() {
		this.isGeneralSettingsTabSelected = createObservable(true);
		this.isLayoutSettingsTabSelected = createObservable(false);
		this.isTextSettingsTabSelected = createObservable(false);

		this.themes = SettingsDialogViewModel.createThemesObjects();
		this.createSettings();
	}

	createSettings() {
		return Object.entries(window.DPR_G.DPR_prefsinfo).reduce((acc, [k, _]) => {
			acc[k] = createObservable(window.DPR_prefload_mod.getPref(k));
			return acc;
		}, this);
	}

	// NOTE: Needs to be a instance member as it is called from binding
	showSettingsDialog() {
		$("#settings-dialog-root").modal("show");
	}

	savePreferences() {
		window.DPR_prefload_mod.savePreferences((x) => this[x]());

		window.location.reload();
	}

	defaultPreferences() {
		Object.entries(window.DPR_G.DPR_prefsinfo).forEach(([k, _]) =>
			this[k](window.DPR_G.DPR_prefsD[k]),
		);
	}

	cancelPreferences() {
		Object.entries(window.DPR_G.DPR_prefsinfo).forEach(([k, _]) =>
			this[k](window.DPR_G.DPR_prefs[k]),
		);
	}

	// NOTE: Needs to be a instance member as it is called from binding
	hardReset() {
		window.DPR_prefload_mod.resetAllDprSettings();
	}

	switchTheme(themeName) {
		if (!this.themes.has(themeName)) {
			throw new Error("unknown theme", themeName);
		}

		this.themes.get(themeName).forEach((v, k) => this[k](v));
		this.savePreferences();
	}

	updateActiveSettingsTabId(tabId) {
		Object.entries(this)
			.filter(([n, _]) => n.indexOf("TabSelected") !== -1)
			.forEach(([_, fn]) => fn(false));

		this[`is${tabId}SettingsTabSelected`](true);
	}

	updateActiveSettingsTab(_, event) {
		this.updateActiveSettingsTabId($(event.currentTarget).data("tabid"));
	}

	bindDOM(rootElement) {
		if (!rootElement) return;

		// Bind tab buttons
		const tabs = rootElement.querySelectorAll(".settings-pane-tab");
		tabs.forEach((tab) => {
			const tabId = tab.dataset.tabid;
			if (tabId) {
				const selectedObservable = this[`is${tabId}SettingsTabSelected`];
				if (selectedObservable) {
					bindClick(tab, this.updateActiveSettingsTab, this);
					bindCss(tab, { "settings-pane-tab-selected": selectedObservable });
				}
			}
		});

		// Bind tab pane visibility
		bindVisible(
			rootElement.querySelector("#settings-pane-tab-panes-general"),
			this.isGeneralSettingsTabSelected,
		);
		bindVisible(
			rootElement.querySelector("#settings-pane-tab-panes-layout"),
			this.isLayoutSettingsTabSelected,
		);
		bindVisible(
			rootElement.querySelector("#settings-pane-tab-panes-text"),
			this.isTextSettingsTabSelected,
		);

		// Bind General Settings checkboxes
		const checkboxSettings = [
			"showPages",
			"showPagesFull",
			"showVariants",
			"showVariantsInline",
			"showPermalinks",
			"showNames",
			"showPedLinks",
			"nigahita",
			"ctrans",
			"autodict",
			"copyWord",
			"allContext",
			"contextSelected",
			"noContext",
			"pcolbk",
			"pimgbk",
			"pcolbkcp",
			"pimgbkcp",
		];

		for (const setting of checkboxSettings) {
			if (this[setting]) {
				bindChecked(rootElement.querySelector(`#${setting}`), this[setting]);
			}
		}

		// Bind text input settings
		const textSettings = [
			"altlimit",
			"colbk",
			"imgbk",
			"colInput",
			"colButton",
			"colButtonSel",
			"colbkcp",
			"imgbkcp",
			"setRows",
			"coltext",
			"colsel",
			"coldppn",
			"colped",
			"colcpd",
			"colfont",
			"colsize",
			"translits",
		];

		for (const setting of textSettings) {
			if (this[setting]) {
				bindValue(rootElement.querySelector(`#${setting}`), this[setting]);
			}
		}

		// Bind color inputs (they share the same observable as text inputs)
		const colorInputMappings = [
			["colbkc", "colbk"],
			["colInputc", "colInput"],
			["colButtonc", "colButton"],
			["colButtonSelc", "colButtonSel"],
			["colbkcpc", "colbkcp"],
			["coltextc", "coltext"],
			["colselc", "colsel"],
			["coldppnc", "coldppn"],
			["colpedc", "colped"],
			["colcpdc", "colcpd"],
		];

		for (const [colorInputId, settingName] of colorInputMappings) {
			if (this[settingName]) {
				bindValue(rootElement.querySelector(`#${colorInputId}`), this[settingName]);
			}
		}

		// Bind enable/disable for conditional inputs
		if (this.pcolbk) {
			bindEnable(rootElement.querySelector("#colbk"), this.pcolbk);
			bindEnable(rootElement.querySelector("#colbkc"), this.pcolbk);
		}
		if (this.pimgbk) {
			bindEnable(rootElement.querySelector("#imgbk"), this.pimgbk);
		}
		if (this.pcolbkcp) {
			bindEnable(rootElement.querySelector("#colbkcp"), this.pcolbkcp);
			bindEnable(rootElement.querySelector("#colbkcpc"), this.pcolbkcp);
		}
		if (this.pimgbkcp) {
			bindEnable(rootElement.querySelector("#imgbkcp"), this.pimgbkcp);
		}

		// Bind footer buttons
		bindClick(
			rootElement.querySelector('[title="Hard reset all settings..."]'),
			this.hardReset,
			this,
		);
		bindClick(
			rootElement.querySelector('[title="Restore defaults..."]'),
			this.defaultPreferences,
			this,
		);
		bindClick(
			rootElement.querySelector('[title="Cancel changes..."]'),
			this.cancelPreferences,
			this,
		);
		bindClick(
			rootElement.querySelector('[title="Apply changes and close..."]'),
			this.savePreferences,
			this,
		);
	}

	static createThemesObjects() {
		return new Map([
			[
				"light",
				new Map([
					["colbk", window.DPR_G.DPR_prefsD.colbk],
					["colbkcp", window.DPR_G.DPR_prefsD.colbkcp],
					["colInput", window.DPR_G.DPR_prefsD.colInput],
					["colButtonSel", window.DPR_G.DPR_prefsD.colButtonSel],
					["coltext", window.DPR_G.DPR_prefsD.coltext],
					["colsel", window.DPR_G.DPR_prefsD.colsel],
				]),
			],
			[
				"high-contrast",
				new Map([
					["colbk", "#383838"],
					["colbkcp", "#383838"],
					["colInput", "#383838"],
					["colButtonSel", "#78861d"],
					["coltext", "#cfcfcf"],
					["colsel", "#cccc01"],
				]),
			],
		]);
	}
}

export const ViewModel = new SettingsDialogViewModel();
DprGlobals.singleton.SettingsDialogViewModel = ViewModel;
