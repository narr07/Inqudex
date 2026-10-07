<script setup lang="ts">
useHead({ title: 'Indexing | Inqudex' })

const { site, gsc, cli } = useGsc()
const settings = useSettings()
const { pickFile, saveText, copy } = useExport()
const toast = useToast()

const tab = ref<'inspect' | 'gis' | 'indexnow'>('inspect')
const tabs = [
	{ label: 'Cek status di Google', value: 'inspect' },
	{ label: 'Indexing API (gis)', value: 'gis' },
	{ label: 'IndexNow (Bing, Yandex)', value: 'indexnow' }
]

/** Pull every http(s) URL out of whatever shape the CLI returned (JSON array, object, or lines). */
function collectUrls(v: unknown, out = new Set<string>()): string[] {
	if (typeof v === 'string') {
		for (const line of v.split(/\s+/)) if (/^https?:\/\//.test(line)) out.add(line)
	} else if (Array.isArray(v)) v.forEach(x => collectUrls(x, out))
	else if (v && typeof v === 'object') Object.values(v).forEach(x => collectUrls(x, out))
	return [...out]
}

const parseList = (text: string) => [...new Set(text.split(/\s+/).map(s => s.trim()).filter(s => /^https?:\/\//.test(s)))]

/* ---------- Inspect ---------- */
const urlText = ref('')
const sitemapUrl = ref('')
const loadingSitemap = ref(false)
const inspectState = ref<'idle' | 'loading' | 'error' | 'done'>('idle')
const inspectError = ref<{ message: string; next?: string | null } | null>(null)
const inspectData = ref<unknown>(null)
const urls = computed(() => parseList(urlText.value))

async function fromSitemap() {
	loadingSitemap.value = true
	try {
		const data = await gsc(['sitemaps', 'urls', sitemapUrl.value.trim(), '--json'])
		const found = collectUrls(data)
		urlText.value = found.join('\n')
		toast.add({ title: `${found.length} URL dimuat dari sitemap`, color: 'success' })
	} catch (e) {
		toast.add({ title: 'Sitemap tidak bisa dibaca', description: (e as Error).message, color: 'error' })
	} finally {
		loadingSitemap.value = false
	}
}

async function inspect() {
	inspectState.value = 'loading'
	inspectError.value = null
	try {
		const { tempDir, join } = await import('@tauri-apps/api/path')
		const { invoke } = await import('@tauri-apps/api/core')
		const file = await join(await tempDir(), 'seonarr-inspect-urls.txt')
		await invoke('write_text', { path: file, content: urls.value.join('\n') })
		inspectData.value = await gsc(['inspect', '--site', site.value, '--file', file, '--json'])
		inspectState.value = 'done'
	} catch (e) {
		const err = e as CliError
		inspectError.value = { message: err.message, next: err.nextCommand }
		inspectState.value = 'error'
	}
}

/* ---------- gis ---------- */
const gisJob = useJob()
const gisTarget = ref('')
const gisUrls = ref('')
const rpmRetry = ref(true)

watch(() => settings.value.defaultSite, (s) => {
	if (!gisTarget.value && s) gisTarget.value = s.replace(/^sc-domain:/, '')
}, { immediate: true })

async function runGis() {
	const args = [gisTarget.value.trim()]
	if (settings.value.serviceAccountPath) args.push('--path', settings.value.serviceAccountPath)
	const only = parseList(gisUrls.value)
	if (only.length) args.push('--urls', only.join(','))
	if (rpmRetry.value) args.push('--rpm-retry')
	await gisJob.start(cli.bin('gis'), args)
}

async function chooseKey() {
	const p = await pickFile(['json'], 'File service account')
	if (p) settings.value.serviceAccountPath = p
}

/* ---------- IndexNow ---------- */
const nowUrls = ref('')
const endpoint = ref('https://api.indexnow.org/IndexNow')
const endpoints = [
	{ label: 'api.indexnow.org (disebar ke semua mesin)', value: 'https://api.indexnow.org/IndexNow' },
	{ label: 'Bing langsung', value: 'https://www.bing.com/IndexNow' },
	{ label: 'Yandex langsung', value: 'https://yandex.com/indexnow' }
]
const nowBusy = ref(false)
const nowResult = ref<{ ok: boolean; status: number; text: string } | null>(null)

const statusText: Record<number, string> = {
	200: 'Diterima. URL sudah dikirim.',
	202: 'Diterima, tapi validasi key masih menunggu. Pastikan file key bisa dibuka di domain kamu.',
	400: 'Format permintaan salah.',
	403: 'Key tidak valid. File key di domain tidak ditemukan atau isinya beda.',
	422: 'URL tidak cocok dengan host, atau key tidak memenuhi syarat.',
	429: 'Terlalu banyak permintaan. Coba lagi nanti.'
}

function genKey() {
	const b = crypto.getRandomValues(new Uint8Array(16))
	settings.value.indexNowKey = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
}

const nowList = computed(() => parseList(nowUrls.value))
const nowHost = computed(() => {
	if (settings.value.indexNowHost) return settings.value.indexNowHost
	try {
		return nowList.value[0] ? new URL(nowList.value[0]).host : ''
	} catch {
		return ''
	}
})

async function sendNow() {
	nowBusy.value = true
	nowResult.value = null
	try {
		const body = {
			host: nowHost.value,
			key: settings.value.indexNowKey,
			keyLocation: `https://${nowHost.value}/${settings.value.indexNowKey}.txt`,
			urlList: nowList.value.slice(0, 10000)
		}
		const res = await appFetch(endpoint.value, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
			body: JSON.stringify(body)
		})
		nowResult.value = { ok: res.status === 200 || res.status === 202, status: res.status, text: statusText[res.status] ?? (await res.text()) ?? '' }
	} catch (e) {
		nowResult.value = { ok: false, status: 0, text: `Permintaan gagal: ${(e as Error).message}` }
	} finally {
		nowBusy.value = false
	}
}
</script>

<template>
	<div>
		<PageHead
			title="Indexing"
			description="Cek apakah Google sudah mengindeks URL, kirim URL lewat Indexing API, atau beri tahu Bing dan Yandex lewat IndexNow."
		/>

		<UTabs
			v-model="tab"
			:items="tabs"
			:content="false"
			class="mb-5"
		/>

		<!-- Inspect -->
		<section v-if="tab === 'inspect'">
			<StateBox
				v-if="!settings.defaultSite"
				kind="empty"
				title="Belum ada situs aktif"
				hint="Pilih situs di bar atas. Inspeksi memakai kuota Google 2.000 URL per situs per hari."
			/>
			<template v-else>
				<div class="grid gap-4 lg:grid-cols-[1fr_20rem]">
					<form
						class="panel space-y-3 p-4"
						@submit.prevent="inspect"
					>
						<UFormField
							label="URL yang dicek, satu per baris"
							:hint="`${urls.length} URL valid`"
						>
							<UTextarea
								v-model="urlText"
								:rows="8"
								placeholder="https://contoh.com/halaman"
								class="font-mono"
							/>
						</UFormField>
						<UButton
							type="submit"
							color="primary"
							variant="solid"
							icon="ph:magnifying-glass"
							label="Cek status index"
							:loading="inspectState === 'loading'"
							:disabled="!urls.length || urls.length > 2000"
						/>
						<p
							v-if="urls.length > 2000"
							class="text-sm text-error"
						>
							Maksimal 2.000 URL per proses.
						</p>
					</form>
					<form
						class="panel space-y-3 p-4"
						@submit.prevent="fromSitemap"
					>
						<UFormField
							label="Isi dari sitemap"
							hint="Tanpa login"
						>
							<UInput
								v-model="sitemapUrl"
								type="url"
								required
								placeholder="https://contoh.com/sitemap.xml"
							/>
						</UFormField>
						<UButton
							type="submit"
							icon="ph:download-simple"
							label="Muat URL"
							:loading="loadingSitemap"
						/>
					</form>
				</div>
				<div class="mt-5">
					<StateBox
						v-if="inspectState === 'idle'"
						kind="empty"
						title="Belum ada hasil inspeksi"
						hint="Tempel URL atau muat dari sitemap, lalu cek. Hasil menunjukkan status saat Google terakhir memeriksa, bukan kondisi index real time."
					/>
					<StateBox
						v-else-if="inspectState === 'loading'"
						kind="loading"
						title="Memeriksa URL ke Google"
						hint="Sekitar 1 detik per URL. Jangan tutup aplikasi."
					/>
					<StateBox
						v-else-if="inspectState === 'error' && inspectError"
						kind="error"
						title="Inspeksi gagal"
						:hint="inspectError.message"
						:next="inspectError.next"
					/>
					<ResultView
						v-else
						:data="inspectData"
						name="inspeksi-url"
					/>
				</div>
			</template>
		</section>

		<!-- gis -->
		<section v-else-if="tab === 'gis'">
			<div
				class="panel mb-4 border-warning p-4 text-sm"
				role="note"
			>
				<p class="font-medium text-highlighted">
					Batasan Google Indexing API
				</p>
				<p class="mt-1 text-muted">
					API ini resmi hanya untuk halaman dengan data terstruktur JobPosting atau BroadcastEvent. Mengirim halaman lain bisa berhasil di log tapi tidak mempercepat index. Indexing tidak sama dengan ranking. Situs wajib punya sitemap yang sudah terdaftar di Search Console.
				</p>
			</div>
			<form
				class="panel mb-4 space-y-3 p-4"
				@submit.prevent="runGis"
			>
				<UFormField
					label="Domain atau URL"
					hint="Contoh: contoh.com"
				>
					<UInput
						v-model="gisTarget"
						required
					/>
				</UFormField>
				<UFormField
					label="File service account (JSON)"
					hint="Kosong: memakai ~/.gis/service_account.json"
				>
					<div class="flex gap-2">
						<UInput
							v-model="settings.serviceAccountPath"
							placeholder="C:\kunci\service_account.json"
						/>
						<UButton
							icon="ph:folder-open"
							label="Pilih"
							@click="chooseKey"
						/>
					</div>
				</UFormField>
				<UFormField
					label="Hanya URL ini (opsional)"
					hint="Kosong: semua URL dari sitemap yang belum ter-index"
				>
					<UTextarea
						v-model="gisUrls"
						:rows="3"
						class="font-mono"
						placeholder="https://contoh.com/lowongan-1"
					/>
				</UFormField>
				<USwitch
					v-model="rpmRetry"
					label="Ulangi otomatis saat kena batas per menit"
					description="Flag --rpm-retry"
				/>
				<div class="flex gap-2">
					<UButton
						type="submit"
						color="primary"
						variant="solid"
						icon="ph:paper-plane-tilt"
						label="Jalankan gis"
						:loading="gisJob.running.value"
						:disabled="!gisTarget.trim()"
					/>
				</div>
			</form>
			<LogPanel
				:lines="gisJob.lines.value"
				:running="gisJob.running.value"
				:error="gisJob.error.value"
				empty-hint="Output google-indexing-script muncul di sini baris demi baris."
				@cancel="gisJob.cancel"
			/>
		</section>

		<!-- IndexNow -->
		<section v-else>
			<div class="grid gap-4 lg:grid-cols-2">
				<form
					class="panel space-y-3 p-4"
					@submit.prevent="sendNow"
				>
					<UFormField label="Key IndexNow">
						<div class="flex gap-2">
							<UInput
								v-model="settings.indexNowKey"
								required
								minlength="8"
								maxlength="128"
								class="font-mono"
							/>
							<UButton
								icon="ph:key"
								label="Buat key"
								@click="genKey"
							/>
						</div>
					</UFormField>
					<UFormField
						label="Host"
						:hint="`Dipakai: ${nowHost || 'belum ada'}`"
					>
						<UInput
							v-model="settings.indexNowHost"
							placeholder="Kosong: diambil dari URL pertama"
						/>
					</UFormField>
					<UFormField
						label="URL, satu per baris"
						:hint="`${nowList.length} URL valid, maks 10.000`"
					>
						<UTextarea
							v-model="nowUrls"
							:rows="6"
							class="font-mono"
							placeholder="https://contoh.com/artikel-baru"
						/>
					</UFormField>
					<UFormField label="Tujuan">
						<USelect
							v-model="endpoint"
							:items="endpoints"
						/>
					</UFormField>
					<UButton
						type="submit"
						color="primary"
						variant="solid"
						icon="ph:paper-plane-tilt"
						label="Kirim ke IndexNow"
						:loading="nowBusy"
						:disabled="!nowList.length || !settings.indexNowKey || !nowHost"
					/>
				</form>
				<div class="space-y-4">
					<div class="panel p-4 text-sm">
						<p class="font-medium text-highlighted">
							Pasang file key dulu
						</p>
						<ol class="mt-2 list-decimal space-y-1 pl-5 text-muted">
							<li>Buat key di samping, lalu simpan sebagai file teks.</li>
							<li>Unggah ke root situs: <code class="font-mono break-all">https://{{ nowHost || 'domain-kamu' }}/{{ settings.indexNowKey || 'key' }}.txt</code></li>
							<li>Isi file hanya berisi key itu, tanpa spasi atau baris lain.</li>
						</ol>
						<div class="mt-3 flex flex-wrap gap-2">
							<UButton
								size="sm"
								icon="ph:file-arrow-down"
								label="Simpan file key"
								:disabled="!settings.indexNowKey"
								@click="saveText(`${settings.indexNowKey}.txt`, settings.indexNowKey, 'txt')"
							/>
							<UButton
								size="sm"
								icon="ph:copy"
								label="Salin key"
								:disabled="!settings.indexNowKey"
								@click="copy(settings.indexNowKey, 'Key')"
							/>
						</div>
						<p class="mt-3 text-muted">
							IndexNow dibaca Bing, Yandex, Naver, dan Seznam. Google tidak ikut, jadi untuk Google tetap pakai sitemap dan Search Console.
						</p>
					</div>
					<div
						v-if="nowResult"
						class="panel p-4"
						:class="nowResult.ok ? 'border-success' : 'border-error'"
						role="status"
					>
						<p class="font-medium text-highlighted">
							{{ nowResult.ok ? 'Terkirim' : 'Gagal' }}
							<span class="num text-sm font-normal text-muted">(HTTP {{ nowResult.status || '-' }})</span>
						</p>
						<p class="mt-1 text-sm break-words text-muted">
							{{ nowResult.text }}
						</p>
					</div>
					<StateBox
						v-else
						kind="empty"
						title="Belum ada pengiriman"
						hint="Status dari server IndexNow muncul di sini setelah kamu mengirim."
					/>
				</div>
			</div>
		</section>
	</div>
</template>
