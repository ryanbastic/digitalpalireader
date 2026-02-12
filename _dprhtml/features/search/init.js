import * as DprGlobals from "../../dpr_globals.js";
import {
	createObservable,
	createObservableArray,
	createComputed,
} from "../../js/observables.js";
import {
	bindTextInput,
	bindValue,
	bindChecked,
	bindVisible,
	bindClick,
	bindOptions,
	bindForEach,
	bindRadio,
} from "../../js/bindings.js";

export const featureName = "search";

export class SearchTabViewModel {
	constructor() {
		this.searchType = createObservable(0);
		this.searchString = createObservable("");
		this.searchM = createObservable(true);
		this.searchA = createObservable(false);
		this.searchT = createObservable(false);
		this.searchBookString = createObservable("");
		this.searchRegex = createObservable(false);

		this.searchSetString = createObservable("dmsak");
		this.searchSetV = createObservable(false);
		this.searchSetD = createObservable(true);
		this.searchSetM = createObservable(true);
		this.searchSetS = createObservable(true);
		this.searchSetA = createObservable(true);
		this.searchSetK = createObservable(true);
		this.searchSetY = createObservable(false);
		this.searchSetX = createObservable(false);
		this.searchSetB = createObservable(false);
		this.searchSetG = createObservable(false);
		this.searchSetN = createObservable(false);

		this.bookMenu = createObservableArray([]);
		this.bookListA = createObservableArray([]);
		this.bookListB = createObservableArray([]);

		this.searchHierarchy = createObservable([]);

		this.metaList = createObservableArray([]);
		this.volumeList = createObservableArray([]);
		this.vaggaList = createObservableArray([]);
		this.suttaList = createObservableArray([]);
		this.sectionList = createObservableArray([]);

		this.metaListValue = createObservable("0");
		this.volumeListValue = createObservable("0");
		this.vaggaListValue = createObservable("0");
		this.suttaListValue = createObservable("0");
		this.sectionListValue = createObservable("0");
		this.partialValue = createObservable("1");

		this.HistOptions = createObservable("m");
		this.HistOptions.subscribe((x) => DPRNav.switchhier(x));

		this.isStorageSupportedByBrowser = createComputed(
			() => SearchTabViewModel.isStorageSupportedByBrowser(),
			[],
		);
		this.searchHistoryArray = createObservableArray([]);
		this.selectedHistoryItem = createObservable(null);
		this.historyInfo = createComputed(
			() => SearchTabViewModel.computeHistoryInfo(),
			[],
		);

		// These are action functions, not computed values
		this.sameSearchHistory = () => {
			if (typeof DPR_Search_History !== "undefined") {
				DPR_Search_History.sameSearchHistory(this.selectedHistoryItem);
			}
		};

		this.simSearchHistory = () => {
			if (typeof DPR_Search_History !== "undefined") {
				DPR_Search_History.simSearchHistory(this.selectedHistoryItem);
			}
		};

		// Subscribe to searchString changes to convert to unicode
		this.searchString.subscribe((x) => {
			const converted = this.searchRegex()
				? DPR_translit_mod.toUniRegEx(x)
				: DPR_translit_mod.toUni(x);
			if (converted !== x) {
				this.searchString(converted);
			}
		});

		this.updateHistory();
	}

	static isStorageSupportedByBrowser() {
		return typeof Storage !== "undefined";
	}

	searchPart(part) {
		const searchParts = part.toString().split(".");
		this.partialValue(`${Number.parseInt(searchParts[0], 10) + 1}`);
		if (searchParts.length === 6) {
			this.metaListValue(searchParts[1]);
			this.volumeListValue(searchParts[2]);
			this.vaggaListValue(searchParts[3]);
			this.suttaListValue(searchParts[4]);
			this.sectionListValue(searchParts[5]);
		}
	}

	searchBookDropdown() {
		if (this.searchBookString() === "" || DPR_G.searchType < 2) {
			return "1";
		}

		return this.searchBookString();
	}

	searchBookCheckbox(bookNumber) {
		if (this.searchBookString() === "") {
			return true;
		}

		const bookArray = (this.searchBookString() || "").split(",");
		return bookArray.includes(`${bookNumber}`);
	}

	searchSet(set) {
		const setl = set.toLowerCase();
		this.searchSetString(setl);
		this.searchSetV(setl.indexOf("v") > -1);
		this.searchSetD(setl.indexOf("d") > -1);
		this.searchSetM(setl.indexOf("m") > -1);
		this.searchSetS(setl.indexOf("s") > -1);
		this.searchSetA(setl.indexOf("a") > -1);
		this.searchSetK(setl.indexOf("k") > -1);
		this.searchSetY(setl.indexOf("y") > -1);
		this.searchSetX(setl.indexOf("x") > -1);
		this.searchSetB(setl.indexOf("b") > -1);
		this.searchSetG(setl.indexOf("g") > -1);
		this.searchSetN(setl.indexOf("n") > -1);
	}

	searchRX(RX) {
		this.searchRegex(RX.toString() === "true");
	}

	searchMAT(mat) {
		const matl = mat.toLowerCase();
		const matArray = [];
		if (matl.indexOf("m") > -1) {
			matArray.push("m");
		}
		if (matl.indexOf("a") > -1) {
			matArray.push("a");
		}
		if (matl.indexOf("t") > -1) {
			matArray.push("t");
		}
		this.searchHierarchy(matArray);
		this.searchM(matl.indexOf("m") > -1);
		this.searchA(matl.indexOf("a") > -1);
		this.searchT(matl.indexOf("t") > -1);
	}

	async sendSelectedHistoryItem(ctx) {
		if (
			ctx.selectedHistoryItem() &&
			ctx.selectedHistoryItem() !== "-- History --"
		) {
			const selectedHistItem = ctx
				.selectedHistoryItem()
				.toString()
				.replace(/'/g, "")
				.split("@");
			const x = selectedHistItem[1].split(",");
			if (x.length > 3) {
				await DPRSend.openPlace(this.sectionId, x);
			} else {
				await DPRSend.openIndex(this.sectionId, x);
			}
		}
	}

	static computeHistoryInfo() {
		return {
			text: "\u21D2",
			title: "Open bookmarks and history window",
			onmouseup: "window.DPR_bookmarks_mod.bookmarkframe(1)",
		};
	}

	updateHistory() {
		if (SearchTabViewModel.isStorageSupportedByBrowser()) {
			const searchHistStoreDefaultObj = {
				query: "",
				searchType: "",
				rx: "",
				sets: "",
				MAT: "",
				book: "",
				part: "",
				displayText: "-- History --",
			};

			if (!localStorage.getItem("searchHistoryArray")) {
				localStorage.setItem(
					"searchHistoryArray",
					JSON.stringify(searchHistStoreDefaultObj),
				);
			}

			this.searchHistoryArray(
				JSON.parse(localStorage.getItem("searchHistoryArray")),
			);
		}
	}

	clearSearchHistory() {
		DPR_Search_History.clearSearchHistory(this);
	}

	bindDOM(rootElement) {
		if (!rootElement) return;

		// Search input
		bindTextInput(rootElement.querySelector("#isearch"), this.searchString);

		// Regex checkbox
		bindChecked(rootElement.querySelector("#tsoRx"), this.searchRegex);

		// Search type select
		bindValue(rootElement.querySelector("#tipType"), this.searchType);

		// Set select - don't bind searchSetString since it can be "dmsak" (multi-set)
		// but the select only has single-letter options. Legacy code uses jQuery .val()

		// MAT2 select - legacy code uses jQuery .val() expecting single value
		// Don't bind to searchHierarchy array - let onchange handler manage it

		// Book menu select
		bindOptions(
			rootElement.querySelector("#tsoBOOKm"),
			this.bookMenu,
			{
				optionsText: "label",
				optionsValue: "value",
			},
		);

		// Partial book selects
		bindOptions(rootElement.querySelector("#tsoPmeta"), this.metaList, {
			optionsText: "label",
			optionsValue: "value",
			value: this.metaListValue,
		});
		bindOptions(rootElement.querySelector("#tsoPvolume"), this.volumeList, {
			optionsText: "label",
			optionsValue: "value",
			value: this.volumeListValue,
		});
		bindOptions(rootElement.querySelector("#tsoPvagga"), this.vaggaList, {
			optionsText: "label",
			optionsValue: "value",
			value: this.vaggaListValue,
		});
		bindOptions(rootElement.querySelector("#tsoPsutta"), this.suttaList, {
			optionsText: "label",
			optionsValue: "value",
			value: this.suttaListValue,
		});
		bindOptions(rootElement.querySelector("#tsoPsection"), this.sectionList, {
			optionsText: "label",
			optionsValue: "value",
			value: this.sectionListValue,
		});

		// Partial value radio buttons
		const partialRadios = rootElement.querySelectorAll('input[name="tsoPR"]');
		bindRadio(partialRadios, this.partialValue);

		// Enable partial selects based on partialValue
		this._bindPartialEnable(rootElement.querySelector("#tsoPmeta"), 1);
		this._bindPartialEnable(rootElement.querySelector("#tsoPvolume"), 2);
		this._bindPartialEnable(rootElement.querySelector("#tsoPvagga"), 3);
		this._bindPartialEnable(rootElement.querySelector("#tsoPsutta"), 4);
		this._bindPartialEnable(rootElement.querySelector("#tsoPsection"), 5);

		// Set checkboxes
		bindChecked(rootElement.querySelector("#tsoCOv"), this.searchSetV);
		bindChecked(rootElement.querySelector("#tsoCOd"), this.searchSetD);
		bindChecked(rootElement.querySelector("#tsoCOm"), this.searchSetM);
		bindChecked(rootElement.querySelector("#tsoCOs"), this.searchSetS);
		bindChecked(rootElement.querySelector("#tsoCOa"), this.searchSetA);
		bindChecked(rootElement.querySelector("#tsoCOk"), this.searchSetK);
		bindChecked(rootElement.querySelector("#tsoCOy"), this.searchSetY);
		bindChecked(rootElement.querySelector("#tsoCOx"), this.searchSetX);
		bindChecked(rootElement.querySelector("#tsoCOb"), this.searchSetB);
		bindChecked(rootElement.querySelector("#tsoCOg"), this.searchSetG);
		bindChecked(rootElement.querySelector("#tsoCOn"), this.searchSetN);

		// MAT checkboxes
		bindChecked(rootElement.querySelector("#tsoMATm"), this.searchM);
		bindChecked(rootElement.querySelector("#tsoMATa"), this.searchA);
		bindChecked(rootElement.querySelector("#tsoMATt"), this.searchT);

		// Book list A foreach
		const bookListAContainer = rootElement.querySelector("#tsoBOA");
		if (bookListAContainer) {
			bindForEach(bookListAContainer, this.bookListA, (book) => {
				return this._createBookCheckbox(book);
			});
		}

		// Book list B foreach
		const bookListBContainer = rootElement.querySelector("#tsoBOB");
		if (bookListBContainer) {
			bindForEach(bookListBContainer, this.bookListB, (book) => {
				return this._createBookCheckbox(book);
			});
		}

		// History visibility
		const historyRows = rootElement.querySelectorAll(
			'[data-bind*="isStorageSupportedByBrowser"]',
		);
		historyRows.forEach((row) => {
			bindVisible(row, this.isStorageSupportedByBrowser);
		});

		// Search history select
		const historySelect = rootElement.querySelector(
			"#search-history select",
		);
		if (historySelect) {
			bindOptions(historySelect, this.searchHistoryArray, {
				optionsText: "displayText",
				value: this.selectedHistoryItem,
			});
		}

		// History buttons
		bindClick(
			rootElement.querySelector("#hist-clear"),
			this.clearSearchHistory,
			this,
		);
		bindClick(
			rootElement.querySelector("#hist-sim"),
			() => this.simSearchHistory(),
			this,
		);
		bindClick(
			rootElement.querySelector("#hist-same"),
			() => this.sameSearchHistory(),
			this,
		);
	}

	_bindPartialEnable(element, minValue) {
		if (!element) return;

		const update = () => {
			element.disabled = Number.parseInt(this.partialValue(), 10) < minValue;
		};

		this.partialValue.subscribe(update);
		update();
	}

	_createBookCheckbox(book) {
		const div = document.createElement("div");
		div.className = "form-check";

		const input = document.createElement("input");
		input.className = "form-check-input";
		input.type = "checkbox";
		input.id = book.id;
		input.value = book.value;
		input.dataset.value = book.value;
		// Handle both observable and plain boolean values
		input.checked = typeof book.selected === "function" ? book.selected() : !!book.selected;

		input.addEventListener("change", () => {
			// Update the book.selected value if it's an observable
			if (typeof book.selected === "function") {
				book.selected(input.checked);
			} else {
				book.selected = input.checked;
			}
		});

		// Only subscribe if it's an observable
		if (typeof book.selected === "function" && book.selected.subscribe) {
			book.selected.subscribe((val) => {
				input.checked = val;
			});
		}

		const label = document.createElement("label");
		label.className = "form-check-label";
		label.setAttribute("for", book.id);
		label.textContent = book.label;

		div.appendChild(input);
		div.appendChild(label);

		return div;
	}
}

export const ViewModel = new SearchTabViewModel();
DprGlobals.singleton.SearchTabViewModel = ViewModel;

window.DPR_G.searchType = 0;
window.DPR_G.searchString = "";
window.DPR_G.searchMAT = "";
window.DPR_G.searchSet = "";
window.DPR_G.searchBook = 0;
window.DPR_G.searchPart = 0;
window.DPR_G.searchRX = false;

const setSearchParams = () => {
	const urlSearchParams = new URLSearchParams(
		DPR_PAL.isSearchFeature() ? window.location.search : "",
	);
	const savedSearchParams = JSON.parse(DPR_prefload_mod.loadSearchSettings());
	const getSearchParamValue = (n) =>
		urlSearchParams.get(n) || savedSearchParams[n];

	ViewModel.searchType(
		(DPR_G.searchType = Number.parseInt(getSearchParamValue("type"), 10)),
	);
	ViewModel.searchString(
		(DPR_G.searchString = decodeURIComponent(getSearchParamValue("query"))),
	);
	ViewModel.searchMAT((DPR_G.searchMAT = getSearchParamValue("MAT")));
	ViewModel.searchSet((DPR_G.searchSet = getSearchParamValue("set")));
	ViewModel.searchBookString((DPR_G.searchBook = getSearchParamValue("book")));
	ViewModel.searchPart((DPR_G.searchPart = getSearchParamValue("part")));
	ViewModel.searchRX((DPR_G.searchRX = getSearchParamValue("rx")));
};

export const initializeSidebarTab = async () => {
	const sidebarTab = $(`#${featureName}TabContent`)[0];
	setSearchParams();
	ViewModel.bindDOM(sidebarTab);
	await DPROpts.tipitakaOptions();
	await DPRNav.setSearchBookList();
	DPR_PAL.enablePopover("#isearchInfo", "click", "bottom");
};

export const initializeFeature = async (sectionId) => {
	await DPR_config_mod.getconfig();
	setSearchParams();
	await DPR1_search_mod.searchTipitaka(
		sectionId,
		DPR_G.searchType,
		DPR_G.searchString,
		DPR_G.searchMAT,
		DPR_G.searchSet,
		DPR_G.searchBook,
		DPR_G.searchPart,
		DPR_G.searchRX,
	);
};
