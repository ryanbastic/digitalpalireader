import * as F from "../features/index.js";
import * as Installation from "../features/installation/init.js";
import * as DprVM from "./dprviewmodel.js";

const initSplitters = () => {
	$("#main-sidebar").resizable({
		handleSelector: "#main-panel-splitter",
		resizeHeight: false,
	});

	$("#main-pane").resizable({
		handleSelector: "#main-content-panel-splitter",
		onDrag: (_event, _$el, _passed) => {
			window.DPR1_chrome_mod.updateBottomFrameDimensions();
		},
		resizeWidth: false,
	});
};

const initMainPane = () => {
	$("#main-pane").css(
		"max-height",
		$("#main-content-panel").height() -
			$("#main-content-panel-splitter").height(),
	);
	$("#main-pane-container").css("max-width", window.innerWidth);
};

const initFeatureTabs = () => {
	$("#navigationTabPane").hide();
	$("#searchTabPane").hide();
	$("#dictionaryTabPane").hide();
	$("#instProgressDiv").hide();

	const activeTab = DprVM.ViewModel.activeTab();
	$(`#${activeTab}TabPane`).show();
	$(".nav-link").removeClass("active");
	$(`#${activeTab}Tab`).addClass("active");

	$(".nav-link").on("click", function _(e) {
		e.preventDefault();
		$(".featureTabContent").hide();
		const tabId = this.id.substring(0, this.id.length - 3);
		$(`#${tabId}TabPane`).show();
	});
};

const checkAnalysis = async (sectionId) => {
	const location = document.location.href;
	if (location.indexOf("analysis") > -1) {
		const x = new URL(location);
		await window.DPR1_analysis_function_mod.outputAnalysis(
			sectionId,
			x.searchParams.get("analysis"),
			x.searchParams.get("frombox"),
		);
	}
}; // TODO: handle most parameters in a single function after Beta.

const ensureHidePopoversWithClickTriggers = () => {
	// NOTE: This hides all popover that have click as trigger;
	$("html").on("click", (e) => {
		if ($(e.target).data("toggle") !== "popover") {
			$('[data-toggle="popover"]').popover("hide");
		}
	});
};

const initFeedbackFormParameters = () => {
	const env = `${window.environmentName}.${window.releaseNumber}`;
	const url = encodeURIComponent(document.location.href);
	const userAgent = encodeURIComponent(navigator.userAgent);
	const formBaseUrl =
		"https://docs.google.com/forms/d/e/1FAIpQLSfkpd2GEExiez9q2s87KyGEwIe2Gqh_IWcVAWgyiF3HlFvZpg/viewform";
	$(".feedback-form-link").attr(
		"href",
		`${formBaseUrl}?entry.1186851452=${env}&entry.1256879647=${url}&entry.1719542298=${userAgent}`,
	);
};

const loadHtmlFragmentAsync = (id, html, vm = null) => {
	$(id).html(html);
	if (vm) {
		ko.applyBindings(vm, $(`${id}-root`)[0]);
	}
};

const loadFeatureAsync = async (sectionId, name, initFn) => {
	const html = await import(`../features/${name}/main-pane.html?raw`);
	loadHtmlFragmentAsync("#main-pane-container", html.default);
	DprVM.ViewModel.showMainFeatures();
	await initFn(sectionId);
	initFeedbackFormParameters();
};

const loadAndInitializeLandingPage = async () => {
	const html = await import("../features/landing-page/main-pane.html?raw");
	loadHtmlFragmentAsync("#main-content-landing-page", html.default);
	DprVM.ViewModel.showLandingFeature();
	initFeedbackFormParameters();
	await window.DPR_bv_mod.showBv();
};

const loadPanesAsync = async () => {
	const allTabs = [
		[F.Navigation.featureName, F.Navigation.initializeSidebarTab],
		[F.Search.featureName, F.Search.initializeSidebarTab],
		[F.Dictionary.featureName, F.Dictionary.initializeSidebarTab],
	];

	for (const [feature, fn] of allTabs) {
		const html = await import(`../features/${feature}/tab.html?raw`);
		loadHtmlFragmentAsync(`#${feature}TabPane`, html.default);
		console.log("loaded", feature);
		fn();
	}

	loadHtmlFragmentAsync(
		"#main-bottom-pane",
		(await import("../features/bottom-pane/main-pane.html?raw")).default,
		F.BottomPane.ViewModel,
	);
	loadHtmlFragmentAsync(
		"#settings-dialog",
		(await import("../features/settings-dialog/main-pane.html?raw")).default,
		F.SettingsDialog.ViewModel,
	);
	loadHtmlFragmentAsync(
		"#quicklink-dialog",
		(await import("../features/other-dialogs/quicklinks.html?raw")).default,
		F.OtherDialogs.ViewModel,
	);
	loadHtmlFragmentAsync(
		"#paliquote-dialog",
		(await import("../features/other-dialogs/paliquote.html?raw")).default,
		F.OtherDialogs.ViewModel,
	);
	loadHtmlFragmentAsync(
		"#bookmark-dialog",
		(await import("../features/other-dialogs/bookmarks.html?raw")).default,
		F.OtherDialogs.ViewModel,
	);
	loadHtmlFragmentAsync(
		"#installation-dialog",
		(await import("../features/installation/main-pane.html?raw")).default,
		Installation.ViewModel,
	);
	initFeatureTabs();
};

const historyPopstateHandler = async (e) => {
	if (e.currentTarget.location.search === "") {
		await loadAndInitializeLandingPage();
	}
};

export async function mainInitialize() {
	const sectionId = window.DPR_Chrome.getPrimarySectionId();
	await window.DPR_config_mod.getconfig();
	initSplitters();
	await loadPanesAsync();
	ensureHidePopoversWithClickTriggers();

	if (window.DPR_PAL.isNavigationFeature()) {
		await loadFeatureAsync(
			sectionId,
			F.Navigation.featureName,
			F.Navigation.initializeFeature,
		);
	} else if (window.DPR_PAL.isSearchFeature()) {
		await loadFeatureAsync(
			sectionId,
			F.Search.featureName,
			F.Search.initializeFeature,
		);
	} else if (window.DPR_PAL.isDictionaryFeature()) {
		await loadFeatureAsync(
			sectionId,
			F.Dictionary.featureName,
			F.Dictionary.initializeFeature,
		);
	} else {
		await loadAndInitializeLandingPage();
	}

	initMainPane();
	await checkAnalysis(sectionId);
}

export function installGlobalHandlers() {
	window.addEventListener("resize", () => {
		window.DPR_prefload_mod.loadPreferences();
		initMainPane();
	});

	window.addEventListener("popstate", (e) => historyPopstateHandler(e));
}
