<script setup lang="ts">
useHead({ title: 'Kecepatan | Inqudex' })

const settings = useSettings()
const cli = useCli()

type Strategy = 'mobile' | 'desktop'
const url = ref('')
const source = ref<'psi' | 'local'>('psi')
const strategy = ref<Strategy>('mobile')

watch(() => settings.value.defaultSite, (s) => {
	if (!url.value && s) url.value = s.startsWith('sc-domain:') ? `https://${s.slice(10)}/` : s
}, { immediate: true })

/* Lighthouse result shape is shared by PageSpeed API (lighthouseResult) and the local CLI (root). */
interface Audit {
	id: string
	title: string
	description?: string
	score: number | null
	displayValue?: string
	numericValue?: number
	details?: { type?: string; overallSavingsMs?: number }
}
interface Lhr {
	finalUrl?: string
	fetchTime?: string
	categories: Record<string, { title: string; score: number | null; auditRefs: { id: string }[] }>
	audits: Record<string, Audit>
}
interface Field {
	overall_category?: string
	metrics?: Record<string, { percentile: number; category: string }>
}

const state = ref<'idle' | 'loading' | 'error' | 'done'>('idle')
const error = ref('')
const lhr = ref<Lhr | null>(null)
const field = ref<Field | null>(null)

async function run() {
	state.value = 'loading'
	error.value = ''
	lhr.value = null
	field.value = null
	try {
		if (source.value === 'psi') {
			const q = new URLSearchParams({ url: url.value.trim(), strategy: strategy.value })
			for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) q.append('category', c)
			q.set('locale', 'id')
			if (settings.value.pagespeedKey) q.set('key', settings.value.pagespeedKey)
			const res = await appFetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`)
			const body = await res.json()
			if (!res.ok) {
				const msg = body?.error?.message ?? `HTTP ${res.status}`
				throw new Error(res.status === 429 ? `Kuota PageSpeed habis. Isi API key di Pengaturan atau tunggu beberapa menit. (${msg})` : msg)
			}
			lhr.value = body.lighthouseResult
			field.value = body.loadingExperience ?? null
		} else {
			const args = [url.value.trim(), '--output=json', '--output-path=stdout', '--quiet', '--only-categories=performance,seo,accessibility,best-practices', '--chrome-flags=--headless=new --no-sandbox']
			if (strategy.value === 'desktop') args.push('--preset=desktop')
			const r = await cli.run(cli.bin('lighthouse'), args)
			if (r.code !== 0) throw new Error(r.stderr.trim().split('\n').pop() || `Lighthouse berhenti dengan kode ${r.code}. Pastikan Chrome terpasang.`)
			lhr.value = extractJson(r.stdout) as Lhr
		}
		state.value = 'done'
	} catch (e) {
		error.value = e instanceof Error ? e.message : String(e)
		state.value = 'error'
	}
}

const catIds = ['performance', 'seo', 'accessibility', 'best-practices']
const catLabel: Record<string, string> = { performance: 'Performa', seo: 'SEO', accessibility: 'Aksesibilitas', 'best-practices': 'Praktik terbaik' }
const scoreOf = (id: string) => {
	const s = lhr.value?.categories[id]?.score
	return s === null || s === undefined ? null : Math.round(s * 100)
}
// Lighthouse's own bands: 90+ good, 50 to 89 needs work, below 50 poor. Text label always accompanies color.
const band = (n: number | null) => (n === null ? { l: 'Tidak ada', c: 'text-muted' } : n >= 90 ? { l: 'Baik', c: 'text-success' } : n >= 50 ? { l: 'Perlu perbaikan', c: 'text-warning' } : { l: 'Buruk', c: 'text-error' })

const metricIds = [
	['first-contentful-paint', 'FCP', 'Konten pertama tampil'],
	['largest-contentful-paint', 'LCP', 'Konten terbesar tampil'],
	['total-blocking-time', 'TBT', 'Waktu halaman terblokir'],
	['cumulative-layout-shift', 'CLS', 'Pergeseran tata letak'],
	['speed-index', 'SI', 'Kecepatan tampil visual']
] as const

const opportunities = computed(() =>
	Object.values(lhr.value?.audits ?? {})
		.filter(a => a.details?.type === 'opportunity' && (a.details.overallSavingsMs ?? 0) > 0)
		.sort((a, b) => (b.details!.overallSavingsMs ?? 0) - (a.details!.overallSavingsMs ?? 0))
		.slice(0, 8)
)

const seoFails = computed(() => {
	const ids = lhr.value?.categories.seo?.auditRefs.map(r => r.id) ?? []
	return ids.map(id => lhr.value!.audits[id]).filter((a): a is Audit => Boolean(a) && a.score !== null && a.score < 1)
})

const fieldLabel: Record<string, string> = { FAST: 'Cepat', AVERAGE: 'Sedang', SLOW: 'Lambat' }
const fieldMetrics = computed(() => Object.entries(field.value?.metrics ?? {}))
const clean = (s?: string) => (s ?? '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
</script>

<template>
	<div>
		<PageHead
			title="Kecepatan halaman"
			description="Skor Lighthouse untuk performa, SEO, aksesibilitas, dan praktik terbaik. Pakai PageSpeed API (online) atau Lighthouse di komputer ini."
		/>

		<form
			class="panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
			@submit.prevent="run"
		>
			<UFormField
				label="URL halaman"
				class="sm:col-span-2 lg:col-span-3"
			>
				<UInput
					v-model="url"
					type="url"
					required
					placeholder="https://contoh.com/"
				/>
			</UFormField>
			<UFormField label="Sumber">
				<USelect
					v-model="source"
					:items="[{ label: 'PageSpeed API (online)', value: 'psi' }, { label: 'Lighthouse lokal', value: 'local' }]"
				/>
			</UFormField>
			<UFormField label="Perangkat">
				<USelect
					v-model="strategy"
					:items="[{ label: 'Ponsel', value: 'mobile' }, { label: 'Desktop', value: 'desktop' }]"
				/>
			</UFormField>
			<div class="flex items-end">
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:play"
					label="Jalankan tes"
					:loading="state === 'loading'"
				/>
			</div>
			<p class="text-sm text-muted sm:col-span-2 lg:col-span-6">
				<template v-if="source === 'psi'">
					Gratis tanpa key dengan kuota kecil. Key opsional di Pengaturan menaikkan kuota. Server Google yang mengakses halamanmu, jadi URL harus publik.
				</template>
				<template v-else>
					Butuh Lighthouse CLI dan Chrome di komputer ini. Tanpa kuota, dan bisa menguji situs di jaringan lokal.
				</template>
			</p>
		</form>

		<StateBox
			v-if="state === 'idle'"
			kind="empty"
			title="Belum ada hasil tes"
			hint="Masukkan URL lalu jalankan tes. Satu tes memakan 15 sampai 60 detik."
		/>
		<StateBox
			v-else-if="state === 'loading'"
			kind="loading"
			title="Menjalankan Lighthouse"
			hint="Halaman dimuat dan diukur. Jangan tutup aplikasi."
		/>
		<StateBox
			v-else-if="state === 'error'"
			kind="error"
			title="Tes gagal"
			:hint="error"
		/>

		<template v-else-if="lhr">
			<p class="mb-3 text-sm break-all text-muted">
				{{ lhr.finalUrl }}
			</p>
			<ul class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<li
					v-for="id in catIds"
					:key="id"
					class="panel p-4"
				>
					<p class="text-sm text-muted">
						{{ catLabel[id] }}
					</p>
					<p
						class="num text-4xl font-semibold"
						:class="band(scoreOf(id)).c"
					>
						{{ scoreOf(id) ?? '-' }}
					</p>
					<p class="text-sm">
						{{ band(scoreOf(id)).l }}
					</p>
				</li>
			</ul>

			<div class="grid gap-6 lg:grid-cols-2">
				<section aria-labelledby="h-metrics">
					<h2
						id="h-metrics"
						class="mb-3 text-lg font-semibold text-highlighted"
					>
						Metrik lab
					</h2>
					<dl class="panel divide-y divide-default">
						<div
							v-for="[id, short, desc] in metricIds"
							:key="id"
							class="flex items-baseline justify-between gap-3 p-3"
						>
							<dt>
								<span class="font-medium text-highlighted">{{ short }}</span>
								<span class="ml-2 text-sm text-muted">{{ desc }}</span>
							</dt>
							<dd class="num font-medium">
								{{ lhr.audits[id]?.displayValue ?? '-' }}
							</dd>
						</div>
					</dl>
				</section>

				<section aria-labelledby="h-field">
					<h2
						id="h-field"
						class="mb-3 text-lg font-semibold text-highlighted"
					>
						Data pengguna nyata (CrUX)
					</h2>
					<StateBox
						v-if="!fieldMetrics.length"
						kind="empty"
						title="Tidak ada data lapangan"
						hint="Chrome UX Report hanya punya data untuk halaman dengan cukup banyak pengunjung. Sumber Lighthouse lokal tidak mengambilnya."
					/>
					<dl
						v-else
						class="panel divide-y divide-default"
					>
						<div
							v-for="[k, m] in fieldMetrics"
							:key="k"
							class="flex items-baseline justify-between gap-3 p-3"
						>
							<dt class="text-sm break-words text-muted">
								{{ k.replace(/_/g, ' ').toLowerCase() }}
							</dt>
							<dd class="num font-medium">
								{{ m.percentile }}
								<span class="text-sm font-normal text-muted">{{ fieldLabel[m.category] ?? m.category }}</span>
							</dd>
						</div>
					</dl>
				</section>
			</div>

			<section
				class="mt-6"
				aria-labelledby="h-opp"
			>
				<h2
					id="h-opp"
					class="mb-3 text-lg font-semibold text-highlighted"
				>
					Yang paling menghemat waktu
				</h2>
				<StateBox
					v-if="!opportunities.length"
					kind="empty"
					title="Tidak ada peluang penghematan"
					hint="Lighthouse tidak menemukan perbaikan yang menghemat waktu muat berarti."
				/>
				<ul
					v-else
					class="panel divide-y divide-default"
				>
					<li
						v-for="o in opportunities"
						:key="o.id"
						class="p-3"
					>
						<div class="flex items-baseline justify-between gap-3">
							<p class="font-medium text-highlighted">
								{{ o.title }}
							</p>
							<p class="num shrink-0 text-sm">
								hemat {{ Math.round(o.details!.overallSavingsMs!).toLocaleString('id-ID') }} ms
							</p>
						</div>
						<p class="mt-1 text-sm break-words text-muted">
							{{ clean(o.description) }}
						</p>
					</li>
				</ul>
			</section>

			<section
				class="mt-6"
				aria-labelledby="h-seo"
			>
				<h2
					id="h-seo"
					class="mb-3 text-lg font-semibold text-highlighted"
				>
					Pengecekan SEO yang gagal
				</h2>
				<StateBox
					v-if="!seoFails.length"
					kind="empty"
					title="Semua pengecekan SEO Lighthouse lulus"
					hint="Ini hanya mencakup aturan dasar Lighthouse, bukan audit konten penuh. Pakai menu Audit situs untuk cek semua halaman."
				/>
				<ul
					v-else
					class="panel divide-y divide-default"
				>
					<li
						v-for="a in seoFails"
						:key="a.id"
						class="p-3"
					>
						<p class="font-medium text-highlighted">
							{{ a.title }}
						</p>
						<p class="mt-1 text-sm break-words text-muted">
							{{ clean(a.description) }}
						</p>
					</li>
				</ul>
			</section>
		</template>
	</div>
</template>
