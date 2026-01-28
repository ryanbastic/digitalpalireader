import "./_dprhtml/js/deps.js";
import { vi } from "vitest";

window.DPR_G = require("./_dprhtml/js/legacy/globalObject.js");
window.DPR_PAL = require("./_dprhtml/js/legacy/dpr_pal.js");
window.DPR_translitCore_mod = require("./_dprhtml/js/legacy/translitCore.js");
window.DPR_translit_mod = require("./_dprhtml/js/legacy/translit.js");
window.DPR1_chrome_mod =
	require("./_dprhtml/js/legacy/chrome.js").DPR1_chrome_mod;
window.DPR1_format_mod = require("./_dprhtml/js/legacy/format.js");
window.DPR_Chrome = require("./_dprhtml/js/legacy/chrome.js").DPR_Chrome;
window.DPR_navigation_mod = require("./_dprhtml/js/legacy/navigation.js");
window.DPR_navigation_common_mod = require("./_dprhtml/js/legacy/navigation_common.js");
window.DPR_prefload_mod = require("./_dprhtml/js/legacy/prefload.js");
window.DPR_search_mod = require("./_dprhtml/js/legacy/web/search.js");
window.DPR_search_utils_mod = require("./_dprhtml/js/legacy/search_utils.js");
window.DPR_sortaz_mod = require("./_dprhtml/js/legacy/sortaz.js");
window.DPR_translitCore_mod = require("./_dprhtml/js/legacy/translitCore.js");
window.DPR_translit_mod = require("./_dprhtml/js/legacy/translit.js");
window.XML_Load = require("./_dprhtml/js/legacy/xml_load.js").XML_Load;

window.focus = vi.fn();
