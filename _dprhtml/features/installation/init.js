import * as DprGlobals from "../../dpr_globals.js";
import * as DprVM from "../../js/dprviewmodel.js";
import * as DprComponentRegistry from "./component-registry.js";
import {
	createObservableArray,
	createComputed,
} from "../../js/observables.js";
import {
	bindClick,
	bindEnable,
	bindForEach,
	bindChecked,
} from "../../js/bindings.js";

export class InstallationViewModel {
	constructor() {
		this.components = createObservableArray([]);

		this.componentsToInstall = createComputed(
			() => {
				return this.components().filter(
					(c) => !DprComponentRegistry.isComponentInstalled(c.id) && c.install(),
				);
			},
			[this.components],
		);

		this.componentsToUninstall = createComputed(
			() => {
				return this.components().filter(
					(c) => DprComponentRegistry.isComponentInstalled(c.id) && !c.install(),
				);
			},
			[this.components],
		);
	}

	showInstallationDialog() {
		this.components(DprComponentRegistry.getAvailableComponentVMs());

		if (!DprVM.ViewModel.installationOngoing()) {
			$("#installation-dialog-root").modal("show");
		}
	}

	async applyChanges() {
		const toastDisplayTimeMS = 600000;
		try {
			InstallationViewModel.initializeInstall();

			await InstallationViewModel.installAllComponents(
				this.componentsToInstall(),
			);
			await InstallationViewModel.uninstallAllComponents(
				this.componentsToUninstall(),
			);

			window.DPR_Chrome.showSuccessToast(
				"Installation completed successfully. You can now disconnect from the network and use DPR offline.",
				toastDisplayTimeMS,
			);
		} catch (e) {
			console.error("Error during install", e);
			window.DPR_Chrome.showErrorToast(
				"Installation failed. Please ensure the following and try the same steps again. <br><ul><li>Device is connected to the network</li><li>Ad or content blockers such as uBlock are not active</li></ul>Download will resume from the point of error.",
				toastDisplayTimeMS,
			);
		}

		InstallationViewModel.finalizeInstall();
	}

	bindDOM(rootElement) {
		if (!rootElement) return;

		const container = rootElement.querySelector(
			".installation-pane-tab-pane-section",
		);

		// Bind forEach for components
		if (container) {
			bindForEach(container, this.components, (component, index) => {
				const div = document.createElement("div");
				div.className = "d-flex w-100 justify-content-start";

				const checkbox = document.createElement("input");
				checkbox.className = "mr-2";
				checkbox.type = "checkbox";
				checkbox.id = `componentInstallState${index}`;
				checkbox.checked = component.install();

				checkbox.addEventListener("change", () => {
					component.install(checkbox.checked);
					// Trigger recompute of computed observables
					this.components(this.components());
				});

				component.install.subscribe((val) => {
					checkbox.checked = val;
				});

				const label = document.createElement("label");
				label.setAttribute("for", `componentInstallState${index}`);
				label.textContent = getName(component);

				div.appendChild(checkbox);
				div.appendChild(label);

				return div;
			});
		}

		// Bind OK button
		const okButton = rootElement.querySelector(
			'[title="Apply changes..."]',
		);
		if (okButton) {
			bindClick(okButton, this.applyChanges, this);

			// Enable/disable based on whether there are changes
			const updateEnabled = () => {
				okButton.disabled = !(
					this.componentsToInstall().length ||
					this.componentsToUninstall().length
				);
			};

			this.components.subscribe(updateEnabled);
			updateEnabled();
		}
	}

	static initializeInstall() {
		const toastDisplayTimeMS = 60000;
		window.DPR_Chrome.showSuccessToast(
			// eslint-disable-next-line max-len
			"Installing DPR for offline use. You may continue to work as per usual. You will be notified once installation is completed. Please stay connected to the network till then.",
			toastDisplayTimeMS,
		);
		DprVM.ViewModel.installationOngoing(true);
		InstallationViewModel.updateProgressBar(0);
	}

	static finalizeInstall() {
		InstallationViewModel.updateProgressBar(100);
		DprVM.ViewModel.installationOngoing(false);
	}

	static updateProgressBar(percentDone) {
		DprVM.ViewModel.installationBarWidth(`${percentDone}%`);
		DprVM.ViewModel.installationBar(`${Math.round(percentDone)}%`);
	}

	static async installAllComponents(components) {
		const tasks = components.map((c) =>
			DprComponentRegistry.getComponentFromId(c.id)
				.getFileList()
				.then((fileList) => ({ id: c.id, fileList })),
		);
		const componentInfos = await Promise.all(tasks);
		const totalFiles = componentInfos.reduce(
			(acc, e) => acc + e.fileList.length,
			0,
		);
		let filesDownloaded = 0;
		for (let i = 0; i < componentInfos.length; i += 1) {
			filesDownloaded = await InstallationViewModel.installOneComponent(
				componentInfos[i],
				filesDownloaded,
				totalFiles,
			);
		}
	}

	static async installOneComponent(componentInfo, filesDownloaded, totalFiles) {
		const component = DprComponentRegistry.getComponentFromId(componentInfo.id);
		const cache = await caches.open(
			DprComponentRegistry.getComponentCacheName(component.id),
		);
		let totalFilesDownloaded = filesDownloaded;
		for (let i = 0; i < componentInfo.fileList.length; i += 1) {
			if (!(await cache.match(componentInfo.fileList[i]))) {
				await InstallationViewModel.retryFunction(() =>
					cache.add(componentInfo.fileList[i]),
				);
			}

			totalFilesDownloaded += 1;
			if (totalFilesDownloaded % Math.floor(totalFiles / 100) === 0) {
				InstallationViewModel.updateProgressBar(
					(totalFilesDownloaded / totalFiles) * 100,
				);
			}
		}

		localStorage[
			DprComponentRegistry.componentInstallDoneMarkerKeyName(component.id)
		] = true;

		return totalFilesDownloaded;
	}

	static async uninstallAllComponents(components) {
		for (let i = 0; i < components.length; i += 1) {
			await InstallationViewModel.uninstallOneComponent(components[i]);
		}
	}

	static async uninstallOneComponent(component) {
		try {
			localStorage.removeItem(
				DprComponentRegistry.componentInstallDoneMarkerKeyName(component.id),
			);

			if (
				await caches.has(
					DprComponentRegistry.getComponentCacheName(component.id),
				)
			) {
				await caches.delete(
					DprComponentRegistry.getComponentCacheName(component.id),
				);
			}
		} catch (e) {
			console.warn("Failed to uninstall component", component, e);
		}
	}

	static async retryFunction(asyncFn, maxRetries = 3) {
		for (let retryCount = 0; ; retryCount += 1) {
			let error = null;

			try {
				await asyncFn();
			} catch (e) {
				error = e;
			}

			if (!error) {
				break;
			}

			if (retryCount < maxRetries) {
				continue;
			}

			console.warn(
				"Hit error too many times, giving up",
				error,
				maxRetries,
				retryCount,
			);
			throw error;
		}
	}
}

// Helper function to get component name
function getName(component) {
	const comp = DprComponentRegistry.getComponentFromId(component.id);
	const installed = DprComponentRegistry.isComponentInstalled(component.id);
	return `${comp.name} (${installed ? "Installed" : "Not Installed"})`;
}

export const ViewModel = new InstallationViewModel();
DprGlobals.singleton.InstallationViewModel = ViewModel;
