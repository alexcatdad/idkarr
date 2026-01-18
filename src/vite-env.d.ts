/// <reference types="vite/client" />
/// <reference types="@vite-pwa/sveltekit" />

declare module "virtual:pwa-register" {
	export interface RegisterSWOptions {
		onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
		onRegisterError?: (error: Error) => void;
		onNeedRefresh?: () => void;
		onOfflineReady?: () => void;
	}

	export function useRegisterSW(options?: RegisterSWOptions): {
		updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
		offlineReady: boolean;
		needRefresh: boolean;
	};
}
