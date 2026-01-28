import * as DprGlobals from "../../dpr_globals.js";
import * as Navigation from "../navigation/init.js";

export class OtherDialogsViewModel {
	constructor() {
		this.quicklinkInput = ko.observable();
		this.quicklinkInNewTab = ko.observable(false);
		this.bookmarkName = ko.observable();
		this.sectionId = window.DPR_Chrome.getPrimarySectionId();
		OtherDialogsViewModel.subscribeToEvents(this);
	}

	showQuickLinksDialog() {
		this.quicklinkInput("");
		this.quicklinkInNewTab(false);
		$("#quicklink-dialog-root").on("shown.bs.modal", () =>
			$("#dialog-quicklinkInput").trigger("focus"),
		);
		$("#quicklink-dialog-root").modal("show");
	}

	// NOTE: Needs to be a instance member as it is called from ko
	async sendQuickLinkFromDialog() {
		const place = this.quicklinkInput();
		const outplace = window.DPR_navigation_common_mod.convertShortLink(place);
		if (outplace[0] === false) {
			window.DPR1_format_mod.alertFlash(outplace[1], outplace[2]);
			return;
		}

		if (this.quicklinkInNewTab()) {
			await window.DPR1_send_mod.openPlace(
				this.sectionId,
				outplace,
				null,
				null,
				"new",
			);
		} else {
			await window.DPR1_send_mod.openPlace(this.sectionId, outplace);
		}
	}

	// NOTE: Needs to be a instance member as it is called from ko
	gotoHome() {
		window.DPR1_chrome_mod.openDPRTab(
			window.DPR_PAL.dprHomePage,
			"DPR-main",
			1,
		);
	}

	// NOTE: Needs to be a instance member as it is called from ko
	gotoPrevDictEntry() {
		// TODO: Following was the code. But I cannot find bout or dBot
		const dBot = undefined;
		if (dBot.getElementById("tout")) {
			dBot.getElementById("tout").onclick();
		} else if (document.getElementById("pSect")) {
			document.getElementById("pSect").onmouseup();
		}
	}

	// NOTE: Needs to be a instance member as it is called from ko
	gotoNextDictEntry() {
		// TODO: Following was the code. But I cannot find bout or dBot
		const dBot = undefined;
		if (dBot.getElementById("bout")) {
			dBot.getElementById("bout").onclick();
		} else if (document.getElementById("nSect")) {
			document.getElementById("nSect").onmouseup();
		}
	}

	// NOTE: Needs to be a instance member as it is called from ko
	toggleDPRSidebar() {
		window.DPR_Chrome.toggleDPRSidebar();
	}

	// NOTE: Needs to be a instance member as it is called from ko
	showBottomPane(key) {
		window.DPR1_chrome_mod.DPRShowBottomPane(window.BottomPaneTabIds[key - 1]);
	}

	// NOTE: Needs to be a instance member as it is called from ko
	sendToConvert() {
		if (window.getSelection().toString() !== "") {
			window.DPR_convert_mod.sendtoconvert(window.getSelection().toString());
			this.showBottomPane(2);
		} else if (document.getElementById("convi")) {
			window.DPR_convert_mod.sendtoconvert(
				document.getElementById("convi").innerHTML,
			);
			this.showBottomPane(2);
		} else {
			window.DPR1_format_mod.alertFlash(
				"You must select some text to send to the convertor",
				"yellow",
			);
		}
	}

	// NOTE: Needs to be a instance member as it is called from ko
	sendToTextpad() {
		if (window.getSelection().toString() !== "") {
			window.DPR_convert_mod.sendtoPad(window.getSelection().toString());
			this.showBottomPane(3);
		} else if (document.getElementById("convi")) {
			window.DPR_convert_mod.sendtoPad(
				document.getElementById("convi").innerHTML,
			);
			this.showBottomPane(3);
		} else {
			window.DPR1_format_mod.alertFlash(
				"You must select some text to send to the textpad",
				"yellow",
			);
		}
	}

	// NOTE: Needs to be a instance member as it is called from ko
	appendToTextpad() {
		if (window.getSelection().toString() !== "") {
			window.DPR_convert_mod.sendtoPad(window.getSelection().toString(), true);
			this.showBottomPane(3);
		} else if (document.getElementById("convi")) {
			window.DPR_convert_mod.sendtoPad(
				document.getElementById("convi").innerHTML,
				true,
			);
			this.showBottomPane(3);
		} else {
			window.DPR1_format_mod.alertFlash(
				"You must select some text to send to the textpad",
				"yellow",
			);
		}
	}

	// NOTE: Needs to be a instance member as it is called from ko
	displayPaliQuote() {
		window.DPR_bv_mod.showBv();
		$("#paliquote-dialog-root").modal("show");
	}

	// NOTE: Needs to be a instance member as it is called from ko
	showBookmarksDialog() {
		$("#bookmark-dialog-root").modal("show");
	}

	// NOTE: Needs to be a instance member as it is called from ko
	sendBookmarkFromDialog() {
		const loc = Navigation.ViewModel.placeArray();
		const name = this.bookmarkName();
		const desc = "";

		const scroll = document.getElementById("maf").scrollTop;

		let cont = window.DPR_bookmarks_mod.getBookmarks();
		cont = cont
			? cont.join("\n")
			: '<?xml version="1.0" encoding="UTF-8"?>\n<xml></xml>';
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(cont, "text/xml");

		const newNode = xmlDoc.createElement("bookmark");
		const newNodeName = xmlDoc.createElement("name");
		const newNodeLoc = xmlDoc.createElement("location");
		const newNodeScroll = xmlDoc.createElement("scroll");
		const newNodeDesc = xmlDoc.createElement("description");

		const tLoc = xmlDoc.createTextNode(loc);
		newNodeLoc.appendChild(tLoc);
		newNode.appendChild(newNodeLoc);

		const tName = xmlDoc.createTextNode(name);
		newNodeName.appendChild(tName);
		newNode.appendChild(newNodeName);

		const tScroll = xmlDoc.createTextNode(scroll);
		newNodeScroll.appendChild(tScroll);
		newNode.appendChild(newNodeScroll);

		const tDesc = xmlDoc.createTextNode(desc);
		newNodeDesc.appendChild(tDesc);
		newNode.appendChild(newNodeDesc);

		xmlDoc.documentElement.appendChild(newNode);

		window.DPR1_format_mod.alertFlash("Bookmark Saved", "green");
	}

	// NOTE: Needs to be a instance member as it is called from ko
	resetSettings() {
		window.DPR_prefload_mod.resetAllDprSettings();
		window.location.reload();
	}

	// NOTE: Needs to be a instance member as it is called from ko
	openNewQuizz() {
		// TODO: when quiz is implemented
	}

	// NOTE: Needs to be a instance member as it is called from ko
	openHelp() {
		$("#helpDialog").modal("show");
	}

	// NOTE: Needs to be a instance member as it is called from ko
	openHelpVideo() {
		window.DPR1_chrome_mod.openDPRTab(
			"https://www.youtube.com/watch?v=qP2i7xY2sRI",
			"DPR-help",
			0,
		);
	}

	// NOTE: Needs to be a instance member as it is called from ko
	launchFeedbackForm() {
		window.DPR1_chrome_mod.openDPRTab(
			$(".feedback-form-link").attr("href"),
			"DPR-feedback",
			0,
		);
	}

	static subscribeToEvents(thisObj) {
		window.addEventListener("OtherDialogs:sendToConvert", () =>
			thisObj.sendToConvert(),
		);
		window.addEventListener("OtherDialogs:sendToTextpad", () =>
			thisObj.sendToTextpad(),
		);
		window.addEventListener("OtherDialogs:appendToTextpad", () =>
			thisObj.appendToTextpad(),
		);
		window.addEventListener("OtherDialogs:showBookmarksDialog", () =>
			thisObj.showBookmarksDialog(),
		);
		window.addEventListener("OtherDialogs:showSettingsDialog", () =>
			thisObj.showSettingsDialog(),
		);
		window.addEventListener("OtherDialogs:showQuickLinksDialog", () =>
			thisObj.showQuickLinksDialog(),
		);
		window.addEventListener("OtherDialogs:gotoHome", () => thisObj.gotoHome());
		window.addEventListener("OtherDialogs:toggleDPRSidebar", () =>
			thisObj.toggleDPRSidebar(),
		);
		window.addEventListener("OtherDialogs:showBottomPane", () =>
			thisObj.showBottomPane(),
		);
		window.addEventListener("OtherDialogs:displayPaliQuote", () =>
			thisObj.displayPaliQuote(),
		);
		window.addEventListener("OtherDialogs:resetSettings", () =>
			thisObj.resetSettings(),
		);
		window.addEventListener("OtherDialogs:openNewQuizz", () =>
			thisObj.openNewQuizz(),
		);
		window.addEventListener("OtherDialogs:openHelp", () => thisObj.openHelp());
		window.addEventListener("OtherDialogs:openHelpVideo", () =>
			thisObj.openHelpVideo(),
		);
		window.addEventListener("OtherDialogs:launchFeedbackForm", () =>
			thisObj.launchFeedbackForm(),
		);
		window.addEventListener("OtherDialogs:showInstallationDialog", () =>
			thisObj.showInstallationDialog(),
		);
	}
}

export const ViewModel = new OtherDialogsViewModel();
DprGlobals.singleton.OtherDialogsViewModel = ViewModel;
