export interface AppSettings {
	defaultSite: string
	serviceAccountPath: string
	pagespeedKey: string
	indexNowKey: string
	indexNowHost: string
	bins: { gscdump: string; gis: string; lighthouse: string; node: string }
}

const defaults = (): AppSettings => ({
	defaultSite: '',
	serviceAccountPath: '',
	pagespeedKey: '',
	indexNowKey: '',
	indexNowHost: '',
	bins: { gscdump: 'gscdump', gis: 'gis', lighthouse: 'lighthouse', node: 'node' }
})

// One shared reactive copy so the header site picker and every page see the same values.
export const useSettings = createGlobalState(() => {
	const settings = useLocalStorage<AppSettings>('seonarr:settings', defaults(), { mergeDefaults: true })
	return settings
})

export function resetSettings() {
	useSettings().value = defaults()
}
