import * as DprGlobals from "../../dpr_globals.js";
import { createObservable } from "../../js/observables.js";
import { bindClick, bindCss, bindVisible } from "../../js/bindings.js";

export class BottomPaneTabsViewModel {
	constructor() {
		this.isDTabSelected = createObservable(true);
		this.isCvTabSelected = createObservable(false);
		this.isTpTabSelected = createObservable(false);
		this.isTrTabSelected = createObservable(false);
		this.isCjTabSelected = createObservable(false);
	}

	updateActiveTabId(tabId) {
		Object.entries(this)
			.filter(([n, _]) => n.indexOf("TabSelected") !== -1)
			.forEach(([_, fn]) => fn(false));

		this[`is${tabId}TabSelected`](true);
	}

	updateActiveTab(_, event) {
		this.updateActiveTabId($(event.currentTarget).data("tabid"));
	}

	bindDOM(rootElement) {
		if (!rootElement) return;

		// Bind tab buttons
		const tabs = rootElement.querySelectorAll(".main-bottom-pane-tab");
		tabs.forEach((tab) => {
			const tabId = tab.dataset.tabid;
			if (tabId) {
				const selectedObservable = this[`is${tabId}TabSelected`];
				if (selectedObservable) {
					bindClick(tab, this.updateActiveTab, this);
					bindCss(tab, { "main-bottom-pane-tab-pressed": selectedObservable });
				}
			}
		});

		// Bind tab pane visibility
		bindVisible(
			rootElement.querySelector("#main-bottom-pane-tab-panes-D"),
			this.isDTabSelected,
		);
		bindVisible(
			rootElement.querySelector("#main-bottom-pane-tab-panes-Cv"),
			this.isCvTabSelected,
		);
		bindVisible(
			rootElement.querySelector("#main-bottom-pane-tab-panes-Tp"),
			this.isTpTabSelected,
		);
		bindVisible(
			rootElement.querySelector("#main-bottom-pane-tab-panes-Tr"),
			this.isTrTabSelected,
		);
		bindVisible(
			rootElement.querySelector("#main-bottom-pane-tab-panes-Cj"),
			this.isCjTabSelected,
		);
	}
}

window.BottomPaneTabIds = ["D", "Cv", "Tp", "Tr", "Cj"];

window.DPR_BottomPane = {
	cvConvert: window.DPR_convert_mod.convert,
	cvSortaz: window.DPR_sortaz_mod.sortaz,

	tpToVel: window.DPR_translit_mod.toVel,
	tpToUni: window.DPR_translit_mod.toUni,
	tpSendTextPad: window.DPR_send_bottom_mod.sendTextPad,
	tpSavePad: window.DPR_convert_mod.savePad,

	trTranslateText: window.DPR_translate_mod.translateText,
	trTranslateTextFromBottomPane:
		window.DPR_translate_mod.translateTextFromBottomPane,
	trInsertWordByWord: window.DPR_translate_mod.insertWordByWord,

	cjInsertConj: window.DPR_conjugate_mod.insertConj,
};

export const ViewModel = new BottomPaneTabsViewModel();
DprGlobals.singleton.BottomPaneTabsViewModel = ViewModel;
