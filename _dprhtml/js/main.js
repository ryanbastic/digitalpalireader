import * as DprVM from "./dprviewmodel.js";
import * as IH from "./main-core.js";

// NOTE: Ensure this is the very first line.
IH.installGlobalHandlers();

/* Start: Legacy stuff - Don't mess with it! */
window.DPR_G.devCheck = 0;
window.dump = window.dump || window.DPR_G.devCheck ? console.log : () => {};
window.moveFrame = () => {};
window.devO = () => {};
window.dalert = (_a) => {};
window.ddump = (_a) => {};
/* End: Legacy stuff. */

// NOTE: Ensure these are the very last lines.
DprVM.ViewModel.bindDOM();
document.addEventListener("keypress", DprVM.DprKeyboardHandler);
window.document.addEventListener("DOMContentLoaded", IH.mainInitialize);
