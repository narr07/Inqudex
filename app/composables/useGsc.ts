export interface GscSite {
	siteUrl: string
	permissionLevel?: string
}

/** gscdump wants `example.com`, not `sc-domain:example.com`; URL-prefix properties stay as written. */
export const toSiteArg = (siteUrl: string) => siteUrl.replace(/^sc-domain:/, '')

export function useGsc() {
	const cli = useCli()
	const settings = useSettings()

	const sites = useState<GscSite[]>('gsc-sites', () => [])
	const sitesLoading = useState('gsc-sites-loading', () => false)
	const sitesError = useState<string | null>('gsc-sites-error', () => null)

	const site = computed(() => toSiteArg(settings.value.defaultSite))

	async function loadSites() {
		sitesLoading.value = true
		sitesError.value = null
		try {
			const data = await cli.runJson<GscSite[]>(cli.bin('gscdump'), ['sites', '--json'], { env: cli.googleEnv() })
			sites.value = Array.isArray(data) ? data : []
			if (!settings.value.defaultSite && sites.value[0]) settings.value.defaultSite = sites.value[0].siteUrl
		} catch (e) {
			sites.value = []
			sitesError.value = e instanceof Error ? e.message : String(e)
		} finally {
			sitesLoading.value = false
		}
	}

	/** Run a gscdump subcommand and parse its JSON. */
	const gsc = <T = unknown>(args: string[]) => cli.runJson<T>(cli.bin('gscdump'), args, { env: cli.googleEnv() })

	return { sites, sitesLoading, sitesError, site, loadSites, gsc, cli }
}
