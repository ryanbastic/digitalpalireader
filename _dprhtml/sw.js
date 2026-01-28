/*
 * Version: #{DeploymentReleaseNumber}#
 */

// NOTE: This is a service worker kills itself.
// This is for the staging service workers only that have been deployed other machines
// Refer: https://github.com/NekR/self-destroying-sw

importScripts(
	"https://storage.googleapis.com/workbox-cdn/releases/5.1.3/workbox-sw.js",
);

self.addEventListener("install", (e) => {
	self.skipWaiting();
});

self.addEventListener("activate", async (e) => {
	await self.registration.unregister();
	const clients = await self.clients.matchAll();
	clients.forEach((client) => client.navigate(client.url));
});
