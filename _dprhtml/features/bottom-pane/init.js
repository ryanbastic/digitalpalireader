import * as DprGlobals from "../../dpr_globals.js";

export class BottomPaneTabsViewModel {
	constructor() {
		this.isDTabSelected = ko.observable(true);
		this.isCvTabSelected = ko.observable(false);
		this.isTpTabSelected = ko.observable(false);
		this.isTrTabSelected = ko.observable(false);
		this.isCjTabSelected = ko.observable(false);
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
