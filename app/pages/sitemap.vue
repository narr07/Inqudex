<script setup lang="ts">
import type { Col } from '~/types/table'

useHead({ title: 'Sitemap | Inqudex' })

const { site, gsc } = useGsc()
const settings = useSettings()
const toast = useToast()

interface Sitemap {
	path: string
	type?: string
	isPending?: boolean
	errors?: number
	warnings?: number
	lastDownloaded?: string
	lastSubmitted?: string
}

const state = ref<'idle' | 'loading' | 'error' | 'done'>('idle')
const error = ref<{ message: string; next?: string | null } | null>(null)
const rows = ref<Sitemap[]>([])

async function load() {
	state.value = 'loading'
	error.value = null
	try {
		const data = await gsc<Sitemap[]>(['sitemaps', 'list', '--site', site.value, '--json'])
		rows.value = Array.isArray(data) ? data : []
		state.value = 'done'
	} catch (e) {
		const err = e as CliError
		error.value = { message: err.message, next: err.nextCommand }
		state.value = 'error'
	}
}

watch(() => settings.value.defaultSite, (s) => {
	rows.value = []
	state.value = 'idle'
	if (s && isTauri()) load()
}, { immediate: true })

const date = (v: unknown) => (v ? new Date(v as string).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum pernah')
const cols: Col[] = [
	{ key: 'path', label: 'Sitemap', mono: true },
	{ key: 'errors', label: 'Error', align: 'right' },
	{ key: 'warnings', label: 'Peringatan', align: 'right' },
	{ key: 'lastDownloaded', label: 'Terakhir diunduh Google', format: date },
	{ key: 'lastSubmitted', label: 'Terakhir dikirim', format: date }
]

/* ---- submit / delete with explicit consent ---- */
const newUrl = ref('')
const confirm = reactive({ open: false, action: '' as 'submit' | 'delete' | '', url: '', busy: false })

function ask(action: 'submit' | 'delete', url: string) {
	confirm.action = action
	confirm.url = url
	confirm.open = true
}

async function doConfirm() {
	confirm.busy = true
	try {
		await gsc(['sitemaps', confirm.action, confirm.url, '--site', site.value, '--json'])
		toast.add({ title: confirm.action === 'submit' ? 'Sitemap dikirim ke Google' : 'Sitemap dihapus dari Search Console', description: confirm.url, color: 'success' })
		confirm.open = false
		if (confirm.action === 'submit') newUrl.value = ''
		await load()
	} catch (e) {
		toast.add({ title: 'Gagal', description: (e as Error).message, color: 'error' })
	} finally {
		confirm.busy = false
	}
}

/* ---- discover + list URLs (no auth needed) ---- */
const probe = ref('')
const probeState = ref<'idle' | 'loading' | 'error' | 'done'>('idle')
const probeData = ref<unknown>(null)
const probeError = ref('')
const urlsState = ref<'idle' | 'loading' | 'error' | 'done'>('idle')
const urlsData = ref<unknown>(null)
const urlsError = ref('')
const urlsFor = ref('')

async function discover() {
	probeState.value = 'loading'
	try {
		probeData.value = await gsc(['sitemaps', 'discover', probe.value.trim(), '--json'])
		probeState.value = 'done'
	} catch (e) {
		probeError.value = (e as Error).message
		probeState.value = 'error'
	}
}

async function listUrls(sitemapUrl: string) {
	urlsFor.value = sitemapUrl
	urlsState.value = 'loading'
	try {
		urlsData.value = await gsc(['sitemaps', 'urls', sitemapUrl, '--json'])
		urlsState.value = 'done'
	} catch (e) {
		urlsError.value = (e as Error).message
		urlsState.value = 'error'
	}
}

onMounted(() => {
	if (!probe.value && site.value) probe.value = site.value
})
</script>

<template>
	<div>
		<PageHead
			title="Sitemap"
			description="Lihat sitemap yang diketahui Google, kirim yang baru, atau cari sitemap sebuah domain."
		>
			<template #actions>
				<UButton
					icon="ph:arrows-clockwise"
					label="Muat ulang"
					:loading="state === 'loading'"
					:disabled="!settings.defaultSite"
					@click="load"
				/>
			</template>
		</PageHead>

		<StateBox
			v-if="!settings.defaultSite"
			kind="empty"
			title="Belum ada situs aktif"
			hint="Pilih situs di bar atas untuk melihat sitemap-nya di Search Console."
		/>

		<template v-else>
			<section
				aria-labelledby="h-list"
				class="mb-8"
			>
				<h2
					id="h-list"
					class="mb-3 text-lg font-semibold text-highlighted"
				>
					Terdaftar di Search Console
				</h2>
				<StateBox
					v-if="state === 'loading' || state === 'idle'"
					kind="loading"
					title="Memuat sitemap"
				/>
				<StateBox
					v-else-if="state === 'error' && error"
					kind="error"
					title="Daftar sitemap tidak bisa dimuat"
					:hint="error.message"
					:next="error.next"
				/>
				<StateBox
					v-else-if="!rows.length"
					kind="empty"
					title="Belum ada sitemap terdaftar"
					hint="Kirim URL sitemap di formulir bawah supaya Google mulai membacanya."
				/>
				<div v-else>
					<DataTable
						:columns="cols"
						:rows="rows as unknown as Record<string, unknown>[]"
						:searchable="false"
						export-name="sitemaps"
						caption="Sitemap terdaftar"
					/>
					<ul class="mt-3 flex flex-wrap gap-2">
						<li
							v-for="r in rows"
							:key="r.path"
							class="flex items-center gap-1"
						>
							<UButton
								size="xs"
								icon="ph:list-bullets"
								:label="`URL di ${r.path.replace(/^https?:\/\//, '')}`"
								@click="listUrls(r.path)"
							/>
							<UButton
								size="xs"
								color="error"
								icon="ph:trash"
								:aria-label="`Hapus ${r.path}`"
								@click="ask('delete', r.path)"
							/>
						</li>
					</ul>
				</div>
			</section>

			<section
				v-if="urlsState !== 'idle'"
				class="mb-8"
				aria-live="polite"
			>
				<h2 class="mb-3 text-lg font-semibold break-all text-highlighted">
					URL di {{ urlsFor }}
				</h2>
				<StateBox
					v-if="urlsState === 'loading'"
					kind="loading"
					title="Mengunduh sitemap"
				/>
				<StateBox
					v-else-if="urlsState === 'error'"
					kind="error"
					title="Sitemap tidak bisa dibaca"
					:hint="urlsError"
				/>
				<ResultView
					v-else
					:data="urlsData"
					name="sitemap-urls"
				/>
			</section>

			<div class="grid gap-6 lg:grid-cols-2">
				<section aria-labelledby="h-submit">
					<h2
						id="h-submit"
						class="mb-3 text-lg font-semibold text-highlighted"
					>
						Kirim sitemap
					</h2>
					<form
						class="panel space-y-3 p-4"
						@submit.prevent="ask('submit', newUrl.trim())"
					>
						<UFormField label="URL sitemap">
							<UInput
								v-model="newUrl"
								type="url"
								required
								placeholder="https://contoh.com/sitemap.xml"
							/>
						</UFormField>
						<UButton
							type="submit"
							color="primary"
							variant="solid"
							icon="ph:upload-simple"
							label="Kirim ke Google"
							:disabled="!newUrl.trim()"
						/>
					</form>
				</section>

				<section aria-labelledby="h-discover">
					<h2
						id="h-discover"
						class="mb-3 text-lg font-semibold text-highlighted"
					>
						Cari sitemap sebuah domain
					</h2>
					<form
						class="panel space-y-3 p-4"
						@submit.prevent="discover"
					>
						<UFormField
							label="Domain"
							hint="Tanpa login. Membaca robots.txt dan path umum."
						>
							<UInput
								v-model="probe"
								required
								placeholder="contoh.com"
							/>
						</UFormField>
						<UButton
							type="submit"
							icon="ph:magnifying-glass"
							label="Cari sitemap"
							:loading="probeState === 'loading'"
						/>
						<p
							v-if="probeState === 'error'"
							class="text-sm text-error"
							role="alert"
						>
							{{ probeError }}
						</p>
						<ResultView
							v-else-if="probeState === 'done'"
							:data="probeData"
							name="sitemap-discover"
						/>
					</form>
				</section>
			</div>
		</template>

		<UModal
			v-model:open="confirm.open"
			:title="confirm.action === 'submit' ? 'Kirim sitemap ke Google?' : 'Hapus sitemap dari Search Console?'"
			:description="confirm.action === 'submit' ? 'Perintah ini mengubah data di akun Search Console kamu.' : 'File sitemap di server tidak ikut terhapus, hanya pendaftarannya.'"
		>
			<template #body>
				<p class="font-mono text-sm break-all">
					{{ confirm.url }}
				</p>
				<p class="mt-1 text-sm text-muted">
					Situs: {{ settings.defaultSite }}
				</p>
			</template>
			<template #footer>
				<div class="flex w-full justify-end gap-2">
					<UButton
						label="Batal"
						color="neutral"
						@click="confirm.open = false"
					/>
					<UButton
						:label="confirm.action === 'submit' ? 'Kirim' : 'Hapus'"
						:color="confirm.action === 'delete' ? 'error' : 'primary'"
						variant="solid"
						:loading="confirm.busy"
						@click="doConfirm"
					/>
				</div>
			</template>
		</UModal>
	</div>
</template>
