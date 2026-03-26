/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:pwa-register' {
  export type RegisterSWOptions = {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisterError?: (error: any) => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  };

  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}
