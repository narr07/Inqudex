<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { isTauri } from '~/composables/useCli'

const route = useRoute()
const colorMode = useColorMode()
const settings = useSettings()
const { sites, sitesLoading, sitesError, loadSites } = useGsc()

const open = ref(false)

const siteItems = computed(() => sites.value.map(s => ({ label: s.siteUrl, value: s.siteUrl })))
const isDark = computed(() => colorMode.value === 'dark')

// Clean separated navigation items with distinct routes (no duplicate /tools routes)
const links: NavigationMenuItem[][] = [
	// Group 0: Utama & Analitik
	[
		{
			label: 'Beranda',
			icon: 'ph:house-line',
			to: '/',
			exact: true,
			onSelect: () => { open.value = false }
		},
		{
			label: 'Search Console',
			icon: 'ph:chart-line-up',
			to: '/search-console',
			onSelect: () => { open.value = false }
		}
	],

	// Group 1: Indexing & Sitemap
	[
		{
			label: 'Batch Indexing',
			icon: 'ph:paper-plane-tilt',
			to: '/indexing',
			onSelect: () => { open.value = false }
		},
		{
			label: 'Sitemap Hub',
			icon: 'ph:tree-structure',
			to: '/sitemap',
			onSelect: () => { open.value = false }
		}
	],

	// Group 2: Audit & Kecepatan
	[
		{
			label: 'Audit Situs (Crawler)',
			icon: 'ph:scan',
			to: '/audit',
			onSelect: () => { open.value = false }
		},
		{
			label: 'Kecepatan Situs',
			icon: 'ph:gauge',
			to: '/speed',
			onSelect: () => { open.value = false }
		}
	],

	// Group 3: Kata Kunci
	[
		{
			label: 'Kata Kunci',
			icon: 'ph:text-aa',
			to: '/keywords',
			onSelect: () => { open.value = false }
		}
	],

	// Group 4: Trafik & SEO Tools Suite
	[
		{
			label: 'Generator Trafik',
			icon: 'ph:arrows-left-right',
			to: '/traffic',
			onSelect: () => { open.value = false }
		},
		{
			label: 'SEO Tools Suite',
			icon: 'ph:toolbox',
			to: '/tools',
			badge: '12 Tool',
			onSelect: () => { open.value = false }
		}
	],

	// Group 5: Pengaturan
	[
		{
			label: 'Pengaturan',
			icon: 'ph:sliders-horizontal',
			to: '/settings',
			onSelect: () => { open.value = false }
		}
	]
]

// Global Search groups for Cmd+K search modal
const searchGroups = computed(() => [
	{
		id: 'nav',
		label: 'Navigasi Menu',
		items: [
			{ label: 'Beranda', to: '/', icon: 'ph:house-line' },
			{ label: 'Search Console', to: '/search-console', icon: 'ph:chart-line-up' },
			{ label: 'Batch Indexing', to: '/indexing', icon: 'ph:paper-plane-tilt' },
			{ label: 'Sitemap Hub', to: '/sitemap', icon: 'ph:tree-structure' },
			{ label: 'Audit Crawler Situs', to: '/audit', icon: 'ph:scan' },
			{ label: 'Kecepatan Situs', to: '/speed', icon: 'ph:gauge' },
			{ label: 'Kata Kunci', to: '/keywords', icon: 'ph:text-aa' },
			{ label: 'Generator Trafik', to: '/traffic', icon: 'ph:arrows-left-right' },
			{ label: 'SEO Tools Suite', to: '/tools', icon: 'ph:toolbox' },
			{ label: 'Pengaturan', to: '/settings', icon: 'ph:sliders-horizontal' }
		]
	},
	{
		id: 'seo-tools',
		label: '12 Nuxt SEO Tools',
		items: [
			{ label: 'Site Audit (On-Page)', to: '/tools?tool=site-audit', icon: 'ph:list-checks' },
			{ label: 'Meta Tag Checker & SERP Preview', to: '/tools?tool=meta-tag-checker', icon: 'ph:tag' },
			{ label: 'Schema.org Validator & Rich Results', to: '/tools?tool=schema-validator', icon: 'ph:code' },
			{ label: 'Social Share Debugger (Open Graph)', to: '/tools?tool=social-share-debugger', icon: 'ph:share-network' },
			{ label: 'Robots.txt Generator (AI Crawlers)', to: '/tools?tool=robots-txt-generator', icon: 'ph:robot' },
			{ label: 'Robots.txt Validator (RFC 9309)', to: '/tools?tool=robots-txt-validator', icon: 'ph:shield-check' },
			{ label: 'XML Sitemap Validator', to: '/tools?tool=xml-sitemap-validator', icon: 'ph:file-code' },
			{ label: 'HTML to Markdown (LLM & AEO)', to: '/tools?tool=html-to-markdown', icon: 'ph:file-text' },
			{ label: 'Keyword Idea Generator (Search Intent)', to: '/tools?tool=keyword-generator', icon: 'ph:lightbulb' },
			{ label: 'Keyword Research Autocomplete', to: '/tools?tool=keyword-research', icon: 'ph:magnifying-glass-plus' },
			{ label: 'SERP Analyzer (Top 10 & Features)', to: '/tools?tool=serp-analyzer', icon: 'ph:chart-bar' },
			{ label: 'Domain Rankings (Striking Distance)', to: '/tools?tool=domain-rankings', icon: 'ph:trophy' }
		]
	}
])

onMounted(() => {
	if (isTauri()) loadSites()
})
</script>

<template>
	<UDashboardGroup unit="rem">
		<!-- Nuxt UI Dashboard Sidebar with Drag-to-Resize, Collapse, and Navigation Menu -->
		<UDashboardSidebar
			id="default"
			v-model:open="open"
			collapsible
			resizable
			class="bg-elevated/25"
			:ui="{ footer: 'lg:border-t lg:border-default' }"
		>
			<!-- Sidebar Header -->
			<template #header="{ collapsed }">
				<NuxtLink
					to="/"
					class="flex items-center gap-2.5 overflow-hidden w-full px-1"
				>
					<span
						class="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--ink)] text-xs font-semibold text-white tracking-wider"
						aria-hidden="true"
					>IN</span>
					<div
						v-if="!collapsed"
						class="min-w-0 flex-1 leading-tight"
					>
						<span class="text-sm font-semibold tracking-tight text-highlighted block truncate">Inqudex</span>
						<span class="text-[10px] text-muted tracking-wider uppercase font-medium truncate block">SEO Suite</span>
					</div>
				</NuxtLink>
			</template>

			<!-- Grouped Navigation Items with Distinct Routes -->
			<template #default="{ collapsed }">
				<UDashboardSearchButton
					:collapsed="collapsed"
					label="Cari menu & tools..."
					class="bg-transparent ring-default mb-2"
				/>

				<div class="space-y-1 w-full">
					<UNavigationMenu
						:collapsed="collapsed"
						:items="links[0]"
						orientation="vertical"
						tooltip
						popover
						:ui="{ link: 'p-1.5 text-xs overflow-hidden' }"
					/>
					<USeparator class="my-1.5 opacity-60" />
					<UNavigationMenu
						:collapsed="collapsed"
						:items="links[1]"
						orientation="vertical"
						tooltip
						popover
						:ui="{ link: 'p-1.5 text-xs overflow-hidden' }"
					/>
					<USeparator class="my-1.5 opacity-60" />
					<UNavigationMenu
						:collapsed="collapsed"
						:items="links[2]"
						orientation="vertical"
						tooltip
						popover
						:ui="{ link: 'p-1.5 text-xs overflow-hidden' }"
					/>
					<USeparator class="my-1.5 opacity-60" />
					<UNavigationMenu
						:collapsed="collapsed"
						:items="links[3]"
						orientation="vertical"
						tooltip
						popover
						:ui="{ link: 'p-1.5 text-xs overflow-hidden' }"
					/>
					<USeparator class="my-1.5 opacity-60" />
					<UNavigationMenu
						:collapsed="collapsed"
						:items="links[4]"
						orientation="vertical"
						tooltip
						popover
						:ui="{ link: 'p-1.5 text-xs overflow-hidden' }"
					/>
					<USeparator class="my-1.5 opacity-60" />
					<UNavigationMenu
						:collapsed="collapsed"
						:items="links[5]"
						orientation="vertical"
						tooltip
						class="mt-auto"
						:ui="{ link: 'p-1.5 text-xs overflow-hidden' }"
					/>
				</div>
			</template>

			<!-- Sidebar Footer -->
			<template #footer="{ collapsed }">
				<div class="w-full flex items-center justify-between gap-2">
					<UButton
						:icon="isDark ? 'ph:sun' : 'ph:moon'"
						:label="!collapsed ? (isDark ? 'Tema terang' : 'Tema gelap') : undefined"
						color="neutral"
						variant="ghost"
						size="xs"
						:block="collapsed"
						class="text-xs"
						:aria-label="isDark ? 'Tema terang' : 'Tema gelap'"
						@click="colorMode.preference = isDark ? 'light' : 'dark'"
					/>
				</div>
			</template>
		</UDashboardSidebar>

		<!-- Command Palette Search Modal -->
		<UDashboardSearch :groups="searchGroups" />

		<!-- Main Dashboard Panel -->
		<UDashboardPanel id="main">
			<template #header>
				<UDashboardNavbar
					title="Inqudex"
					:ui="{ right: 'gap-3' }"
				>
					<template #leading>
						<UDashboardSidebarCollapse />
					</template>

					<template #right>
						<div class="flex items-center gap-2">
							<label
								for="active-site"
								class="text-xs font-medium text-muted shrink-0 hidden sm:inline"
							>Situs aktif:</label>
							<USelectMenu
								id="active-site"
								v-model="settings.defaultSite"
								:items="siteItems"
								value-key="value"
								placeholder="Belum ada situs"
								:loading="sitesLoading"
								class="w-48 sm:w-60"
								size="xs"
								:disabled="!siteItems.length"
							/>
							<UButton
								size="xs"
								icon="ph:arrows-clockwise"
								:loading="sitesLoading"
								variant="ghost"
								color="neutral"
								aria-label="Muat ulang situs"
								@click="loadSites()"
							/>
						</div>

						<p
							v-if="sitesError"
							class="text-xs text-error truncate max-w-xs"
							:title="sitesError"
						>
							{{ sitesError }}
						</p>

						<UButton
							:icon="isDark ? 'ph:sun' : 'ph:moon'"
							color="neutral"
							variant="ghost"
							size="xs"
							:aria-label="isDark ? 'Tema terang' : 'Tema gelap'"
							@click="colorMode.preference = isDark ? 'light' : 'dark'"
						/>
					</template>
				</UDashboardNavbar>
			</template>

			<template #body>
				<div class="mx-auto w-full max-w-6xl py-2 sm:py-4">
					<slot />
				</div>
			</template>
		</UDashboardPanel>
	</UDashboardGroup>
</template>
