<script setup lang="ts">
import { generateRobotsTxt, type RobotsConfig } from '~/composables/useSeoTools'

const { copy } = useExport()

const config = reactive<RobotsConfig>({
	allowAllSearch: true,
	sitemaps: ['https://contoh.com/sitemap.xml'],
	disallowPaths: ['/admin/', '/private/'],
	allowPaths: ['/'],
	aiCrawlers: {
		'GPTBot': 'disallow',
		'ClaudeBot': 'disallow',
		'PerplexityBot': 'disallow',
		'CCBot': 'disallow',
		'Google-Extended': 'disallow',
		'Bytespider': 'disallow',
		'Applebot-Extended': 'disallow'
	},
	crawlDelay: undefined,
	host: ''
})

const newDisallow = ref('')
const newAllow = ref('')
const newSitemap = ref('')

function addDisallow() {
	const val = newDisallow.value.trim()
	if (val && !config.disallowPaths.includes(val)) {
		config.disallowPaths.push(val)
		newDisallow.value = ''
	}
}

function removeDisallow(idx: number) {
	config.disallowPaths.splice(idx, 1)
}

function addAllow() {
	const val = newAllow.value.trim()
	if (val && !config.allowPaths.includes(val)) {
		config.allowPaths.push(val)
		newAllow.value = ''
	}
}

function removeAllow(idx: number) {
	config.allowPaths.splice(idx, 1)
}

function addSitemap() {
	const val = newSitemap.value.trim()
	if (val && !config.sitemaps.includes(val)) {
		config.sitemaps.push(val)
		newSitemap.value = ''
	}
}

function removeSitemap(idx: number) {
	config.sitemaps.splice(idx, 1)
}

function applyPreset(preset: 'allow-all' | 'block-ai' | 'strict') {
	if (preset === 'allow-all') {
		config.allowAllSearch = true
		config.disallowPaths = []
		config.allowPaths = ['/']
		Object.keys(config.aiCrawlers).forEach(bot => (config.aiCrawlers[bot] = 'allow'))
	} else if (preset === 'block-ai') {
		config.allowAllSearch = true
		config.disallowPaths = ['/admin/']
		config.allowPaths = ['/']
		Object.keys(config.aiCrawlers).forEach(bot => (config.aiCrawlers[bot] = 'disallow'))
	} else if (preset === 'strict') {
		config.allowAllSearch = false
		config.disallowPaths = ['/']
		config.allowPaths = []
		Object.keys(config.aiCrawlers).forEach(bot => (config.aiCrawlers[bot] = 'disallow'))
	}
}

const generatedCode = computed(() => generateRobotsTxt(config))

function downloadFile() {
	const blob = new Blob([generatedCode.value], { type: 'text/plain;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = 'robots.txt'
	a.click()
	URL.revokeObjectURL(url)
}
</script>

<template>
	<div class="grid gap-6 lg:grid-cols-2">
		<!-- Configuration Builder -->
		<div class="panel p-5 space-y-6">
			<div class="flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
				<div>
					<h3 class="font-semibold text-highlighted">
						Konfigurasi Aturan Crawling
					</h3>
					<p class="text-xs text-muted">
						Atur hak akses crawler pencarian konvensional dan bot AI
					</p>
				</div>
				<!-- Presets -->
				<div class="flex gap-1.5">
					<UButton
						size="xs"
						variant="ghost"
						color="neutral"
						label="Blokir AI"
						@click="applyPreset('block-ai')"
					/>
					<UButton
						size="xs"
						variant="ghost"
						color="neutral"
						label="Buka Semua"
						@click="applyPreset('allow-all')"
					/>
				</div>
			</div>

			<!-- Disallowed Paths -->
			<div class="space-y-2">
				<label class="text-xs font-semibold text-highlighted">
					Path yang Diblokir (Disallow)
				</label>
				<div class="flex gap-2">
					<UInput
						v-model="newDisallow"
						placeholder="/admin/ atau /checkout/"
						class="flex-1 text-xs"
						@keydown.enter.prevent="addDisallow"
					/>
					<UButton
						size="xs"
						icon="ph:plus"
						label="Tambah"
						@click="addDisallow"
					/>
				</div>
				<div
					v-if="config.disallowPaths.length"
					class="flex flex-wrap gap-1.5 mt-2"
				>
					<span
						v-for="(p, i) in config.disallowPaths"
						:key="i"
						class="flex items-center gap-1 rounded bg-error/10 px-2 py-0.5 font-mono text-xs text-error"
					>
						{{ p }}
						<button
							type="button"
							class="hover:text-highlighted"
							@click="removeDisallow(i)"
						>✕</button>
					</span>
				</div>
			</div>

			<!-- Allowed Paths -->
			<div class="space-y-2">
				<label class="text-xs font-semibold text-highlighted">
					Path yang Diizinkan (Allow)
				</label>
				<div class="flex gap-2">
					<UInput
						v-model="newAllow"
						placeholder="/"
						class="flex-1 text-xs"
						@keydown.enter.prevent="addAllow"
					/>
					<UButton
						size="xs"
						icon="ph:plus"
						label="Tambah"
						@click="addAllow"
					/>
				</div>
				<div
					v-if="config.allowPaths.length"
					class="flex flex-wrap gap-1.5 mt-2"
				>
					<span
						v-for="(p, i) in config.allowPaths"
						:key="i"
						class="flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 font-mono text-xs text-success"
					>
						{{ p }}
						<button
							type="button"
							class="hover:text-highlighted"
							@click="removeAllow(i)"
						>✕</button>
					</span>
				</div>
			</div>

			<!-- AI Crawlers Matrix -->
			<div class="space-y-3 pt-2">
				<div class="flex items-center justify-between">
					<label class="text-xs font-semibold text-highlighted">
						Matriks Crawler AI & LLM
					</label>
					<span class="text-[11px] text-muted">GPTBot, ClaudeBot, Perplexity, dll.</span>
				</div>
				<div class="divide-y divide-default rounded-lg border border-default bg-muted/20">
					<div
						v-for="(mode, bot) in config.aiCrawlers"
						:key="bot"
						class="flex items-center justify-between p-2.5 text-xs"
					>
						<span class="font-mono text-highlighted">{{ bot }}</span>
						<div class="flex items-center gap-1">
							<button
								type="button"
								class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
								:class="mode === 'disallow' ? 'bg-error text-white' : 'text-muted hover:text-highlighted'"
								@click="config.aiCrawlers[bot] = 'disallow'"
							>
								Disallow
							</button>
							<button
								type="button"
								class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
								:class="mode === 'allow' ? 'bg-success text-white' : 'text-muted hover:text-highlighted'"
								@click="config.aiCrawlers[bot] = 'allow'"
							>
								Allow
							</button>
							<button
								type="button"
								class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors"
								:class="mode === 'inherit' ? 'bg-panel text-highlighted border border-default' : 'text-muted hover:text-highlighted'"
								@click="config.aiCrawlers[bot] = 'inherit'"
							>
								Default
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Sitemap directive -->
			<div class="space-y-2">
				<label class="text-xs font-semibold text-highlighted">
					Direktif Sitemap
				</label>
				<div class="flex gap-2">
					<UInput
						v-model="newSitemap"
						placeholder="https://contoh.com/sitemap.xml"
						class="flex-1 text-xs"
						@keydown.enter.prevent="addSitemap"
					/>
					<UButton
						size="xs"
						icon="ph:plus"
						label="Tambah"
						@click="addSitemap"
					/>
				</div>
				<div
					v-if="config.sitemaps.length"
					class="space-y-1 mt-2"
				>
					<div
						v-for="(sm, i) in config.sitemaps"
						:key="i"
						class="flex items-center justify-between rounded bg-muted/40 px-2.5 py-1 text-xs font-mono"
					>
						<span class="truncate text-highlighted">{{ sm }}</span>
						<button
							type="button"
							class="text-muted hover:text-error ml-2"
							@click="removeSitemap(i)"
						>✕</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Live Code Output -->
		<div class="panel p-5 flex flex-col">
			<div class="mb-3 flex items-center justify-between border-b border-default pb-3">
				<div>
					<h3 class="font-semibold text-highlighted text-xs uppercase tracking-wider">
						Hasil robots.txt
					</h3>
					<span class="text-xs text-muted font-mono">Format standar RFC 9309</span>
				</div>
				<div class="flex items-center gap-2">
					<UButton
						size="xs"
						icon="ph:copy"
						label="Salin"
						@click="copy(generatedCode, 'Isi robots.txt')"
					/>
					<UButton
						size="xs"
						icon="ph:download-simple"
						label="Unduh .txt"
						color="primary"
						variant="solid"
						@click="downloadFile"
					/>
				</div>
			</div>

			<pre class="flex-1 min-h-[360px] overflow-auto rounded bg-ink p-4 font-mono text-xs text-[#e8e4da] leading-relaxed whitespace-pre select-all">{{ generatedCode }}</pre>
		</div>
	</div>
</template>
