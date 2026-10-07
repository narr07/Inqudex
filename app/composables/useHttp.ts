import { isTauri } from './useCli'

/** Webview fetch is blocked by CORS for SEO targets; the Tauri http plugin goes through Rust instead. */
export async function appFetch(input: string, init?: RequestInit & { connectTimeout?: number }): Promise<Response> {
	if (isTauri()) {
		const { fetch } = await import('@tauri-apps/plugin-http')
		return fetch(input, init)
	}
	return window.fetch(input, init)
}

export async function fetchJson<T = unknown>(url: string, init?: RequestInit): Promise<T> {
	const res = await appFetch(url, init)
	if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} dari ${new URL(url).host}`)
	return (await res.json()) as T
}

export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export async function openExternal(url: string) {
	if (isTauri()) {
		const { openUrl } = await import('@tauri-apps/plugin-opener')
		await openUrl(url)
	} else {
		window.open(url, '_blank', 'noopener')
	}
}
