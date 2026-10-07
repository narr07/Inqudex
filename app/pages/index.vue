<script setup lang="ts">
useHead({ title: 'Beranda | Inqudex' })

const cli = useCli()
const settings = useSettings()
const { copy } = useExport()

interface Probe {
	key: string
	name: string
	role: string
	program: () => string
	args: string[]
	install: string
	state: 'idle' | 'checking' | 'ok' | 'missing'
	detail: string
}

const probes = reactive<Probe[]>([
	{ key: 'gscdump', name: 'gscdump', role: 'Data Search Console, laporan, sitemap, inspeksi URL', program: () => cli.bin('gscdump'), args: ['--version'], install: 'npm install -g @gscdump/cli', state: 'idle', detail: '' },
	{ key: 'gis', name: 'google-indexing-script', role: 'Kirim URL ke Google Indexing API', program: () => cli.bin('gis'), args: ['--help'], install: 'npm install -g google-indexing-script', state: 'idle', detail: '' },
	{ key: 'node', name: 'Node.js', role: 'Runtime untuk gscdump dan gis (butuh 22.13+)', program: () => cli.bin('node'), args: ['--version'], install: 'https://nodejs.org/en/download', state: 'idle', detail: '' },
	{ key: 'lighthouse', name: 'Lighthouse CLI', role: 'Tes kecepatan lokal, tanpa kuota API (opsional)', program: () => cli.bin('lighthouse'), args: ['--version'], install: 'npm install -g lighthouse', state: 'idle', detail: '' }
])

const auth = ref<{ googleAuthenticated?: boolean; googleError?: string | null; mode?: string; source?: string } | null>(null)
const authError = ref<string | null>(null)
const checking = ref(false)

async function check() {
	if (!isTauri()) return
	checking.value = true
	authError.value = null
	await Promise.all(
		probes.map(async (p) => {
			p.state = 'checking'
			try {
				const r = await cli.run(p.program(), p.args, { env: cli.googleEnv() })
				const first = (r.stdout || r.stderr).split('\n').map(l => l.trim()).find(Boolean) ?? ''
				p.state = r.code === 0 ? 'ok' : 'missing'
				p.detail = r.code === 0 ? first.slice(0, 80) : first.slice(0, 120)
			} catch {
				p.state = 'missing'
				p.detail = 'Tidak ditemukan di PATH'
			}
		})
	)
	try {
		auth.value = await cli.runJson(cli.bin('gscdump'), ['auth', 'status', '--json'], { env: cli.googleEnv() })
	} catch (e) {
		auth.value = null
		authError.value = e instanceof Error ? e.message : String(e)
	}
	checking.value = false
}

onMounted(check)

const desktop = computed(() => isTauri())
const quick = [
	{ to: '/search-console', label: 'Lihat klik dan impresi', icon: 'ph:chart-line-up' },
	{ to: '/indexing', label: 'Kirim URL untuk di-index', icon: 'ph:paper-plane-tilt' },
	{ to: '/audit', label: 'Audit satu situs', icon: 'ph:list-magnifying-glass' },
	{ to: '/speed', label: 'Tes kecepatan halaman', icon: 'ph:gauge' }
]
</script>

<template>
	<div>
		<PageHead
			title="Beranda"
			description="Cek apakah semua tool CLI siap, lalu pilih situs yang mau dikerjakan di bar atas."
		>
			<template #actions>
				<UButton
					icon="ph:arrows-clockwise"
					label="Cek ulang"
					:loading="checking"
					@click="check"
				/>
			</template>
		</PageHead>

		<StateBox
			v-if="!desktop"
			kind="error"
			title="Mode browser: CLI tidak tersedia"
			hint="Halaman ini dibuka di browser biasa, jadi gscdump dan google-indexing-script tidak bisa dijalankan. Fitur yang memakai HTTP (audit, kecepatan, kata kunci, IndexNow) tetap bisa dicoba, tapi dibatasi CORS."
			next="bun run tauri:dev"
			class="mb-6"
		/>

		<div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
			<section aria-labelledby="h-tools">
				<h2
					id="h-tools"
					class="mb-3 text-lg font-semibold text-highlighted"
				>
					Tool terpasang
				</h2>
				<ul class="panel divide-y divide-default">
					<li
						v-for="p in probes"
						:key="p.key"
						class="flex flex-wrap items-start justify-between gap-3 p-4"
					>
						<div class="min-w-0">
							<p class="font-medium text-highlighted">
								{{ p.name }}
							</p>
							<p class="text-sm text-muted">
								{{ p.role }}
							</p>
							<p
								v-if="p.detail"
								class="mt-1 font-mono text-xs break-all text-dimmed"
							>
								{{ p.detail }}
							</p>
						</div>
						<div class="flex flex-col items-end gap-2">
							<UBadge
								:color="p.state === 'ok' ? 'success' : p.state === 'missing' ? 'error' : 'neutral'"
								:label="p.state === 'ok' ? 'Siap' : p.state === 'missing' ? 'Belum terpasang' : p.state === 'checking' ? 'Mengecek' : 'Belum dicek'"
							/>
							<UButton
								v-if="p.state === 'missing' && p.install.startsWith('npm')"
								size="xs"
								icon="ph:copy"
								label="Salin perintah install"
								@click="copy(p.install, 'Perintah install')"
							/>
							<UButton
								v-else-if="p.state === 'missing'"
								size="xs"
								icon="ph:arrow-square-out"
								label="Buka halaman unduh"
								@click="openExternal(p.install)"
							/>
						</div>
					</li>
				</ul>
			</section>

			<section
				aria-labelledby="h-auth"
				class="space-y-6"
			>
				<div>
					<h2
						id="h-auth"
						class="mb-3 text-lg font-semibold text-highlighted"
					>
						Akun Google
					</h2>
					<StateBox
						v-if="checking && !auth"
						kind="loading"
						title="Mengecek login gscdump"
					/>
					<StateBox
						v-else-if="authError"
						kind="error"
						title="Status login tidak bisa dibaca"
						:hint="authError"
						next="gscdump auth login --mode local --service-account ./key.json"
					/>
					<div
						v-else-if="auth"
						class="panel p-4"
					>
						<div class="flex items-center justify-between gap-2">
							<p class="font-medium text-highlighted">
								Mode {{ auth.mode }}
							</p>
							<UBadge
								:color="auth.googleAuthenticated ? 'success' : 'error'"
								:label="auth.googleAuthenticated ? 'Terhubung' : 'Ditolak Google'"
							/>
						</div>
						<p class="mt-1 text-sm text-muted">
							Sumber kredensial: {{ auth.source ?? 'tidak diketahui' }}
						</p>
						<p
							v-if="auth.googleError"
							class="mt-2 text-sm text-error"
						>
							{{ auth.googleError }}
						</p>
					</div>
					<StateBox
						v-else
						kind="empty"
						title="Belum dicek"
						hint="Jalankan cek ulang di aplikasi desktop."
					/>
				</div>

				<div>
					<h2 class="mb-3 text-lg font-semibold text-highlighted">
						Mulai dari
					</h2>
					<ul class="space-y-1">
						<li
							v-for="q in quick"
							:key="q.to"
						>
							<NuxtLink
								:to="q.to"
								class="flex min-h-11 items-center gap-3 rounded-md border border-default px-3 text-sm font-medium text-highlighted hover:bg-muted"
							>
								<UIcon
									:name="q.icon"
									class="size-5 text-muted"
								/>
								{{ q.label }}
							</NuxtLink>
						</li>
					</ul>
					<p
						v-if="!settings.defaultSite"
						class="mt-3 text-sm text-muted"
					>
						Belum ada situs aktif. Setelah gscdump terhubung, pilih situsnya di bar atas.
					</p>
				</div>
			</section>
		</div>
	</div>
</template>
