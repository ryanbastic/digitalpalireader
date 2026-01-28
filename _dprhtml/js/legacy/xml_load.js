const DPR_DataLoader = (() => {
	const loadTipitakaAsync = (id, set) => {
		return fetch(`/tipitaka/${set}/${id}.xml`);
	};

	const loadPXD = async (id) => {
		const url = `/en/ped/${id}/ped.xml`;
		const response = await fetch(url);
		const xml = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xml, "text/xml");
		return xmlDoc;
	};

	const loadXDPPN = async (id) => {
		const url = `/en/dppn/${id}.xml`;
		const response = await fetch(url);
		const xml = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xml, "text/xml");
		return xmlDoc;
	};

	const loadSARoots = async (id) => {
		const url = `/sa/roots/${id}.xml`;
		const response = await fetch(url);
		const xml = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xml, "text/xml");
		return xmlDoc;
	};

	const loadSADictionary = async (id) => {
		const url = `/sa/dict/${id}.xml`;
		const response = await fetch(url);
		const xml = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xml, "text/xml");
		return xmlDoc;
	};

	const wrapExceptionHandlerAsync = (fn) =>
		async function () {
			try {
				return await fn.apply(this, arguments);
			} catch (e) {
				DPR_Chrome.showErrorToast(
					`Data files for [${[...arguments].join(",")}] not found. Ensure you have the latest components installed. More info: ${e.message}`,
				);
				return null;
			}
		};

	return {
		loadTipitakaAsync: wrapExceptionHandlerAsync(loadTipitakaAsync),
		loadPXD: wrapExceptionHandlerAsync(loadPXD),
		loadXDPPN: wrapExceptionHandlerAsync(loadXDPPN),
		loadSARoots: wrapExceptionHandlerAsync(loadSARoots),
		loadSADictionary: wrapExceptionHandlerAsync(loadSADictionary),
	};
})();

window.DPR_DataLoader = DPR_DataLoader;

const DPR_Xml_Load = (() => {
	async function loadXMLFileAsync(file, setNo) {
		if (typeof setNo == "undefined") setNo = 0;

		switch (setNo) {
			case 0:
				var set = "my";
				break;
			case 1:
				var set = "th";
				break;
		}

		const response = await DPR_DataLoader.loadTipitakaAsync(file, set);
		const xml = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xml, "text/xml");
		return xmlDoc;
	}

	return {
		loadXMLFileAsync,
	};
})();

window.XML_Load = DPR_Xml_Load;

if (typeof module !== "undefined") {
	module.exports = {
		XML_Load,
	};
}
