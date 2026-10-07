<script setup lang="ts">
useHead({ title: 'Tool gratis | Inqudex' })

const cli = useCli()
const { copy } = useExport()
const job = useJob()

interface Tool {
	name: string
	what: string
	cost: string
	url: string
	install?: string
	where?: string
}

const integrated: Tool[] = [
	{ name: 'gscdump', what: 'Data Search Console, laporan peluang, sitemap, inspeksi URL, ekspor Bing.', cost: 'Gratis dengan kredensial Google milikmu sendiri (mode Local).', url: 'https://gscdump.com', install: 'npm install -g @gscdump/cli', where: 'Search Console, Sitemap, Indexing' },
	{ name: 'google-indexing-script', what: 'Mengirim URL sitemap ke Google Indexing API.', cost: 'Gratis, MIT. Kuota harian Google berlaku.', url: 'https://github.com/goenning/google-indexing-script', install: 'npm install -g google-indexing-script', where: 'Indexing' },
	{ name: 'IndexNow', what: 'Memberi tahu Bing, Yandex, Naver, dan Seznam saat URL baru atau berubah.', cost: 'Gratis, protokol terbuka.', url: 'https://www.indexnow.org', where: 'Indexing' },
	{ name: 'PageSpeed Insights API', what: 'Skor Lighthouse dan data pengguna nyata (CrUX) dari server Google.', cost: 'Gratis, kuota kecil tanpa API key.', url: 'https://developers.google.com/speed/docs/insights/v5/get-started', where: 'Kecepatan' },
	{ name: 'Lighthouse', what: 'Tes performa, SEO, aksesibilitas di komputer sendiri.', cost: 'Gratis, open source. Butuh Chrome.', url: 'https://github.com/GoogleChrome/lighthouse', install: 'npm install -g lighthouse', where: 'Kecepatan' },
	{ name: 'Saran pencarian Google dan Bing', what: 'Ide kata kunci dari kolom pencarian.', cost: 'Gratis. Endpoint tidak resmi, bisa berubah atau dibatasi.', url: 'https://www.bing.com/webmasters', where: 'Kata kunci' }
]

const extra: Tool[] = [
	{ name: 'Unlighthouse', what: 'Lighthouse untuk seluruh halaman situs sekaligus, dengan laporan web.', cost: 'Gratis, open source.', url: 'https://unlighthouse.dev', install: 'npx unlighthouse --site https://contoh.com' },
	{ name: 'Bing Webmaster Tools', what: 'Sumber data Bing. gscdump sudah punya perintah bing, tinggal dihubungkan ke GUI.', cost: 'Gratis.', url: 'https://www.bing.com/webmasters', install: 'gscdump bing login --mode local' },
	{ name: 'Google Rich Results Test', what: 'Cek data terstruktur yang memenuhi syarat tampilan khusus.', cost: 'Gratis, hanya lewat web.', url: 'https://search.google.com/test/rich-results' },
	{ name: 'Schema Markup Validator', what: 'Validasi JSON-LD dan schema.org umum.', cost: 'Gratis, hanya lewat web.', url: 'https://validator.schema.org' },
	{ name: 'Screaming Frog SEO Spider', what: 'Crawler desktop yang matang. Versi gratis dibatasi 500 URL.', cost: 'Gratis terbatas, bukan open source.', url: 'https://www.screamingfrog.co.uk/seo-spider/' },
	{ name: 'Google Trends', what: 'Perbandingan minat pencarian antar kata kunci dan wilayah.', cost: 'Gratis, hanya lewat web.', url: 'https://trends.google.com' }
]

/* Two extra CLIs can run right here. */
const runners = [
	{ id: 'linkinator', label: 'linkinator: cek link rusak', cmd: (u: string) => ['-y', 'linkinator', u, '--recurse', '--skip', '^(?!' + u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')'] },
	{ id: 'pa11y', label: 'pa11y: cek aksesibilitas satu halaman', cmd: (u: string) => ['-y', 'pa11y', u] }
]
const runner = ref('linkinator')
const target = ref('')
const picked = computed(() => runners.find(r => r.id === runner.value)!)

async function go() {
	await job.start('npx', picked.value.cmd(target.value.trim()))
}
</script>

<template>
	<div>
		<PageHead
			title="Tool gratis"
			description="Yang sudah terhubung di aplikasi ini, tool tambahan yang layak dicoba, dan dua CLI yang bisa langsung dijalankan di sini."
		/>

		<section
			class="mb-8"
			aria-labelledby="h-int"
		>
			<h2
				id="h-int"
				class="mb-3 text-lg font-semibold text-highlighted"
			>
				Sudah terhubung
			</h2>
			<ul class="panel divide-y divide-default">
				<li
					v-for="t in integrated"
					:key="t.name"
					class="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:gap-x-6"
				>
					<div class="min-w-0">
						<p class="font-medium text-highlighted">
							{{ t.name }}
							<span class="ml-2 text-sm font-normal text-muted">dipakai di {{ t.where }}</span>
						</p>
						<p class="text-sm text-muted">
							{{ t.what }}
						</p>
						<p class="mt-1 text-sm text-toned">
							{{ t.cost }}
						</p>
					</div>
					<div class="flex flex-wrap items-start gap-2">
						<UButton
							v-if="t.install"
							size="xs"
							icon="ph:copy"
							label="Salin install"
							@click="copy(t.install, 'Perintah install')"
						/>
						<UButton
							size="xs"
							icon="ph:arrow-square-out"
							label="Buka situs"
							@click="openExternal(t.url)"
						/>
					</div>
				</li>
			</ul>
		</section>

		<section
			class="mb-8"
			aria-labelledby="h-run"
		>
			<h2
				id="h-run"
				class="mb-3 text-lg font-semibold text-highlighted"
			>
				Jalankan CLI tambahan
			</h2>
			<form
				class="panel mb-3 grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto]"
				@submit.prevent="go"
			>
				<UFormField label="Tool">
					<USelect
						v-model="runner"
						:items="runners.map(r => ({ label: r.label, value: r.id }))"
					/>
				</UFormField>
				<UFormField
					label="URL"
					hint="Dijalankan lewat npx, pertama kali akan mengunduh paketnya"
				>
					<UInput
						v-model="target"
						type="url"
						required
						placeholder="https://contoh.com/"
					/>
				</UFormField>
				<div class="flex items-end">
					<UButton
						type="submit"
						color="primary"
						variant="solid"
						icon="ph:play"
						label="Jalankan"
						:loading="job.running.value"
					/>
				</div>
			</form>
			<LogPanel
				:lines="job.lines.value"
				:running="job.running.value"
				:error="job.error.value"
				empty-hint="Output tool yang dijalankan muncul di sini."
				@cancel="job.cancel"
			/>
		</section>

		<section aria-labelledby="h-extra">
			<h2
				id="h-extra"
				class="mb-3 text-lg font-semibold text-highlighted"
			>
				Layak dicoba berikutnya
			</h2>
			<ul class="panel divide-y divide-default">
				<li
					v-for="t in extra"
					:key="t.name"
					class="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:gap-x-6"
				>
					<div class="min-w-0">
						<p class="font-medium text-highlighted">
							{{ t.name }}
						</p>
						<p class="text-sm text-muted">
							{{ t.what }}
						</p>
						<p class="mt-1 text-sm text-toned">
							{{ t.cost }}
						</p>
						<code
							v-if="t.install"
							class="mt-1 inline-block rounded-sm bg-muted px-2 py-0.5 font-mono text-xs break-all"
						>{{ t.install }}</code>
					</div>
					<div class="flex flex-wrap items-start gap-2">
						<UButton
							v-if="t.install"
							size="xs"
							icon="ph:copy"
							label="Salin perintah"
							@click="copy(t.install, 'Perintah')"
						/>
						<UButton
							size="xs"
							icon="ph:arrow-square-out"
							label="Buka situs"
							@click="openExternal(t.url)"
						/>
					</div>
				</li>
			</ul>
		</section>
	</div>
</template>
