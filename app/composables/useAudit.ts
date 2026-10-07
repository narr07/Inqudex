export interface PageResult {
	url: string
	finalUrl: string
	status: number
	ms: number
	size: number
	contentType: string
	title: string
	description: string
	h1: string[]
	canonical: string
	robotsMeta: string
	lang: string
	viewport: boolean
	ogTitle: boolean
	ogImage: boolean
	words: number
	images: number
	imagesNoAlt: number
	internalLinks: number
	externalLinks: number
	linkedFrom: string
	error?: string
}

export type Severity = 'error' | 'warning' | 'info'

export interface Issue {
	id: string
	severity: Severity
	label: string
	hint: string
	urls: string[]
}

export interface CrawlOptions {
	max: number
	concurrency: number
	respectRobots: boolean
	signal: AbortSignal
	onPage: (p: PageResult, queued: number) => void
}

const SKIP_EXT = /\.(?:jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|rar|7z|gz|mp[34]|mov|avi|css|js|json|xml|txt|woff2?|ttf|docx?|xlsx?|pptx?)(?:$|\?)/i

function normalize(href: string, base: string): string | null {
	try {
		const u = new URL(href, base)
		if (!/^https?:$/.test(u.protocol)) return null
		u.hash = ''
		return u.href
	} catch {
		return null
	}
}

async function timedFetch(url: string, signal: AbortSignal, ms = 20000) {
	const ctl = new AbortController()
	const onAbort = () => ctl.abort()
	signal.addEventListener('abort', onAbort)
	const timer = setTimeout(() => ctl.abort(), ms)
	try {
		return await appFetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'SEONarrBot/0.1 (+desktop audit)', Accept: 'text/html,application/xhtml+xml' } })
	} finally {
		clearTimeout(timer)
		signal.removeEventListener('abort', onAbort)
	}
}

/** Minimal robots.txt reader: only the `User-agent: *` group's Disallow/Allow prefixes. */
async function loadRobots(origin: string, signal: AbortSignal) {
	const disallow: string[] = []
	try {
		const res = await timedFetch(`${origin}/robots.txt`, signal, 8000)
		if (!res.ok) return disallow
		let applies = false
		for (const raw of (await res.text()).split(/\r?\n/)) {
			const line = raw.replace(/#.*/, '').trim()
			const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line)
			if (!m || !m[1] || m[2] === undefined) continue
			const key = m[1].toLowerCase()
			if (key === 'user-agent') applies = m[2].trim() === '*'
			else if (applies && key === 'disallow' && m[2].trim()) disallow.push(m[2].trim())
		}
	} catch {
		/* no robots.txt reachable: nothing is blocked */
	}
	return disallow
}

const text = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()

function parsePage(url: string, finalUrl: string, html: string, host: string, ctx: Pick<PageResult, 'status' | 'ms' | 'size' | 'contentType' | 'linkedFrom'>) {
	const doc = new DOMParser().parseFromString(html, 'text/html')
	const meta = (sel: string) => doc.querySelector(sel)?.getAttribute('content')?.trim() ?? ''
	const body = doc.body?.cloneNode(true) as HTMLElement | undefined
	body?.querySelectorAll('script,style,noscript').forEach(n => n.remove())
	const imgs = [...doc.querySelectorAll('img')]
	const links: string[] = []
	let internal = 0
	let external = 0
	for (const a of doc.querySelectorAll('a[href]')) {
		const abs = normalize(a.getAttribute('href') ?? '', finalUrl)
		if (!abs) continue
		if (new URL(abs).host === host) {
			internal++
			links.push(abs)
		} else external++
	}
	const result: PageResult = {
		url,
		finalUrl,
		...ctx,
		title: text(doc.querySelector('title')),
		description: meta('meta[name="description" i]'),
		h1: [...doc.querySelectorAll('h1')].map(h => text(h)).filter(Boolean),
		canonical: doc.querySelector('link[rel="canonical" i]')?.getAttribute('href')?.trim() ?? '',
		robotsMeta: meta('meta[name="robots" i]').toLowerCase(),
		lang: doc.documentElement.getAttribute('lang')?.trim() ?? '',
		viewport: Boolean(meta('meta[name="viewport" i]')),
		ogTitle: Boolean(meta('meta[property="og:title" i]')),
		ogImage: Boolean(meta('meta[property="og:image" i]')),
		words: text(body).split(' ').filter(Boolean).length,
		images: imgs.length,
		imagesNoAlt: imgs.filter(i => i.getAttribute('alt') === null).length,
		internalLinks: internal,
		externalLinks: external
	}
	return { result, links }
}

export async function crawl(startUrl: string, opts: CrawlOptions) {
	const start = normalize(startUrl, startUrl)
	if (!start) throw new Error('URL awal tidak valid.')
	const origin = new URL(start).origin
	const host = new URL(start).host
	const blocked = opts.respectRobots ? await loadRobots(origin, opts.signal) : []
	const isBlocked = (u: string) => blocked.some(p => new URL(u).pathname.startsWith(p))

	const seen = new Set<string>([start])
	const queue: { url: string; from: string }[] = [{ url: start, from: '' }]
	let done = 0
	let skipped = 0

	async function worker() {
		while (!opts.signal.aborted) {
			if (done >= opts.max) return
			const job = queue.shift()
			if (!job) {
				// Another worker may still add links; stop only when nothing is in flight.
				if (inFlight === 0) return
				await sleep(60)
				continue
			}
			if (isBlocked(job.url)) {
				skipped++
				continue
			}
			inFlight++
			const t0 = performance.now()
			try {
				const res = await timedFetch(job.url, opts.signal)
				const ms = Math.round(performance.now() - t0)
				const contentType = res.headers.get('content-type') ?? ''
				const html = /html|xml/i.test(contentType) ? await res.text() : ''
				const ctx = { status: res.status, ms, size: html.length, contentType, linkedFrom: job.from }
				const finalUrl = res.url || job.url
				if (html) {
					const { result, links } = parsePage(job.url, finalUrl, html, host, ctx)
					for (const l of links) {
						if (!seen.has(l) && !SKIP_EXT.test(l) && seen.size < opts.max * 4) {
							seen.add(l)
							queue.push({ url: l, from: job.url })
						}
					}
					done++
					opts.onPage(result, queue.length)
				} else {
					done++
					opts.onPage(emptyPage(job.url, finalUrl, ctx), queue.length)
				}
			} catch (e) {
				if (opts.signal.aborted) return
				done++
				opts.onPage(emptyPage(job.url, job.url, { status: 0, ms: Math.round(performance.now() - t0), size: 0, contentType: '', linkedFrom: job.from }, (e as Error).message), queue.length)
			} finally {
				inFlight--
			}
		}
	}
	let inFlight = 0
	await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker))
	return { skippedByRobots: skipped, robotsRules: blocked.length }
}

function emptyPage(url: string, finalUrl: string, ctx: Pick<PageResult, 'status' | 'ms' | 'size' | 'contentType' | 'linkedFrom'>, error?: string): PageResult {
	return { url, finalUrl, ...ctx, title: '', description: '', h1: [], canonical: '', robotsMeta: '', lang: '', viewport: true, ogTitle: true, ogImage: true, words: 0, images: 0, imagesNoAlt: 0, internalLinks: 0, externalLinks: 0, error }
}

/** Turn crawled pages into grouped issues. Only HTML pages that answered 200 get content checks. */
export function analyze(pages: PageResult[]): Issue[] {
	const issues: Issue[] = []
	const add = (id: string, severity: Severity, label: string, hint: string, urls: string[]) => {
		if (urls.length) issues.push({ id, severity, label, hint, urls })
	}
	const html = pages.filter(p => p.status === 200 && p.contentType.includes('html'))
	const by = (fn: (p: PageResult) => boolean, list = html) => list.filter(fn).map(p => p.url)

	add('net-error', 'error', 'Halaman gagal dimuat', 'Koneksi putus, timeout, atau sertifikat bermasalah.', pages.filter(p => p.error).map(p => `${p.url} (${p.error})`))
	add('http-4xx', 'error', 'Halaman 4xx (rusak)', 'Perbaiki link yang menuju halaman ini atau pasang redirect.', pages.filter(p => p.status >= 400 && p.status < 500).map(p => `${p.url} [${p.status}] ditemukan di ${p.linkedFrom || 'URL awal'}`))
	add('http-5xx', 'error', 'Error server 5xx', 'Server gagal menjawab. Cek log server.', pages.filter(p => p.status >= 500).map(p => `${p.url} [${p.status}]`))
	add('redirect', 'info', 'URL berpindah (redirect)', 'Perbarui link internal supaya langsung ke tujuan akhir.', pages.filter(p => p.status === 200 && p.finalUrl !== p.url).map(p => `${p.url} menjadi ${p.finalUrl}`))

	add('title-missing', 'error', 'Title kosong', 'Setiap halaman butuh <title> yang unik.', by(p => !p.title))
	add('title-long', 'warning', 'Title lebih dari 60 karakter', 'Bagian akhir title sering terpotong di hasil pencarian.', by(p => p.title.length > 60))
	add('title-short', 'info', 'Title kurang dari 30 karakter', 'Title pendek melewatkan ruang untuk kata kunci.', by(p => p.title.length > 0 && p.title.length < 30))
	add('desc-missing', 'warning', 'Meta description kosong', 'Google akan mengarang cuplikan sendiri dari isi halaman.', by(p => !p.description))
	add('desc-long', 'info', 'Meta description lebih dari 160 karakter', 'Cuplikan bisa terpotong.', by(p => p.description.length > 160))
	add('h1-missing', 'warning', 'H1 tidak ada', 'Satu H1 yang jelas membantu mesin dan pembaca.', by(p => p.h1.length === 0))
	add('h1-multi', 'info', 'H1 lebih dari satu', 'Tidak dilarang, tapi cek apakah struktur judulnya memang disengaja.', by(p => p.h1.length > 1))
	add('canonical-missing', 'info', 'Canonical tidak ada', 'Tanpa canonical, varian URL bisa dianggap duplikat.', by(p => !p.canonical))
	add('noindex', 'warning', 'Halaman noindex', 'Pastikan memang sengaja disembunyikan dari Google.', by(p => p.robotsMeta.includes('noindex')))
	add('lang-missing', 'info', 'Atribut lang di <html> kosong', 'Bantu browser dan pembaca layar memilih bahasa.', by(p => !p.lang))
	add('viewport-missing', 'warning', 'Meta viewport tidak ada', 'Halaman tidak dioptimalkan untuk layar ponsel.', by(p => !p.viewport))
	add('og-missing', 'info', 'Open Graph (og:title atau og:image) tidak lengkap', 'Pratinjau di media sosial akan kosong atau acak.', by(p => !p.ogTitle || !p.ogImage))
	add('img-alt', 'warning', 'Gambar tanpa atribut alt', 'Alt dibutuhkan untuk aksesibilitas dan pencarian gambar.', html.filter(p => p.imagesNoAlt > 0).map(p => `${p.url} (${p.imagesNoAlt} dari ${p.images} gambar)`))
	add('thin', 'info', 'Isi tipis (kurang dari 200 kata)', 'Halaman pendek belum tentu buruk, tapi cek apakah menjawab maksud pencarian.', by(p => p.words < 200))
	add('slow', 'warning', 'Respons server lambat (lebih dari 1,5 detik)', 'Waktu ini diukur dari komputer ini, bukan dari Google.', by(p => p.ms > 1500))
	add('orphan-like', 'info', 'Tanpa link internal keluar', 'Halaman buntu menyulitkan crawler menemukan halaman lain.', by(p => p.internalLinks === 0))

	const dup = (key: 'title' | 'description', id: string, label: string, severity: Severity) => {
		const map = new Map<string, string[]>()
		for (const p of html) if (p[key]) map.set(p[key], [...(map.get(p[key]) ?? []), p.url])
		add(id, severity, label, 'Teks yang sama di beberapa halaman membuat mesin sulit membedakannya.', [...map.values()].filter(v => v.length > 1).flatMap(v => v))
	}
	dup('title', 'title-dup', 'Title duplikat', 'warning')
	dup('description', 'desc-dup', 'Meta description duplikat', 'info')

	const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 }
	return issues.sort((a, b) => order[a.severity] - order[b.severity] || b.urls.length - a.urls.length)
}
