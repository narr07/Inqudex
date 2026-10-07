<script setup lang="ts">
const route = useRoute()
const colorMode = useColorMode()
const settings = useSettings()
const { sites, sitesLoading, sitesError, loadSites } = useGsc()

const nav = [
	{ to: '/', label: 'Beranda', icon: 'ph:house-line' },
	{ to: '/search-console', label: 'Search Console', icon: 'ph:chart-line-up' },
	{ to: '/indexing', label: 'Indexing', icon: 'ph:paper-plane-tilt' },
	{ to: '/sitemap', label: 'Sitemap', icon: 'ph:tree-structure' },
	{ to: '/audit', label: 'Audit situs', icon: 'ph:list-magnifying-glass' },
	{ to: '/speed', label: 'Kecepatan', icon: 'ph:gauge' },
	{ to: '/keywords', label: 'Kata kunci', icon: 'ph:text-aa' },
	{ to: '/traffic', label: 'Generator trafik', icon: 'ph:arrows-left-right' },
	{ to: '/tools', label: 'Tool gratis', icon: 'ph:toolbox' },
	{ to: '/settings', label: 'Pengaturan', icon: 'ph:sliders-horizontal' }
]

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
const menuOpen = ref(false)
watch(() => route.path, () => (menuOpen.value = false))

const siteItems = computed(() => sites.value.map(s => ({ label: s.siteUrl, value: s.siteUrl })))
const isDark = computed(() => colorMode.value === 'dark')

onMounted(() => {
	if (isTauri()) loadSites()
})
</script>

<template>
	<div class="flex min-h-dvh flex-col lg:flex-row">
		<!-- Sidebar (desktop) -->
		<aside
			class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-default bg-muted/50 lg:flex"
			aria-label="Navigasi utama"
		>
			<AppNav
				:items="nav"
				:is-active="isActive"
			/>
		</aside>

		<!-- Top bar (mobile) -->
		<div class="flex items-center justify-between gap-2 border-b border-default bg-muted/50 px-3 py-2 lg:hidden">
			<UButton
				icon="ph:list"
				aria-label="Buka menu"
				color="neutral"
				variant="ghost"
				size="lg"
				@click="menuOpen = true"
			/>
			<span class="font-semibold text-highlighted">Inqudex</span>
			<UButton
				:icon="isDark ? 'ph:sun' : 'ph:moon'"
				:aria-label="isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'"
				color="neutral"
				variant="ghost"
				size="lg"
				@click="colorMode.preference = isDark ? 'light' : 'dark'"
			/>
		</div>
		<USlideover
			v-model:open="menuOpen"
			side="left"
			title="Menu"
			description="Navigasi utama Inqudex"
		>
			<template #content>
				<div class="flex h-full flex-col bg-default">
					<div class="flex justify-end p-2">
						<UButton
							icon="ph:x"
							aria-label="Tutup menu"
							color="neutral"
							variant="ghost"
							@click="menuOpen = false"
						/>
					</div>
					<AppNav
						:items="nav"
						:is-active="isActive"
					/>
				</div>
			</template>
		</USlideover>

		<div class="flex min-w-0 flex-1 flex-col">
			<!-- Active site bar -->
			<div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-default px-4 py-2 sm:px-6">
				<label
					for="active-site"
					class="text-sm text-muted"
				>Situs aktif</label>
				<USelectMenu
					id="active-site"
					v-model="settings.defaultSite"
					:items="siteItems"
					value-key="value"
					placeholder="Belum ada situs"
					:loading="sitesLoading"
					class="w-full max-w-72 sm:w-72"
					:disabled="!siteItems.length"
				/>
				<UButton
					size="sm"
					icon="ph:arrows-clockwise"
					label="Muat ulang"
					:loading="sitesLoading"
					@click="loadSites()"
				/>
				<p
					v-if="sitesError"
					class="min-w-0 flex-1 truncate text-sm text-error"
					:title="sitesError"
				>
					{{ sitesError }}
				</p>
			</div>
			<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
				<slot />
			</main>
		</div>
	</div>
</template>
