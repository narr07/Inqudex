<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import ToolSiteAudit from '~/components/tools/ToolSiteAudit.vue'
import ToolMetaChecker from '~/components/tools/ToolMetaChecker.vue'
import ToolSchemaValidator from '~/components/tools/ToolSchemaValidator.vue'
import ToolSocialDebugger from '~/components/tools/ToolSocialDebugger.vue'
import ToolRobotsGenerator from '~/components/tools/ToolRobotsGenerator.vue'
import ToolRobotsValidator from '~/components/tools/ToolRobotsValidator.vue'
import ToolSitemapValidator from '~/components/tools/ToolSitemapValidator.vue'
import ToolHtmlToMarkdown from '~/components/tools/ToolHtmlToMarkdown.vue'
import ToolKeywordGenerator from '~/components/tools/ToolKeywordGenerator.vue'
import ToolKeywordResearch from '~/components/tools/ToolKeywordResearch.vue'
import ToolSerpAnalyzer from '~/components/tools/ToolSerpAnalyzer.vue'
import ToolDomainRankings from '~/components/tools/ToolDomainRankings.vue'

useHead({ title: 'SEO Tools Suite | Inqudex' })

const route = useRoute()
const router = useRouter()
const { copy } = useExport()
const job = useJob()

interface SeoToolItem {
	id: string
	title: string
	category: 'audit' | 'technical' | 'serp'
	categoryLabel: string
	description: string
	icon: string
	badge?: string
}

const toolsList: SeoToolItem[] = [
	// SEO Audit
	{
		id: 'site-audit',
		title: 'Site Audit',
		category: 'audit',
		categoryLabel: 'SEO Audit',
		description: 'Pemeriksaan cepat satu halaman untuk sinyal indexabilitas, metadata, heading, struktur skema, dan media sosial.',
		icon: 'ph:list-magnifying-glass',
		badge: 'On-Page'
	},
	{
		id: 'meta-tag-checker',
		title: 'Meta Tag Checker',
		category: 'audit',
		categoryLabel: 'SEO Audit',
		description: 'Inspeksi title, description, robots directives, piksel SERP, serta simulasi tampilan cuplikan Google Desktop & Mobile.',
		icon: 'ph:tag',
		badge: 'SERP Preview'
	},
	{
		id: 'schema-validator',
		title: 'Schema.org Validator',
		category: 'audit',
		categoryLabel: 'SEO Audit',
		description: 'Validasi sintaks JSON-LD dan Microdata, inspeksi pohon hierarki Schema, dan kelayakan Google Rich Results.',
		icon: 'ph:code',
		badge: 'Rich Results'
	},
	{
		id: 'social-share-debugger',
		title: 'Social Share Debugger',
		category: 'audit',
		categoryLabel: 'SEO Audit',
		description: 'Pratinjau visual dan debugging kartu Open Graph untuk Twitter/X, Facebook, LinkedIn, dan Discord.',
		icon: 'ph:share-network',
		badge: 'Open Graph'
	},

	// Technical SEO
	{
		id: 'robots-txt-generator',
		title: 'Robots.txt Generator',
		category: 'technical',
		categoryLabel: 'Technical SEO',
		description: 'Bangun berkas robots.txt visual dan kelola izin crawler AI (GPTBot, ClaudeBot, Perplexity) serta bot pencari.',
		icon: 'ph:robot',
		badge: 'Generator'
	},
	{
		id: 'robots-txt-validator',
		title: 'Robots.txt Validator',
		category: 'technical',
		categoryLabel: 'Technical SEO',
		description: 'Uji aturan akses URL path terhadap user-agent terpilih berdasarkan spesifikasi resmi RFC 9309.',
		icon: 'ph:shield-check',
		badge: 'RFC 9309'
	},
	{
		id: 'xml-sitemap-validator',
		title: 'XML Sitemap Validator',
		category: 'technical',
		categoryLabel: 'Technical SEO',
		description: 'Validasi sitemap atau sitemap index, deteksi duplikasi URL, format tanggal lastmod, dan batas 50.000 entri.',
		icon: 'ph:tree-structure',
		badge: 'Sitemap XML'
	},
	{
		id: 'html-to-markdown',
		title: 'HTML to Markdown',
		category: 'technical',
		categoryLabel: 'Technical SEO',
		description: 'Konversi halaman web atau HTML menjadi Markdown bersih untuk Nuxt Content atau konteks LLM / llms.txt.',
		icon: 'ph:file-text',
		badge: 'LLM & AEO'
	},

	// Keyword & SERP
	{
		id: 'keyword-generator',
		title: 'Keyword Idea Generator',
		category: 'serp',
		categoryLabel: 'Keyword & SERP',
		description: 'Klusterisasi ide kata kunci berdasarkan search intent (Informasional, Komersial, Transaksional, Pertanyaan).',
		icon: 'ph:lightbulb',
		badge: 'Intent Clusters'
	},
	{
		id: 'keyword-research',
		title: 'Keyword Research',
		category: 'serp',
		categoryLabel: 'Keyword & SERP',
		description: 'Eksplorasi saran autocomplete live Google dan Bing dengan ekspansi variasi mendalam Alphabet Soup.',
		icon: 'ph:magnifying-glass-plus',
		badge: 'Live Suggest'
	},
	{
		id: 'serp-analyzer',
		title: 'SERP Analyzer',
		category: 'serp',
		categoryLabel: 'Keyword & SERP',
		description: 'Inspeksi hasil 10 besar pencarian, deteksi fitur SERP (Featured Snippets, PAA), dan statistik panjang title kompetitor.',
		icon: 'ph:chart-bar',
		badge: 'SERP Features'
	},
	{
		id: 'domain-rankings',
		title: 'Domain Rankings',
		category: 'serp',
		categoryLabel: 'Keyword & SERP',
		description: 'Pantau distribusi peringkat domain, peluang striking distance halaman 2 ke halaman 1, dan estimasi klik.',
		icon: 'ph:trophy',
		badge: 'Rank Tracker'
	}
]

// External & Integrated Tools Reference
interface ExternalTool {
	name: string
	what: string
	cost: string
	url: string
	install?: string
	where?: string
}

const integrated: ExternalTool[] = [
	{ name: 'gscdump', what: 'Data Search Console, laporan peluang, sitemap, inspeksi URL, ekspor Bing.', cost: 'Gratis dengan kredensial Google milikmu sendiri (mode Local).', url: 'https://gscdump.com', install: 'npm install -g @gscdump/cli', where: 'Search Console, Sitemap, Indexing' },
	{ name: 'google-indexing-script', what: 'Mengirim URL sitemap ke Google Indexing API.', cost: 'Gratis, MIT. Kuota harian Google berlaku.', url: 'https://github.com/goenning/google-indexing-script', install: 'npm install -g google-indexing-script', where: 'Indexing' },
	{ name: 'IndexNow', what: 'Memberi tahu Bing, Yandex, Naver, dan Seznam saat URL baru atau berubah.', cost: 'Gratis, protokol terbuka.', url: 'https://www.indexnow.org', where: 'Indexing' },
	{ name: 'PageSpeed Insights API', what: 'Skor Lighthouse dan data pengguna nyata (CrUX) dari server Google.', cost: 'Gratis, kuota kecil tanpa API key.', url: 'https://developers.google.com/speed/docs/insights/v5/get-started', where: 'Kecepatan' }
]

const extra: ExternalTool[] = [
	{ name: 'Unlighthouse', what: 'Lighthouse untuk seluruh halaman situs sekaligus, dengan laporan web.', cost: 'Gratis, open source.', url: 'https://unlighthouse.dev', install: 'npx unlighthouse --site https://contoh.com' },
	{ name: 'Google Rich Results Test', what: 'Cek data terstruktur resmi dari server Google.', cost: 'Gratis, web.', url: 'https://search.google.com/test/rich-results' },
	{ name: 'Schema Markup Validator', what: 'Validasi JSON-LD dan schema.org umum.', cost: 'Gratis, web.', url: 'https://validator.schema.org' },
	{ name: 'Screaming Frog SEO Spider', what: 'Crawler desktop yang matang (gratis hingga 500 URL).', cost: 'Gratis terbatas.', url: 'https://www.screamingfrog.co.uk/seo-spider/' }
]

// CLI Runners
const runners = [
	{ id: 'linkinator', label: 'linkinator: cek link rusak', cmd: (u: string) => ['-y', 'linkinator', u, '--recurse', '--skip', '^(?!' + u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')'] },
	{ id: 'pa11y', label: 'pa11y: cek aksesibilitas satu halaman', cmd: (u: string) => ['-y', 'pa11y', u] }
]
const runner = ref('linkinator')
const targetCli = ref('')
const pickedCli = computed(() => runners.find(r => r.id === runner.value)!)

async function runCli() {
	await job.start('npx', pickedCli.value.cmd(targetCli.value.trim()))
}

// Active tool management
const activeToolId = ref<string | null>(null)
const searchQuery = ref('')
const selectedCategory = ref<'audit' | 'technical' | 'serp' | 'cli' | 'ecosystem'>('audit')

// Sync with query param ?tool=...
watch(() => route.query.tool, (t) => {
	if (typeof t === 'string' && toolsList.some(item => item.id === t)) {
		activeToolId.value = t
	} else if (!t) {
		activeToolId.value = null
	}
}, { immediate: true })

function selectTool(id: string) {
	activeToolId.value = id
	router.push({ query: { ...route.query, tool: id } })
}

function clearTool() {
	activeToolId.value = null
	const q = { ...route.query }
	delete q.tool
	router.push({ query: q })
}

const activeTool = computed(() => toolsList.find(t => t.id === activeToolId.value))

const filteredTools = computed(() => {
	return toolsList.filter(t => {
		const matchCat = t.category === selectedCategory.value
		const matchQuery = !searchQuery.value.trim() ||
			t.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
			t.description.toLowerCase().includes(searchQuery.value.toLowerCase())
		return matchCat && matchQuery
	})
})

const componentMap: Record<string, any> = {
	'site-audit': markRaw(ToolSiteAudit),
	'meta-tag-checker': markRaw(ToolMetaChecker),
	'schema-validator': markRaw(ToolSchemaValidator),
	'social-share-debugger': markRaw(ToolSocialDebugger),
	'robots-txt-generator': markRaw(ToolRobotsGenerator),
	'robots-txt-validator': markRaw(ToolRobotsValidator),
	'xml-sitemap-validator': markRaw(ToolSitemapValidator),
	'html-to-markdown': markRaw(ToolHtmlToMarkdown),
	'keyword-generator': markRaw(ToolKeywordGenerator),
	'keyword-research': markRaw(ToolKeywordResearch),
	'serp-analyzer': markRaw(ToolSerpAnalyzer),
	'domain-rankings': markRaw(ToolDomainRankings)
}

const categoryTabs = computed<NavigationMenuItem[]>(() => [
	{
		label: 'SEO Audit (4)',
		icon: 'ph:list-magnifying-glass',
		active: selectedCategory.value === 'audit',
		onSelect: () => { selectedCategory.value = 'audit' }
	},
	{
		label: 'Technical SEO (4)',
		icon: 'ph:robot',
		active: selectedCategory.value === 'technical',
		onSelect: () => { selectedCategory.value = 'technical' }
	},
	{
		label: 'Keyword & SERP (4)',
		icon: 'ph:text-aa',
		active: selectedCategory.value === 'serp',
		onSelect: () => { selectedCategory.value = 'serp' }
	},
	{
		label: 'CLI Runners',
		icon: 'ph:terminal',
		active: selectedCategory.value === 'cli',
		onSelect: () => { selectedCategory.value = 'cli' }
	},
	{
		label: 'Ekosistem',
		icon: 'ph:globe',
		active: selectedCategory.value === 'ecosystem',
		onSelect: () => { selectedCategory.value = 'ecosystem' }
	}
])

interface SeoGroup {
	id: 'audit' | 'technical' | 'serp'
	title: string
	subtitle: string
	dotColor: string
	tools: SeoToolItem[]
}

const seoGroups = computed<SeoGroup[]>(() => [
	{
		id: 'audit',
		title: 'SEO AUDIT',
		subtitle: 'Check & validate',
		dotColor: 'bg-emerald-400',
		tools: toolsList.filter(t => t.category === 'audit')
	},
	{
		id: 'technical',
		title: 'TECHNICAL SEO',
		subtitle: 'Generate & convert',
		dotColor: 'bg-blue-400',
		tools: toolsList.filter(t => t.category === 'technical')
	},
	{
		id: 'serp',
		title: 'KEYWORD & SERP',
		subtitle: 'Research & analyze',
		dotColor: 'bg-amber-400',
		tools: toolsList.filter(t => t.category === 'serp')
	}
])


const activeCategoryTools = computed(() => {
	if (!activeTool.value) return []
	return toolsList.filter(t => t.category === activeTool.value!.category)
})

const toolTabs = computed<NavigationMenuItem[]>(() => {
	return activeCategoryTools.value.map(t => ({
		label: t.title,
		icon: t.icon,
		active: activeToolId.value === t.id,
		onSelect: () => { selectTool(t.id) }
	}))
})

// Popover state for quick navigation in active tool view
const isMenuOpen = ref(false)
</script>

<template>
	<div>
		<!-- Page Header -->
		<PageHead
			:title="activeTool ? activeTool.title : 'SEO Tools Suite'"
			:description="activeTool ? activeTool.description : '12 tool fokus untuk metadata, crawling, validasi sitemap, LLM markdown, serta riset kata kunci dan SERP ala Nuxt SEO.'"
		/>

		<!-- ACTIVE TOOL VIEW -->
		<div
			v-if="activeTool"
			class="space-y-6"
		>
			<!-- Active Tool Toolbar with Quick Tuntunan Menu Popover & Sub-tool Tabs -->
			<UDashboardToolbar class="border-b border-default pb-2 mb-4">
				<template #left>
					<UButton
						variant="ghost"
						color="neutral"
						size="xs"
						icon="ph:arrow-left"
						label="Kembali"
						@click="clearTool"
					/>
					<USeparator
						orientation="vertical"
						class="h-4 mx-1"
					/>

					<!-- Quick Tuntunan Menu Popover -->
					<UPopover v-model:open="isMenuOpen">
						<UButton
							variant="subtle"
							color="neutral"
							size="xs"
							icon="ph:squares-four"
							trailing-icon="ph:caret-down"
							label="Tuntunan Menu"
						/>
						<template #content>
							<div class="w-[720px] max-w-[90vw] p-5 rounded-xl bg-card border border-default shadow-xl">
								<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
									<div
										v-for="group in seoGroups"
										:key="group.id"
										class="space-y-3"
									>
										<div>
											<div class="flex items-center gap-1.5">
												<span class="size-2 rounded-full" :class="group.dotColor" />
												<h4 class="text-[11px] font-bold tracking-wider text-highlighted uppercase">
													{{ group.title }}
												</h4>
											</div>
											<p class="text-[11px] text-muted ml-3.5">
												{{ group.subtitle }}
											</p>
										</div>

										<div class="space-y-1">
											<button
												v-for="item in group.tools"
												:key="item.id"
												type="button"
												class="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors hover:bg-muted/70 group"
												:class="activeToolId === item.id ? 'bg-primary/10 text-primary font-medium' : 'text-default'"
												@click="selectTool(item.id); isMenuOpen = false"
											>
												<div class="size-7 rounded-md bg-muted/80 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
													<UIcon
														:name="item.icon"
														class="size-3.5"
														:class="activeToolId === item.id ? 'text-primary' : 'text-muted group-hover:text-primary'"
													/>
												</div>
												<span class="truncate">{{ item.title }}</span>
											</button>
										</div>
									</div>
								</div>

								<div class="mt-4 pt-3 border-t border-default/60 flex items-center justify-between text-xs">
									<button
										type="button"
										class="text-xs text-muted hover:text-primary flex items-center gap-1.5 transition-colors"
										@click="clearTool(); isMenuOpen = false"
									>
										<UIcon name="ph:wrench" class="size-3.5" />
										<span>Lihat semua ringkasan tools &rarr;</span>
									</button>
									<span class="text-[11px] text-muted">12 Tools Terintegrasi</span>
								</div>
							</div>
						</template>
					</UPopover>

					<USeparator
						orientation="vertical"
						class="h-4 mx-1"
					/>

					<UNavigationMenu
						:items="toolTabs"
						highlight
						class="-mx-1 overflow-x-auto"
					/>
				</template>

				<template #right>
					<USelect
						:model-value="activeTool.id"
						:items="toolsList.map(t => ({ label: `${t.title} (${t.categoryLabel})`, value: t.id }))"
						size="xs"
						class="w-56"
						@update:model-value="selectTool($event as string)"
					/>
				</template>
			</UDashboardToolbar>

			<!-- Dynamic Tool Component -->
			<component
				:is="componentMap[activeTool.id]"
				v-if="componentMap[activeTool.id]"
			/>
		</div>

		<!-- SUITE DASHBOARD VIEW -->
		<div
			v-else
			class="space-y-6"
		>
			<!-- Nuxt UI Dashboard Toolbar with Navigation Menu Tabs -->
			<UDashboardToolbar class="border-b border-default pb-2">
				<UNavigationMenu
					:items="categoryTabs"
					highlight
					class="-mx-1 flex-1 overflow-x-auto"
				/>

				<template #right>
					<UInput
						v-if="selectedCategory !== 'cli' && selectedCategory !== 'ecosystem'"
						v-model="searchQuery"
						placeholder="Cari tool..."
						icon="ph:magnifying-glass"
						size="xs"
						class="w-48 sm:w-56"
					/>
				</template>
			</UDashboardToolbar>

			<!-- 12 SEO TOOLS GRID -->
			<section
				v-if="selectedCategory === 'audit' || selectedCategory === 'technical' || selectedCategory === 'serp'"
				aria-labelledby="h-tools-grid"
			>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<div
						v-for="t in filteredTools"
						:key="t.id"
						class="panel group relative flex flex-col justify-between p-5 transition-all duration-150 hover:border-primary hover:shadow-xs cursor-pointer"
						@click="selectTool(t.id)"
					>
						<div>
							<div class="flex items-center justify-between">
								<div class="flex size-10 items-center justify-center rounded-lg border border-default bg-muted/60 text-primary group-hover:bg-primary/10">
									<UIcon
										:name="t.icon"
										class="size-5"
									/>
								</div>
								<span
									v-if="t.badge"
									class="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted uppercase tracking-wider"
								>
									{{ t.badge }}
								</span>
							</div>

							<h3 class="mt-4 font-semibold text-highlighted text-base group-hover:text-primary transition-colors">
								{{ t.title }}
							</h3>
							<p class="mt-1.5 text-xs leading-relaxed text-muted">
								{{ t.description }}
							</p>
						</div>

						<div class="mt-4 flex items-center justify-between pt-3 border-t border-default/60 text-xs">
							<span class="text-muted text-[11px] font-medium">{{ t.categoryLabel }}</span>
							<span class="font-medium text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
								Buka Tool →
							</span>
						</div>
					</div>
				</div>
			</section>

			<!-- CLI RUNNERS SECTION -->
			<section
				v-if="selectedCategory === 'all' || selectedCategory === 'cli'"
				class="pt-4"
				aria-labelledby="h-cli"
			>
				<div class="mb-3 flex items-center justify-between">
					<h2
						id="h-cli"
						class="text-base font-semibold text-highlighted"
					>
						CLI Runners Langsung (linkinator & pa11y)
					</h2>
					<span class="text-xs text-muted">Dijalankan lokal di terminal background lewat npx</span>
				</div>

				<form
					class="panel mb-3 grid gap-3 p-4 sm:grid-cols-[1fr_2fr_auto]"
					@submit.prevent="runCli"
				>
					<UFormField label="Tool CLI">
						<USelect
							v-model="runner"
							:items="runners.map(r => ({ label: r.label, value: r.id }))"
						/>
					</UFormField>
					<UFormField
						label="Target URL"
						hint="Pertama kali akan mengunduh paket lewat npx jika belum ada"
					>
						<UInput
							v-model="targetCli"
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
							label="Jalankan CLI"
							:loading="job.running.value"
						/>
					</div>
				</form>
				<LogPanel
					:lines="job.lines.value"
					:running="job.running.value"
					:error="job.error.value"
					empty-hint="Output stdout/stderr CLI akan muncul secara real-time di sini."
					@cancel="job.cancel"
				/>
			</section>

			<!-- INTEGRATED & EXTERNAL ECOSYSTEM -->
			<section
				v-if="selectedCategory === 'all' || selectedCategory === 'ecosystem'"
				class="pt-4 space-y-6"
				aria-labelledby="h-eco"
			>
				<div>
					<h2
						id="h-eco"
						class="mb-3 text-base font-semibold text-highlighted"
					>
						Tool & Ekosistem Terintegrasi
					</h2>
					<ul class="panel divide-y divide-default">
						<li
							v-for="t in integrated"
							:key="t.name"
							class="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:gap-x-6 text-xs"
						>
							<div class="min-w-0">
								<p class="font-medium text-highlighted text-sm">
									{{ t.name }}
									<span class="ml-2 text-xs font-normal text-muted">dipakai di {{ t.where }}</span>
								</p>
								<p class="mt-0.5 text-muted">
									{{ t.what }}
								</p>
								<p class="mt-1 text-toned">
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
				</div>

				<div>
					<h2 class="mb-3 text-base font-semibold text-highlighted">
						Referensi Tool Eksternal
					</h2>
					<ul class="panel divide-y divide-default">
						<li
							v-for="t in extra"
							:key="t.name"
							class="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:gap-x-6 text-xs"
						>
							<div class="min-w-0">
								<p class="font-medium text-highlighted text-sm">
									{{ t.name }}
								</p>
								<p class="mt-0.5 text-muted">
									{{ t.what }}
								</p>
								<code
									v-if="t.install"
									class="mt-1 inline-block rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted break-all"
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
				</div>
			</section>
		</div>
	</div>
</template>
