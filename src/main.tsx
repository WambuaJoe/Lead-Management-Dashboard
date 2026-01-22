import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { saveConfig } from '@/lib/config';

async function applyRuntimeConfigOverride() {
	try {
		const resp = await fetch('/runtime-config.json', { cache: 'no-store' });
		if (!resp.ok) return;
		const json = await resp.json();
		// Only save known keys to avoid unexpected overwrites
		const allowed: Partial<Record<string, unknown>> = {};
		if (typeof json.submitWebhookUrl === 'string') allowed.submitWebhookUrl = json.submitWebhookUrl;
		if (typeof json.readWebhookUrl === 'string') allowed.readWebhookUrl = json.readWebhookUrl;
		if (Object.keys(allowed).length > 0) {
			// Persist override (encrypted storage handled by saveConfig)
			await saveConfig(allowed as any);
		}
	} catch {
		// Ignore errors — failure to load runtime overrides should not block the app
	}
}

(async () => {
	await applyRuntimeConfigOverride();
	createRoot(document.getElementById("root")!).render(<App />);
})();

