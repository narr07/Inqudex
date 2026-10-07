<script setup lang="ts">
import type { Col } from '~/types/table'

useHead({ title: 'Search Console | Inqudex' })

const { site, gsc } = useGsc()
const settings = useSettings()

const tab = ref<'data' | 'report' | 'analyze'>('data')
const tabs = [
	{ label: 'Data mentah', value: 'data' },
	{ label: 'Laporan', value: 'report' },
	{ label: 'Analyzer', value: 'analyze' }
]

const live = ref(true)

/* ---- Data mentah ---- */
const dimension = ref('page')
const dimItems = [
	{ label: 'Halaman', value: 'page' },
	{ label: 'Kueri', value: 'query' },
	{ label: 'Tanggal', value: 'date' },
	{ label: 'Negara', value: 'country' },
	{ label: 'Perangkat', value: 'device' },
	{ label: 'Halaman + kueri', value: 'page,query' }
]
const start = ref('')
const end = ref('')
const limit = ref(500)
const queryFilter = ref('')

type State = 'idle' | 'loading' | 'error' | 'done'
const dataState = ref<State>('idle')
const dataError = ref<{ message: string; next?: string | null } | null>(null)
const dataRows = ref<Record<string, unknown>[]>([])
const dataMeta = ref('')

const dataCols = computed<Col[]>(() => {
	const dims = dimension.value.split(',').map(d => ({ key: d, label: ({ page: 'Halaman', query: 'Kueri', date: 'Tanggal', country: 'Negara', device: 'Perangkat' } as Record<string, string>)[d] ?? d, mono: d === 'page' }))
	return [
		...dims,
		{ key: 'clicks', label: 'Klik', align: 'right' as const },
		{ key: 'impressions', label: 'Impresi', align: 'right' as const },
		{ key: 'ctr', label: 'CTR', align: 'right' as const, format: (v: unknown) => `${((v as number) * 100).toFixed(1)}%` },
		{ key: 'position', label: 'Posisi', align: 'right' as const, format: (v: unknown) => (v as number).toFixed(1) }
	]
})

async function runData() {
	dataState.value = 'loading'
	dataError.value = null
	const args = ['query', '--site', site.value, '-d', dimension.value, '--limit', String(limit.value), '-f', 'json']
	if (start.value) args.push('--start', start.value)
	if (end.value) args.push('--end', end.value)
	if (queryFilter.value.trim()) args.push('--query', `~${queryFilter.value.trim()}`)
	if (live.value) args.push('--live')
	try {
		const res = await gsc<{ data: Record<string, unknown>[]; dateRange?: { start: string; end: string }; meta?: { source?: string } }>(args)
		dataRows.value = res.data ?? []
		dataMeta.value = `${res.dateRange?.start ?? ''} sampai ${res.dateRange?.end ?? ''}, sumber ${res.meta?.source ?? 'tidak diketahui'}`
		dataState.value = 'done'
	} catch (e) {
		const err = e as CliError
		dataError.value = { message: err.message, next: err.nextCommand }
		dataState.value = 'error'
	}
}

/* ---- Laporan & Analyzer ---- */
const reportIds = ref<{ id: string; description: string }[]>([])
const analyzerIds = ref<string[]>([])
const reportId = ref('opportunities')
const analyzerId = ref('striking-distance')
const period = ref('28d')
const periodItems = ['7d', '28d', '30d', '90d', '180d', '365d', 'mtd', 'qtd', 'ytd'].map(p => ({ label: p, value: p }))
const target = ref('')
const targetKind = ref<'page' | 'query'>('page')
const topic = ref('')
const brandTerms = ref('')

const repState = ref<State>('idle')
const repError = ref<{ message: string; next?: string | null } | null>(null)
const repData = ref<unknown>(null)

async function loadIds() {
	if (!isTauri()) return
	try {
		reportIds.value = await gsc('report list --json'.split(' '))
		analyzerIds.value = await gsc('analyze list --json'.split(' '))
	} catch {
		/* the run itself will surface the CLI problem */
	}
}
onMounted(loadIds)

const currentId = computed(() => (tab.value === 'report' ? reportId.value : analyzerId.value))
const needs = computed(() => ({
	target: tab.value === 'report' && reportId.value === 'triage',
	topic: tab.value === 'report' && reportId.value === 'pre-publish',
	brand: tab.value === 'report' && reportId.value === 'brand'
}))
const reportHint = computed(() => reportIds.value.find(r => r.id === reportId.value)?.description ?? '')

async function runReport() {
	repState.value = 'loading'
	repError.value = null
	const kind = tab.value === 'report' ? 'report' : 'analyze'
	const args = [kind, currentId.value, '--site', site.value, '--period', period.value, '--json']
	if (needs.value.target) args.push('--target', target.value, '--target-kind', targetKind.value)
	if (needs.value.topic) args.push('--topic', topic.value)
	if (needs.value.brand) args.push('--brand-terms', brandTerms.value)
	if (live.value) args.push('--live')
	try {
		repData.value = await gsc(args)
		repState.value = 'done'
	} catch (e) {
		const err = e as CliError
		repError.value = { message: err.message, next: err.nextCommand }
		repState.value = 'error'
	}
}

const canRunReport = computed(() => Boolean(site.value) && (!needs.value.target || target.value) && (!needs.value.topic || topic.value) && (!needs.value.brand || brandTerms.value))

watch(tab, () => {
	repState.value = 'idle'
	repData.value = null
})
</script>

<template>
	<div>
		<PageHead
			title="Search Console"
			description="Data pencarian Google lewat gscdump: klik, impresi, kueri, dan laporan peluang."
		/>

		<StateBox
			v-if="!settings.defaultSite"
			kind="empty"
			title="Belum ada situs aktif"
			hint="Pilih situs di bar atas. Jika daftarnya kosong, akun Google belum terhubung ke gscdump."
			next="gscdump auth login --mode local --service-account ./key.json"
		/>

		<template v-else>
			<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
				<UTabs
					v-model="tab"
					:items="tabs"
					:content="false"
					class="w-full sm:w-auto"
				/>
				<USwitch
					v-model="live"
					label="Ambil langsung dari Google"
					description="Mati: baca dari Store lokal (butuh sync)"
				/>
			</div>

			<!-- Data mentah -->
			<section v-if="tab === 'data'">
				<form
					class="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
					@submit.prevent="runData"
				>
					<UFormField
						label="Kelompokkan per"
						class="lg:col-span-2"
					>
						<USelect
							v-model="dimension"
							:items="dimItems"
						/>
					</UFormField>
					<UFormField label="Mulai">
						<UInput
							v-model="start"
							type="date"
						/>
					</UFormField>
					<UFormField label="Sampai">
						<UInput
							v-model="end"
							type="date"
						/>
					</UFormField>
					<UFormField label="Batas baris">
						<UInput
							v-model.number="limit"
							type="number"
							min="1"
							max="25000"
						/>
					</UFormField>
					<UFormField label="Kueri mengandung">
						<UInput
							v-model="queryFilter"
							placeholder="mis. sekolah"
						/>
					</UFormField>
					<div class="flex items-end gap-3 sm:col-span-2 lg:col-span-6">
						<UButton
							type="submit"
							color="primary"
							variant="solid"
							icon="ph:play"
							label="Ambil data"
							:loading="dataState === 'loading'"
						/>
						<p class="text-sm text-muted">
							Tanggal kosong: 28 hari terakhir yang sudah final di Google.
						</p>
					</div>
				</form>

				<StateBox
					v-if="dataState === 'idle'"
					kind="empty"
					title="Belum ada data"
					hint="Atur filter lalu tekan Ambil data. Hasil muncul di sini dan bisa diekspor ke CSV."
				/>
				<StateBox
					v-else-if="dataState === 'loading'"
					kind="loading"
					title="Mengambil data dari Search Console"
					hint="Biasanya beberapa detik. Untuk rentang panjang bisa lebih lama."
				/>
				<StateBox
					v-else-if="dataState === 'error' && dataError"
					kind="error"
					title="Data tidak bisa diambil"
					:hint="dataError.message"
					:next="dataError.next"
				/>
				<template v-else>
					<p class="mb-2 text-sm text-muted">
						{{ dataMeta }}
					</p>
					<StateBox
						v-if="!dataRows.length"
						kind="empty"
						title="Tidak ada baris"
						hint="Google tidak mengembalikan data untuk filter ini. Longgarkan filter kueri atau perlebar tanggal. Baris dengan volume sangat rendah memang disembunyikan Google."
					/>
					<DataTable
						v-else
						:columns="dataCols"
						:rows="dataRows"
						:export-name="`gsc-${dimension.replace(',', '-')}-${site}`"
						caption="Hasil query Search Console"
					/>
				</template>
			</section>

			<!-- Laporan / Analyzer -->
			<section v-else>
				<form
					class="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4"
					@submit.prevent="runReport"
				>
					<UFormField
						v-if="tab === 'report'"
						label="Laporan"
						class="lg:col-span-2"
						:hint="reportHint"
					>
						<USelect
							v-model="reportId"
							:items="reportIds.map(r => ({ label: r.id, value: r.id }))"
							placeholder="Memuat daftar laporan"
						/>
					</UFormField>
					<UFormField
						v-else
						label="Analyzer"
						class="lg:col-span-2"
					>
						<USelect
							v-model="analyzerId"
							:items="analyzerIds.map(a => ({ label: a, value: a }))"
							placeholder="Memuat daftar analyzer"
						/>
					</UFormField>
					<UFormField label="Periode">
						<USelect
							v-model="period"
							:items="periodItems"
						/>
					</UFormField>
					<template v-if="needs.target">
						<UFormField label="Halaman atau kueri target">
							<UInput
								v-model="target"
								required
							/>
						</UFormField>
						<UFormField label="Jenis target">
							<USelect
								v-model="targetKind"
								:items="[{ label: 'Halaman', value: 'page' }, { label: 'Kueri', value: 'query' }]"
							/>
						</UFormField>
					</template>
					<UFormField
						v-if="needs.topic"
						label="Topik artikel"
					>
						<UInput
							v-model="topic"
							required
						/>
					</UFormField>
					<UFormField
						v-if="needs.brand"
						label="Istilah brand, pisah koma"
					>
						<UInput
							v-model="brandTerms"
							required
						/>
					</UFormField>
					<div class="flex items-end sm:col-span-2 lg:col-span-4">
						<UButton
							type="submit"
							color="primary"
							variant="solid"
							icon="ph:play"
							:label="tab === 'report' ? 'Jalankan laporan' : 'Jalankan analyzer'"
							:loading="repState === 'loading'"
							:disabled="!canRunReport"
						/>
					</div>
				</form>

				<StateBox
					v-if="repState === 'idle'"
					kind="empty"
					title="Belum ada hasil"
					hint="Hasil analisis hanya menyebut kandidat untuk ditinjau. Itu bukan bukti penyebab naik atau turunnya traffic."
				/>
				<StateBox
					v-else-if="repState === 'loading'"
					kind="loading"
					title="Menjalankan analisis"
					hint="Mode langsung mengambil banyak baris dari Google, jadi bisa memakan satu menit."
				/>
				<StateBox
					v-else-if="repState === 'error' && repError"
					kind="error"
					title="Analisis gagal"
					:hint="repError.message"
					:next="repError.next"
				/>
				<ResultView
					v-else
					:data="repData"
					:name="`${currentId}-${site}`"
				/>
			</section>
		</template>
	</div>
</template>
