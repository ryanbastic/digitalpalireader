import * as DprGlobals from "../dpr_globals.js";
import * as Dictionary from "../features/dictionary/init.js";
import * as Navigation from "../features/navigation/init.js";
import * as Search from "../features/search/init.js";

// Simple reactive state management (replaces knockout observables)
function createObservable(initialValue) {
	let value = initialValue;
	const subscribers = new Set();

	const observable = {
		get() {
			return value;
		},
		set(newValue) {
			if (value !== newValue) {
				value = newValue;
				subscribers.forEach((fn) => fn(newValue));
			}
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
	};

	// Make it callable like knockout for compatibility
	const fn = function (newValue) {
		if (arguments.length === 0) {
			return observable.get();
		}
		observable.set(newValue);
	};
	fn.get = observable.get;
	fn.set = observable.set;
	fn.subscribe = observable.subscribe;

	return fn;
}

function createComputed(computeFn, dependencies) {
	const subscribers = new Set();
	let cachedValue = computeFn();

	const recompute = () => {
		const newValue = computeFn();
		if (cachedValue !== newValue) {
			cachedValue = newValue;
			subscribers.forEach((fn) => fn(newValue));
		}
	};

	// Subscribe to all dependencies
	dependencies.forEach((dep) => dep.subscribe(recompute));

	const computed = {
		get() {
			return cachedValue;
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
	};

	// Make it callable like knockout for compatibility
	const fn = function () {
		return computed.get();
	};
	fn.get = computed.get;
	fn.subscribe = computed.subscribe;

	return fn;
}

export class DprViewModel {
	constructor() {
		this.sidebarVisible = createObservable(
			DPR_prefload_mod.loadSideBarVisibleState(),
		);
		this.loadingFeatureVisible = createObservable(true);
		this.landingFeatureVisible = createObservable(false);
		this.activeTab = createObservable(Navigation.featureName);
		this.mainFeaturesVisible = createObservable(false);

		this.navigationFeatureVisible = createComputed(
			() =>
				this.mainFeaturesVisible() &&
				this.activeTab() === Navigation.featureName,
			[this.mainFeaturesVisible, this.activeTab],
		);

		this.searchFeatureVisible = createComputed(
			() =>
				this.mainFeaturesVisible() && this.activeTab() === Search.featureName,
			[this.mainFeaturesVisible, this.activeTab],
		);

		this.dictionaryFeatureVisible = createComputed(
			() =>
				this.mainFeaturesVisible() &&
				this.activeTab() === Dictionary.featureName,
			[this.mainFeaturesVisible, this.activeTab],
		);

		this.installationOngoing = createObservable(false);
		this.installationBar = createObservable("");
		this.installationBarWidth = createObservable(0);
		this.commands = createCommands();
		this.parseURLParameters();
	}

	showLandingFeature() {
		this.loadingFeatureVisible(false);
		this.landingFeatureVisible(true);
		this.mainFeaturesVisible(false);
	}

	showMainFeatures() {
		this.loadingFeatureVisible(false);
		this.landingFeatureVisible(false);
		this.mainFeaturesVisible(true);
	}

	parseURLParameters() {
		if (DPR_PAL.isNavigationFeature()) {
			this.activeTab(Navigation.featureName);
		} else if (DPR_PAL.isSearchFeature()) {
			this.activeTab(Search.featureName);
		} else if (DPR_PAL.isDictionaryFeature()) {
			this.activeTab(Dictionary.featureName);
		} else {
			// NOTE: Default is navigation tab.
			this.activeTab(Navigation.featureName);
		}
	}

	updateCommand(id, cmd) {
		const command = this.commands[id];

		if (command) {
			let c = cmd;
			if (id.startsWith(DPR_CMD_TRANSLATE_)) {
				c = {
					...c,
					...{ title: `${cmd.title} (Shift + click to open in new window)` },
				};
			}
			command.update(c);
		} else {
			console.error("Unable to find command:", id, "to update with", cmd);
		}
	}

	// Bind the view model to the DOM
	bindDOM() {
		// Visibility bindings
		this._bindVisibility("main-container-loading-page", this.loadingFeatureVisible);
		this._bindHidden("main-container", this.loadingFeatureVisible);
		this._bindVisibility("main-sidebar", this.sidebarVisible);
		this._bindVisibility("main-panel-splitter", this.sidebarVisible);
		this._bindVisibility("instProgressDiv", this.installationOngoing);
		this._bindVisibility("main-pane-container", this.mainFeaturesVisible);
		this._bindVisibility("main-content-landing-page", this.landingFeatureVisible);
		this._bindVisibility("search-header", this.searchFeatureVisible);

		// Context menu visibility (depends on multiple computed values)
		const contextMenuTopLevel = document.getElementById("context-menu-top-level");
		if (contextMenuTopLevel) {
			const updateContextMenuTopLevel = () => {
				const visible =
					this.navigationFeatureVisible() ||
					this.searchFeatureVisible() ||
					this.dictionaryFeatureVisible();
				contextMenuTopLevel.style.display = visible ? "" : "none";
			};
			this.navigationFeatureVisible.subscribe(updateContextMenuTopLevel);
			this.searchFeatureVisible.subscribe(updateContextMenuTopLevel);
			this.dictionaryFeatureVisible.subscribe(updateContextMenuTopLevel);
			updateContextMenuTopLevel();
		}

		this._bindVisibility("context-menu", this.navigationFeatureVisible);

		// Installation bar bindings
		const installationBar = document.getElementById("installationBar");
		if (installationBar) {
			const updateInstallationBar = () => {
				installationBar.innerHTML = this.installationBar();
				installationBar.style.width = this.installationBarWidth() + "%";
			};
			this.installationBar.subscribe(updateInstallationBar);
			this.installationBarWidth.subscribe(updateInstallationBar);
			updateInstallationBar();
		}

		// Disable install button when installation ongoing
		const installButton = document.getElementById("context-menu-install-button");
		if (installButton) {
			const updateInstallButton = () => {
				installButton.disabled = this.installationOngoing();
			};
			this.installationOngoing.subscribe(updateInstallButton);
			updateInstallButton();
		}

		// Bind command buttons
		this._bindCommandButtons();
	}

	_bindVisibility(elementId, observable) {
		const element = document.getElementById(elementId);
		if (element) {
			const update = () => {
				element.style.display = observable() ? "" : "none";
			};
			observable.subscribe(update);
			update();
		}
	}

	_bindHidden(elementId, observable) {
		const element = document.getElementById(elementId);
		if (element) {
			const update = () => {
				element.style.display = observable() ? "none" : "";
			};
			observable.subscribe(update);
			update();
		}
	}

	_bindCommandButtons() {
		// Map of command IDs to their button element IDs
		const commandButtonMap = {
			[DPR_CMD_GOTO_PREV]: "cmd-btn-gotoPrev",
			[DPR_CMD_GOTO_INDEX]: "cmd-btn-gotoIndex",
			[DPR_CMD_GOTO_NEXT]: "cmd-btn-gotoNext",
			[DPR_CMD_GOTO_RELM]: "cmd-btn-gotoRelm",
			[DPR_CMD_GOTO_RELA]: "cmd-btn-gotoRela",
			[DPR_CMD_GOTO_RELT]: "cmd-btn-gotoRelt",
			[DPR_CMD_GOTO_MYANMAR]: "cmd-btn-gotoMyanmar",
			[DPR_CMD_GOTO_THAI]: "cmd-btn-gotoThai",
			[DPR_CMD_SEND_TO_CONVERTER]: "cmd-btn-sendToConverter",
			[DPR_CMD_SEND_TO_TEXTPAD]: "cmd-btn-sendToTextpad",
			[DPR_CMD_SAVE_TO_DESKTOP]: "cmd-btn-saveToDesktop",
			[DPR_CMD_COPY_PLACE_TO_SIDEBAR]: "cmd-btn-copyPlaceToSidebar",
			[DPR_CMD_COPY_PERMALINK]: "cmd-btn-copyPermalink",
			[DPR_CMD_SEARCH_IN_BOOK]: "cmd-btn-searchInBook",
			[DPR_CMD_BOOKMARK_SECTION]: "cmd-btn-bookmarkSection",
		};

		// Bind translate commands (0-10)
		for (let i = 0; i <= 10; i++) {
			commandButtonMap[`translate${i}`] = `cmd-btn-translate${i}`;
		}

		// Bind button groups
		const groupMap = {
			"cmd-group-rel": [DPR_CMD_GOTO_RELM, DPR_CMD_GOTO_RELA, DPR_CMD_GOTO_RELT],
			"cmd-group-script": [DPR_CMD_GOTO_MYANMAR, DPR_CMD_GOTO_THAI],
			"cmd-group-clipboard": [DPR_CMD_COPY_PLACE_TO_SIDEBAR, DPR_CMD_COPY_PERMALINK],
			"cmd-group-search": [DPR_CMD_SEARCH_IN_BOOK],
			"cmd-group-bookmark": [DPR_CMD_BOOKMARK_SECTION],
			"cmd-group-translate": Array.from({ length: 11 }, (_, i) => `translate${i}`),
		};

		// Bind individual buttons
		for (const [cmdId, btnId] of Object.entries(commandButtonMap)) {
			const button = document.getElementById(btnId);
			const command = this.commands[cmdId];
			if (button && command) {
				this._bindCommandButton(button, command);
			}
		}

		// Bind button groups (show group if any command is visible)
		for (const [groupId, cmdIds] of Object.entries(groupMap)) {
			const group = document.getElementById(groupId);
			if (group) {
				const commands = cmdIds.map((id) => this.commands[id]).filter(Boolean);
				const updateGroup = () => {
					const anyVisible = commands.some((cmd) => cmd.get().visible);
					group.style.display = anyVisible ? "" : "none";
				};
				commands.forEach((cmd) => cmd.subscribe(updateGroup));
				updateGroup();
			}
		}
	}

	_bindCommandButton(button, command) {
		const update = () => {
			const cmd = command.get();
			button.style.display = cmd.visible ? "" : "none";
			button.disabled = !cmd.canExecute;
			button.title = cmd.title || "";

			// Handle icon for translate commands
			const img = button.querySelector("img.context-menu-command-icon");
			if (img && cmd.icon) {
				img.src = cmd.icon;
			}
		};

		button.addEventListener("click", (e) => {
			const cmd = command.get();
			if (cmd.canExecute && cmd.execute) {
				cmd.execute(e);
			}
		});

		command.subscribe(update);
		update();
	}
}

window.DPR_CMD_GOTO_PREV = "gotoPrevCmd";
window.DPR_CMD_GOTO_INDEX = "gotoIndexCmd";
window.DPR_CMD_GOTO_NEXT = "gotoNextCmd";
window.DPR_CMD_GOTO_MYANMAR = "gotoMyanmarCmd";
window.DPR_CMD_GOTO_THAI = "gotoThaiCmd";
window.DPR_CMD_GOTO_RELM = "gotoRelmCmd";
window.DPR_CMD_GOTO_RELA = "gotoRelaCmd";
window.DPR_CMD_GOTO_RELT = "gotoReltCmd";
window.DPR_CMD_COPY_PERMALINK = "copyPermalinkCmd";
window.DPR_CMD_SEND_TO_CONVERTER = "sendToConverter";
window.DPR_CMD_SEND_TO_TEXTPAD = "sendToTextPad";
window.DPR_CMD_APPEND_TO_TEXTPAD = "appendToTextpad";
window.DPR_CMD_SAVE_TO_DESKTOP = "saveToDesktop";
window.DPR_CMD_SEARCH_IN_BOOK = "searchInBook";
window.DPR_CMD_COPY_PLACE_TO_SIDEBAR = "copyPlaceToSidebar";
window.DPR_CMD_BOOKMARK_SECTION = "bookmarkSection";
window.DPR_CMD_TRANSLATE_ = "translate";
window.DPR_CMD_TRANSLATE_0 = "translate0";
window.DPR_CMD_TRANSLATE_1 = "translate1";
window.DPR_CMD_TRANSLATE_2 = "translate2";
window.DPR_CMD_TRANSLATE_3 = "translate3";
window.DPR_CMD_TRANSLATE_4 = "translate4";
window.DPR_CMD_TRANSLATE_5 = "translate5";
window.DPR_CMD_TRANSLATE_6 = "translate6";
window.DPR_CMD_TRANSLATE_7 = "translate7";
window.DPR_CMD_TRANSLATE_8 = "translate8";
window.DPR_CMD_TRANSLATE_9 = "translate9";
window.DPR_CMD_TRANSLATE_10 = "translate10";
window.DPR_CMD_ENTER_QUICK_REFERENCE = "enterQuickReference";
window.DPR_CMD_OPEN_SETTINGS = "openSettings";
window.DPR_CMD_GOTO_HOME = "gotoHome";
window.DPR_CMD_GOTO_PREV_DICT_ENTRY = "gotoPrevDictEntry";
window.DPR_CMD_GOTO_NEXT_DICT_ENTRY = "gotoNextDictEntry";
window.DPR_CMD_TOGGLE_DPR_SIDEBAR = "toggleDPRSidebar";
window.DPR_CMD_SHOW_BOTTOM_PANE = "showBottomPane";
window.DPR_CMD_SHOW_PALI_QUOTE = "showPaliQuote";
window.DPR_CMD_RESET_SETTINGS = "resetSettings";
window.DPR_CMD_OPEN_NEW_QUIZZ = "openNewQuizz";
window.DPR_CMD_OPEN_HELP = "openHelp";
window.DPR_CMD_OPEN_HELP_VIDEO = "openHelpVideo";
window.DPR_CMD_LAUNCH_FEEDBACK_FORM = "launchFeedbackForm";
window.DPR_CMD_INSTALL_OFFLINE_APP = "installOfflineApp";

const emptyFn = () => {};

const dprCommandList = [
	{
		id: DPR_CMD_GOTO_PREV,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Go to previous section (Keyboard shortcut: p)",
		matchKey: (e) => e.key === "p",
		matchGesture: (e) => e.dpr_gesture === "swipe_right",
	},
	{
		id: DPR_CMD_GOTO_INDEX,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Open book index (Keyboard shortcut: i)",
		matchKey: (e) => e.key === "i",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_NEXT,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Go to next section (Keyboard shortcut: n)",
		matchKey: (e) => e.key === "n",
		matchGesture: (e) => e.dpr_gesture === "swipe_left",
	},
	{
		id: DPR_CMD_GOTO_MYANMAR,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Switch to Myanmar tipitika",
		matchKey: (_) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_THAI,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Switch to Thai tipitika",
		matchKey: (_) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_RELM,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title:
			"Open relative section in Mūla side by side (Keyboard shortcut: m). Shift+click to open in same pane (Keyboard shortcut: M).",
		matchKey: (e) => e.key === "m" || e.key === "M",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_RELA,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title:
			"Open relative section in Aṭṭhakathā side by side (Keyboard shortcut: a). Shift+click to open in same pane (Keyboard shortcut: A).",
		matchKey: (e) => e.key === "a" || e.key === "A",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_RELT,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title:
			"Open relative section in Ṭīkā side by side (Keyboard shortcut: t). Shift+click to open in same pane (Keyboard shortcut: T).",
		matchKey: (e) => e.key === "t" || e.key === "T",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_COPY_PERMALINK,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Copy permalink to clipboard (Keyboard shortcut: c)",
		matchKey: (e) => e.key === "c",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_SEND_TO_CONVERTER,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:sendToConvert")),
		visible: true,
		isDynamic: false,
		title: "Send text to converter (Keyboard shortcut: s)",
		matchKey: (e) => e.key === "s",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_SEND_TO_TEXTPAD,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:sendToTextpad")),
		visible: true,
		isDynamic: false,
		title: "Send text to textpad (Keyboard shortcut: e)",
		matchKey: (e) => e.key === "e",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_APPEND_TO_TEXTPAD,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:appendToTextpad")),
		visible: true,
		isDynamic: false,
		title: "Append selection to textpad (Keyboard shortcut: E)",
		matchKey: (e) => e.key === "E",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_SAVE_TO_DESKTOP,
		notImplemented: true,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Save text to desktop",
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_SEARCH_IN_BOOK,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Search in book",
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_COPY_PLACE_TO_SIDEBAR,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "Copy place to sidebar",
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_BOOKMARK_SECTION,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:showBookmarksDialog")),
		visible: true,
		isDynamic: true,
		title: "Bookmark section (Keyboard shortcut: b)",
		matchKey: (e) => e.key === "b",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_0,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_1,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_2,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_3,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_4,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_5,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_6,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_7,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_8,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_9,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TRANSLATE_10,
		notImplemented: false,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: true,
		title: "",
		icon: null,
		matchKey: (e) => false,
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_OPEN_SETTINGS,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:showSettingsDialog")),
		visible: true,
		isDynamic: false,
		title: "Open settings dialog (Keyboard shortcut: %)",
		matchKey: (e) => e.key === "%",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_ENTER_QUICK_REFERENCE,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(
				new CustomEvent("OtherDialogs:showQuickLinksDialog", {}),
			),
		visible: true,
		isDynamic: false,
		title: "Enter quick reference (Keyboard shortcut: q)",
		matchKey: (e) => e.key === "q",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_HOME,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:gotoHome")),
		visible: true,
		isDynamic: false,
		title: "Go to home page (Keyboard shortcut: v)",
		matchKey: (e) => e.key === "v",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_PREV_DICT_ENTRY,
		notImplemented: true,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: false,
		title: "Go to previous dictionary entry (Keyboard shortcut: ,)",
		matchKey: (e) => e.key === ",",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_GOTO_NEXT_DICT_ENTRY,
		notImplemented: true,
		canExecute: false,
		execute: emptyFn,
		visible: false,
		isDynamic: false,
		title: "Go to next dictionary entry (Keyboard shortcut: .)",
		matchKey: (e) => e.key === ".",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_TOGGLE_DPR_SIDEBAR,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:toggleDPRSidebar")),
		visible: true,
		isDynamic: false,
		title: "Toggle DPR Sidebar (Keyboard shortcut: & or `)",
		matchKey: (e) => e.key === "&" || e.key === "`",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_SHOW_BOTTOM_PANE,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:showBottomPane")),
		visible: true,
		isDynamic: false,
		title: "Show bottom panes (Keyboard shortcuts: 1, 2, 3, 4, 5)",
		matchKey: (e) => ["1", "2", "3", "4", "5"].includes(e.key),
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_SHOW_PALI_QUOTE,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:displayPaliQuote")),
		visible: true,
		isDynamic: false,
		title: "Display Pali Quote (Keyboard shortcut: *)",
		matchKey: (e) => e.key === "*",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_RESET_SETTINGS,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:resetSettings")),
		visible: true,
		isDynamic: false,
		title: "Reset all settings (Keyboard shortcut: R)",
		matchKey: (e) => e.key === "R",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_OPEN_NEW_QUIZZ,
		notImplemented: true,
		canExecute: false,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:openNewQuizz")),
		visible: true,
		isDynamic: false,
		title: "Open new quizz (Keyboard shortcut: #)",
		matchKey: (e) => e.key === "#",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_OPEN_HELP,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:openHelp")),
		visible: true,
		isDynamic: false,
		title: "Open help dialog (Keyboard shortcut: ?)",
		matchKey: (e) => e.key === "?",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_OPEN_HELP_VIDEO,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:openHelpVideo")),
		visible: true,
		isDynamic: false,
		title: "Open help video (Keyboard shortcut: h)",
		matchKey: (e) => e.key === "h",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_LAUNCH_FEEDBACK_FORM,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(new CustomEvent("OtherDialogs:launchFeedbackForm")),
		visible: true,
		isDynamic: false,
		title: "Launch feedback form (Keyboard shortcut: @)",
		matchKey: (e) => e.key === "@",
		matchGesture: (_) => false,
	},
	{
		id: DPR_CMD_INSTALL_OFFLINE_APP,
		notImplemented: false,
		canExecute: true,
		execute: () =>
			window.dispatchEvent(
				new CustomEvent("OtherDialogs:showInstallationDialog"),
			),
		visible: true,
		isDynamic: false,
		title: "Install for offline use (Keyboard shortcut: I)",
		matchKey: (e) => e.key === "I",
		matchGesture: (_) => false,
	},
];

export const ViewModel = new DprViewModel();

export const DprKeyboardHandler = (e) => {
	if (
		document.activeElement.type == "text" ||
		document.activeElement.tagName == "TEXTAREA" ||
		e.altKey ||
		e.ctrlKey ||
		e.metaKey
	) {
		return null;
	}

	const cmd = Object.entries(ViewModel.commands).find(([_, x]) =>
		x.get().matchKey(e),
	);
	if (
		cmd &&
		!cmd[1].get().notImplemented &&
		cmd[1].get().canExecute &&
		cmd[1].get().visible
	) {
		cmd[1].get().execute(e);
		e && e.preventDefault();
		return cmd[1].get();
	}
};

const __dprCommandsMap = {};
dprCommandList.forEach((x) => (__dprCommandsMap[x.id] = x));
Object.freeze(__dprCommandsMap);

// Creates a command observable with update capability
function createCommandObservable(initialValue) {
	let value = { ...initialValue };
	const subscribers = new Set();

	return {
		get() {
			return value;
		},
		update(updates) {
			value = { ...value, ...updates };
			subscribers.forEach((fn) => fn(value));
		},
		subscribe(fn) {
			subscribers.add(fn);
			return () => subscribers.delete(fn);
		},
	};
}

function createCommands() {
	const cmds = {};
	dprCommandList.forEach((x) => (cmds[x.id] = createCommandObservable(x)));
	Object.freeze(cmds);

	return cmds;
}

window.dprCommandList = dprCommandList;
window.__dprCommandsMap = __dprCommandsMap;

DprGlobals.singleton.DprViewModel = ViewModel;
