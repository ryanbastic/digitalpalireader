import * as DprGlobals from "../../dpr_globals.js";
import {
	createObservable,
	createObservableArray,
	createComputed,
} from "../../js/observables.js";
import {
	bindText,
	bindValue,
	bindVisible,
	bindOptions,
	bindRadio,
	bindAttr,
	bindChange,
} from "../../js/bindings.js";

export const featureName = "navigation";

export class NavigationTabViewModel {
	constructor() {
		this.updatingHierarchy = false;

		this.navTitle = createObservable("<not_set>");
		this.set = createObservable("");
		this.set.subscribe((x) => DPRNav.changeSet(x));
		this.prevSetIndex = 0;
		this.book = createObservable("");
		this.book.subscribe((_) => DPRXML.updateHierarchy(0));
		this.MAT = createObservable("m");
		this.MAT.subscribe((x) => DPRNav.switchhier(x));
		this.prevMat = "m";

		this.meta = createObservable("0");
		this.meta.subscribe((_) => DPRXML.updateHierarchy(1));
		this.volume = createObservable("0");
		this.volume.subscribe((_) => DPRXML.updateHierarchy(2));
		this.vagga = createObservable("0");
		this.vagga.subscribe((_) => DPRXML.updateHierarchy(3));
		this.sutta = createObservable("0");
		this.sutta.subscribe((_) => DPRXML.updateHierarchy(4));
		this.section = createObservable("0");

		this.navset = createObservableArray([]);
		this.navBook = createObservableArray([]);

		this.navMeta = createObservableArray([]);
		this.navVolume = createObservableArray([]);
		this.navVagga = createObservableArray([]);
		this.navSutta = createObservableArray([]);
		this.navSection = createObservableArray([]);

		this.navMetaVisible = createComputed(
			() => NavigationTabViewModel.navPartOptionsEmpty(this.navMeta),
			[this.navMeta],
		);
		this.navVolumeVisible = createComputed(
			() => NavigationTabViewModel.navPartOptionsEmpty(this.navVolume),
			[this.navVolume],
		);
		this.navVaggaVisible = createComputed(
			() => NavigationTabViewModel.navPartOptionsEmpty(this.navVagga),
			[this.navVagga],
		);
		this.navSuttaVisible = createComputed(
			() => NavigationTabViewModel.navPartOptionsEmpty(this.navSutta),
			[this.navSutta],
		);
		this.navSectionVisible = createComputed(
			() => NavigationTabViewModel.navPartOptionsEmpty(this.navSection),
			[this.navSection],
		);

		this.partVisibility = [
			this.navMetaVisible,
			this.navVolumeVisible,
			this.navVaggaVisible,
			this.navSuttaVisible,
			this.navSectionVisible,
		];

		this.navMetaInfo = createComputed(
			() => this.computePartInfo(0),
			[this.navMetaVisible, this.navVolumeVisible, this.navVaggaVisible, this.navSuttaVisible, this.navSectionVisible],
		);
		this.navVolumeInfo = createComputed(
			() => this.computePartInfo(1),
			[this.navVolumeVisible, this.navVaggaVisible, this.navSuttaVisible, this.navSectionVisible],
		);
		this.navVaggaInfo = createComputed(
			() => this.computePartInfo(2),
			[this.navVaggaVisible, this.navSuttaVisible, this.navSectionVisible],
		);
		this.navSuttaInfo = createComputed(
			() => this.computePartInfo(3),
			[this.navSuttaVisible, this.navSectionVisible],
		);
		this.navSectionInfo = createComputed(
			() => this.computePartInfo(4),
			[this.navSectionVisible],
		);

		this.query = createObservable("");
		this.para = createObservable("");

		this.places = createObservableArray([]);
		this.sectionPlace = createObservableArray([]);

		this.isStorageSupportedByBrowser = createComputed(
			() => NavigationTabViewModel.isStorageSupportedByBrowser(),
			[],
		);
		this.navHistoryArray = createObservableArray([]);
		this.selectedHistoryItem = createObservable(null);
		this.historyInfo = createComputed(
			() => NavigationTabViewModel.computeHistoryInfo(),
			[],
		);

		this.bookmarksArray = createObservableArray([]);
		this.selectedBookmarksItem = createObservable(null);
		this.bookmarksInfo = createComputed(
			() => NavigationTabViewModel.computeBookmarksInfo(),
			[],
		);

		this.initializeSets();
		this.updateHistory();
		this.updateBookmarks();

		this.sectionId = window.DPR_Chrome.getPrimarySectionId();
	}

	initializeSets() {
		Object.entries(window.DPR_G.G_nikFullNames).forEach(([value, label]) =>
			this.navset.push({
				value,
				label: window.DPR_translit_mod.translit(label),
			}),
		);
	}

	setPlaces(places) {
		this.places(places);
		DPRNav.gotoPlace(places[0].place);
	}

	static navPartOptionsEmpty(opts) {
		return !(
			opts().length === 0 ||
			(opts().length === 1 && opts()[0].label === window.DPR_G.G_unnamed)
		);
	}

	computePartInfo(part) {
		if (!this.partVisibility[part]()) {
			return {};
		}

		const isIndex = this.partVisibility.slice(part + 1).some((x) => x());
		return isIndex
			? {
					text: "≡",
					title:
						"Combine all sub-sections (Click to open primary section; Ctrl+Click to open new tab; Shift+Click to open side by side)",
					onmouseup: `DPRSend.importXML(false,null,null,null,DPRSend.eventSend(event),null,${part + 2})`,
				}
			: {
					text: "\u21D2",
					title:
						"View this section (Click to open in primary section; Ctrl+Click to open in new tab; Shift+Click to open side by side)",
					onmouseup:
						"DPRSend.importXML(false,null,null,null,DPRSend.eventSend(event))",
				};
	}

	static isStorageSupportedByBrowser() {
		return typeof Storage !== "undefined";
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
		if (NavigationTabViewModel.isStorageSupportedByBrowser()) {
			if (!localStorage.getItem("navHistoryArray")) {
				localStorage.setItem(
					"navHistoryArray",
					JSON.stringify(["-- History --"]),
				);
			}
			this.navHistoryArray(JSON.parse(localStorage.getItem("navHistoryArray")));
		}
	}

	sendSelectedBookmarksItem(ctx) {
		if (
			ctx.selectedBookmarksItem() &&
			ctx.selectedBookmarksItem() !== "-- Bookmarks --"
		) {
			const selectedBookmItem = ctx
				.selectedBookmarksItem()
				.toString()
				.replace(/'/g, "")
				.split("@");
			const x = selectedBookmItem[1].split(",");
			const sectionId = window.DPR_Chrome.getPrimarySectionId();
			return x.length > 3
				? DPRSend.openPlace(sectionId, x)
				: DPRSend.openIndex(sectionId, x);
		}

		return Promise.resolve();
	}

	static computeBookmarksInfo() {
		return {
			text: "\u21D2",
			title: "Open bookmarks and history window",
			onmouseup: "window.DPR_bookmarks_mod.bookmarkframe(1)",
		};
	}

	updateBookmarks() {
		if (NavigationTabViewModel.isStorageSupportedByBrowser()) {
			if (!localStorage.getItem("bookmarksArray")) {
				localStorage.setItem(
					"bookmarksArray",
					JSON.stringify(["-- Bookmarks --"]),
				);
			}
			this.bookmarksArray(JSON.parse(localStorage.getItem("bookmarksArray")));
		}
	}

	bindDOM(rootElement) {
		if (!rootElement) return;

		// Bind set select
		bindOptions(rootElement.querySelector("#nav-set"), this.navset, {
			optionsText: "label",
			optionsValue: "value",
			value: this.set,
		});

		// Bind book select
		bindOptions(rootElement.querySelector("#nav-book"), this.navBook, {
			optionsText: "label",
			optionsValue: "value",
			value: this.book,
		});

		// Bind MAT radio buttons
		const matRadios = rootElement.querySelectorAll('input[name="hier_val"]');
		bindRadio(matRadios, this.MAT);

		// Bind nav title button
		bindText(rootElement.querySelector("#nav-title"), this.navTitle);

		// Bind hierarchy selects and buttons
		this._bindHierarchyLevel(rootElement, "meta", this.navMeta, this.meta, this.navMetaVisible, this.navMetaInfo);
		this._bindHierarchyLevel(rootElement, "volume", this.navVolume, this.volume, this.navVolumeVisible, this.navVolumeInfo);
		this._bindHierarchyLevel(rootElement, "vagga", this.navVagga, this.vagga, this.navVaggaVisible, this.navVaggaInfo);
		this._bindHierarchyLevel(rootElement, "sutta", this.navSutta, this.sutta, this.navSuttaVisible, this.navSuttaInfo);
		this._bindHierarchyLevel(rootElement, "section", this.navSection, this.section, this.navSectionVisible, this.navSectionInfo);

		// Bind storage visibility
		const storageRow = rootElement.querySelector('[data-bind*="isStorageSupportedByBrowser"]');
		if (storageRow) {
			bindVisible(storageRow, this.isStorageSupportedByBrowser);
		}

		// Bind history select
		const historySelect = rootElement.querySelector("#nav-history");
		if (historySelect) {
			this._bindHistorySelect(historySelect, this.navHistoryArray, this.selectedHistoryItem, this.sendSelectedHistoryItem);
		}

		// Bind history button
		this._bindInfoButton(rootElement.querySelector("#nav-history-button"), this.historyInfo);

		// Bind bookmarks select (second nav-history id - should use different id)
		const bookmarksSelect = rootElement.querySelectorAll("#nav-history")[1];
		if (bookmarksSelect) {
			this._bindHistorySelect(bookmarksSelect, this.bookmarksArray, this.selectedBookmarksItem, this.sendSelectedBookmarksItem);
		}

		// Bind bookmarks button
		this._bindInfoButton(rootElement.querySelector("#nav-bookmarks-button"), this.bookmarksInfo);
	}

	_bindHierarchyLevel(rootElement, name, optionsObservable, valueObservable, visibleObservable, infoObservable) {
		const select = rootElement.querySelector(`#nav-${name}`);
		const button = rootElement.querySelector(`#nav-${name}-button`);

		if (select) {
			bindOptions(select, optionsObservable, {
				optionsText: "label",
				optionsValue: "value",
				value: valueObservable,
			});
			bindVisible(select, visibleObservable);
		}

		if (button) {
			bindVisible(button, visibleObservable);
			this._bindInfoButton(button, infoObservable);
		}
	}

	_bindInfoButton(button, infoObservable) {
		if (!button) return;

		const update = () => {
			const info = infoObservable() || {};
			button.textContent = info.text || "";
			button.title = info.title || "";
			if (info.onmouseup) {
				button.setAttribute("onmouseup", info.onmouseup);
			}
		};

		infoObservable.subscribe(update);
		update();
	}

	_bindHistorySelect(select, optionsObservable, valueObservable, changeHandler) {
		if (!select) return;

		const updateOptions = () => {
			const items = optionsObservable();
			const currentValue = valueObservable();

			select.innerHTML = "";

			for (const item of items) {
				const option = document.createElement("option");
				option.value = item;
				// Display text before @ symbol
				option.textContent = item.indexOf("@") === -1 ? item : item.substring(0, item.indexOf("@"));
				select.appendChild(option);
			}

			if (currentValue) {
				select.value = currentValue;
			}
		};

		optionsObservable.subscribe(updateOptions);
		updateOptions();

		select.addEventListener("change", () => {
			valueObservable(select.value);
			changeHandler.call(this, this);
		});
	}
}

export const ViewModel = new NavigationTabViewModel();
DprGlobals.singleton.NavigationTabViewModel = ViewModel;

export const initializeFeature = async (sectionId) => {
	await window.DPR_config_mod.getconfig();
	await window.DPR_Chrome.addMainPanelSections(
		ViewModel.places(),
		sectionId,
		ViewModel.query(),
		ViewModel.para(),
	);
};

const parseNavigationURLParams = () => {
	const urlParams = decodeURIComponent(window.location.search)
		.substring(1, window.location.search.length)
		.split("&");
	let query = "";
	let para = "";
	urlParams.forEach((parameter) => {
		if (!parameter) return;
		const [psec0, psec1] = parameter.split("=");
		switch (psec0) {
			case "loc":
				ViewModel.setPlaces(
					psec1.split("|").map(window.DPR_Translations.parsePlace),
				);
				break;
			case "para":
				para = psec1;
				ViewModel.para(para);
				break;
			case "query":
				query = psec1;
				ViewModel.query(query);
				break;
			default:
				console.warn(`Unrecognized parameter ${psec0}=${[psec1]}`);
		}
	});
};

export const initializeSidebarTab = () => {
	parseNavigationURLParams();
	DPR1_chrome_mod.setTransLitScriptId("#navigation-hierarchy");
	DPR1_chrome_mod.setTransLitScriptId("#nav-set-div");

	window.DPR_PAL.enablePopover("#quicklinks-info", "hover", "right");
	window.DPR_PAL.enablePopover(
		"#navigate-book-hierarchy-info",
		"hover",
		"right",
	);

	ViewModel.bindDOM($(`#${featureName}TabContent`)[0]);

	if (ViewModel.places().length === 0) {
		ViewModel.set("d");
	}
};
