<script setup lang="ts">
import type { Col } from '~/types/table'
import type { Issue, PageResult } from '~/composables/useAudit'

useHead({ title: 'Audit situs | Inqudex' })

const settings = useSettings()
const { saveCsv } = useExport()

const url = ref('')
const max = ref(50)
const concurrency = ref(4)
const respectRobots = ref(true)

const running = ref(false)
const pages = ref<PageResult[]>([])
const queued = ref(0)
const error = ref('')
const note = ref('')
const issues = ref<Issue[]>([])
let ctl: AbortController | null = null

watch(() => settings.value.defaultSite, (s) => {
	if (!url.value && s) url.value = s.startsWith('sc-domain:') ? `https://${s.slice(10)}/` : s
}, { immediate: true })

async function start() {
	running.value = true
	pages.value = []
	issues.value = []
	error.value = ''
	note.value = ''
	queued.value = 0
	ctl = new AbortController()
	try {
		const r = await crawl(url.value.trim(), {
			max: max.value,
			concurrency: concurrency.value,
			respectRobots: respectRobots.value,
			signal: ctl.signal,
			onPage: (p, q) => {
				pages.value.push(p)
				queued.value = q
			}
		})
		if (r.skippedByRobots) note.value = `${r.skippedByRobots} URL dilewati karena diblokir robots.txt (${r.robotsRules} aturan Disallow untuk semua bot).`
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		running.value = false
		issues.value = analyze(pages.value)
		if (ctl?.signal.aborted) note.value = `Dihentikan. Hasil di bawah hanya dari ${pages.value.length} halaman yang sempat dimuat.`
	}
}

const stop = () => ctl?.abort()

const counts = computed(() => ({
	error: issues.value.filter(i => i.severity === 'error').reduce((n, i) => n + i.urls.length, 0),
	warning: issues.value.filter(i => i.severity === 'warning').reduce((n, i) => n + i.urls.length, 0),
	info: issues.value.filter(i => i.severity === 'info').reduce((n, i) => n + i.urls.length, 0)
}))

const sevLabel = { error: 'Error', warning: 'Peringatan', info: 'Catatan' } as const
const sevColor = { error: 'error', warning: 'warning', info: 'neutral' } as const

const cols: Col[] = [
	{ key: 'url', label: 'URL', mono: true },
	{ key: 'status', label: 'Status', align: 'right', format: v => (v ? String(v) : 'Gagal') },
	{ key: 'ms', label: 'ms', align: 'right' },
	{ key: 'title', label: 'Title' },
	{ key: 'description', label: 'Description' },
	{ key: 'h1', label: 'H1', format: v => (v as string[]).join(' | ') },
	{ key: 'words', label: 'Kata', align: 'right' },
	{ key: 'internalLinks', label: 'Link internal', align: 'right' },
	{ key: 'imagesNoAlt', label: 'Gambar tanpa alt', align: 'right' }
]

const exportIssues = () =>
	saveCsv('audit-masalah', [
		{ key: 'severity', label: 'Tingkat' },
		{ key: 'label', label: 'Masalah' },
		{ key: 'url', label: 'URL' }
	], issues.value.flatMap(i => i.urls.map(u => ({ severity: sevLabel[i.severity], label: i.label, url: u }))))

const tab = ref<'issues' | 'pages'>('issues')
const progress = computed(() => Math.min(100, Math.round((pages.value.length / Math.max(1, max.value)) * 100)))
</script>

<template>
	<div>
		<PageHead
			title="Audit situs"
			description="Crawler lokal: membaca halaman satu per satu dari komputer ini, lalu mengelompokkan masalah SEO on-page."
		/>

		<form
			class="panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
			@submit.prevent="start"
		>
			<UFormField
				label="URL awal"
				class="sm:col-span-2 lg:col-span-3"
			>
				<UInput
					v-model="url"
					type="url"
					required
					placeholder="https://contoh.com/"
				/>
			</UFormField>
			<UFormField
				label="Maks halaman"
				hint="1 sampai 500"
			>
				<UInput
					v-model.number="max"
					type="number"
					min="1"
					max="500"
				/>
			</UFormField>
			<UFormField
				label="Paralel"
				hint="1 sampai 10"
			>
				<UInput
					v-model.number="concurrency"
					type="number"
					min="1"
					max="10"
				/>
			</UFormField>
			<div class="flex items-end">
				<USwitch
					v-model="respectRobots"
					label="Patuhi robots.txt"
				/>
			</div>
			<div class="flex gap-2 sm:col-span-2 lg:col-span-6">
				<UButton
					v-if="!running"
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:play"
					label="Mulai audit"
				/>
				<UButton
					v-else
					color="error"
					icon="ph:stop"
					label="Hentikan"
					@click="stop"
				/>
			</div>
		</form>

		<div
			v-if="running"
			class="mb-5"
			role="status"
		>
			<div class="mb-1 flex justify-between text-sm text-muted">
				<span>{{ pages.length }} halaman dimuat, {{ queued }} antre</span>
				<span class="num">{{ progress }}%</span>
			</div>
			<UProgress
				:model-value="progress"
				aria-label="Kemajuan audit"
			/>
		</div>

		<StateBox
			v-if="error"
			kind="error"
			title="Audit gagal dimulai"
			:hint="error"
		/>
		<StateBox
			v-else-if="!pages.length && !running"
			kind="empty"
			title="Belum ada audit"
			hint="Masukkan URL awal lalu mulai. Hanya halaman satu host yang diikuti. Semua pengecekan memakai data dari crawl ini, tidak ada angka bawaan."
		/>
		<StateBox
			v-else-if="!pages.length"
			kind="loading"
			title="Memuat halaman pertama"
		/>

		<template v-if="pages.length">
			<p
				v-if="note"
				class="mb-3 text-sm text-muted"
			>
				{{ note }}
			</p>

			<dl class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div class="panel p-3">
					<dt class="text-sm text-muted">
						Halaman dimuat
					</dt>
					<dd class="num text-2xl font-semibold text-highlighted">
						{{ pages.length }}
					</dd>
				</div>
				<div class="panel p-3">
					<dt class="text-sm text-muted">
						Error
					</dt>
					<dd class="num text-2xl font-semibold text-error">
						{{ counts.error }}
					</dd>
				</div>
				<div class="panel p-3">
					<dt class="text-sm text-muted">
						Peringatan
					</dt>
					<dd class="num text-2xl font-semibold text-warning">
						{{ counts.warning }}
					</dd>
				</div>
				<div class="panel p-3">
					<dt class="text-sm text-muted">
						Catatan
					</dt>
					<dd class="num text-2xl font-semibold text-highlighted">
						{{ counts.info }}
					</dd>
				</div>
			</dl>

			<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
				<UTabs
					v-model="tab"
					:items="[{ label: 'Masalah', value: 'issues' }, { label: 'Semua halaman', value: 'pages' }]"
					:content="false"
				/>
				<UButton
					v-if="tab === 'issues'"
					size="sm"
					icon="ph:download-simple"
					label="Ekspor masalah (CSV)"
					:disabled="!issues.length || running"
					@click="exportIssues"
				/>
			</div>

			<section v-if="tab === 'issues'">
				<StateBox
					v-if="running"
					kind="loading"
					title="Masalah dihitung setelah crawl selesai"
					hint="Pindah ke tab Semua halaman untuk melihat hasil yang sudah masuk."
				/>
				<StateBox
					v-else-if="!issues.length"
					kind="empty"
					title="Tidak ada masalah yang terdeteksi"
					hint="Itu hanya berlaku untuk pengecekan on-page di halaman yang dimuat. Ini bukan jaminan ranking atau status index."
				/>
				<ul
					v-else
					class="space-y-2"
				>
					<li
						v-for="i in issues"
						:key="i.id"
					>
						<details class="panel group">
							<summary class="flex min-h-11 cursor-pointer items-center gap-3 p-3">
								<UBadge
									:color="sevColor[i.severity]"
									:label="sevLabel[i.severity]"
								/>
								<span class="min-w-0 flex-1 font-medium text-highlighted">{{ i.label }}</span>
								<span class="num text-sm text-muted">{{ i.urls.length }} halaman</span>
							</summary>
							<div class="border-t border-default p-3">
								<p class="mb-2 text-sm text-muted">
									{{ i.hint }}
								</p>
								<ul class="max-h-64 space-y-1 overflow-auto font-mono text-xs">
									<li
										v-for="u in i.urls.slice(0, 200)"
										:key="u"
										class="break-all"
									>
										{{ u }}
									</li>
								</ul>
								<p
									v-if="i.urls.length > 200"
									class="mt-2 text-xs text-muted"
								>
									{{ i.urls.length - 200 }} lagi, lengkapnya ada di ekspor CSV.
								</p>
							</div>
						</details>
					</li>
				</ul>
			</section>

			<DataTable
				v-else
				:columns="cols"
				:rows="pages as unknown as Record<string, unknown>[]"
				export-name="audit-halaman"
				caption="Semua halaman yang di-crawl"
			/>
		</template>
	</div>
</template>
