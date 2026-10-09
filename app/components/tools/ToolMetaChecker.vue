<script setup lang="ts">
import { inspectMeta, type MetaTagResult } from '~/composables/useSeoTools'

const mode = ref<'url' | 'html'>('url')
const urlInput = ref('')
const htmlInput = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<MetaTagResult | null>(null)
const previewMode = ref<'desktop' | 'mobile'>('desktop')

const settings = useSettings()
watch(() => settings.value.defaultSite, (s) => {
	if (!urlInput.value && s) {
		urlInput.value = s.startsWith('sc-domain:') ? `https://${s.slice(10)}/` : s
	}
}, { immediate: true })

async function runCheck() {
	loading.value = true
	error.value = ''
	result.value = null
	try {
		if (mode.value === 'url') {
			if (!urlInput.value.trim()) return
			result.value = await inspectMeta(urlInput.value.trim(), false)
		} else {
			if (!htmlInput.value.trim()) return
			result.value = await inspectMeta(htmlInput.value.trim(), true)
		}
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

const previewTitle = computed(() => {
	if (!result.value) return 'Judul Halaman Belum Tersedia'
	return result.value.title || 'Untitled Page'
})

const previewDescription = computed(() => {
	if (!result.value) return 'Deskripsi halaman akan ditampilkan di sini.'
	return result.value.description || 'Tidak ada meta description yang terdeteksi pada halaman ini.'
})

const previewDomain = computed(() => {
	if (!result.value?.url) return 'contoh.com'
	try {
		return new URL(result.value.url).hostname
	} catch {
		return 'contoh.com'
	}
})

const previewBreadcrumb = computed(() => {
	if (!result.value?.url) return 'https://contoh.com › artikel'
	try {
		const u = new URL(result.value.url)
		const parts = u.pathname.split('/').filter(Boolean)
		return `${u.origin} ${parts.length ? '› ' + parts.join(' › ') : ''}`
	} catch {
		return result.value.url
	}
})
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5">
			<div class="mb-4 flex items-center gap-2 border-b border-default pb-3">
				<UButton
					size="xs"
					:variant="mode === 'url' ? 'solid' : 'ghost'"
					:color="mode === 'url' ? 'primary' : 'neutral'"
					label="Periksa Lewat URL"
					icon="ph:link"
					@click="mode = 'url'"
				/>
				<UButton
					size="xs"
					:variant="mode === 'html' ? 'solid' : 'ghost'"
					:color="mode === 'html' ? 'primary' : 'neutral'"
					label="Tempel Snippet HTML"
					icon="ph:code"
					@click="mode = 'html'"
				/>
			</div>

			<form
				v-if="mode === 'url'"
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runCheck"
			>
				<UFormField
					label="URL Halaman Web"
					class="flex-1"
					hint="Ambil dan analisis tag meta, title, description, dan Open Graph langsung dari URL"
				>
					<UInput
						v-model="urlInput"
						placeholder="https://contoh.com/"
						type="url"
						required
						icon="ph:globe"
					/>
				</UFormField>
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:magnifying-glass"
					label="Periksa Meta Tag"
					:loading="loading"
				/>
			</form>

			<form
				v-else
				class="space-y-3"
				@submit.prevent="runCheck"
			>
				<UFormField
					label="Snippet HTML / Tag <head>"
					hint="Tempelkan kode HTML halaman untuk memeriksa tag meta secara lokal"
				>
					<UTextarea
						v-model="htmlInput"
						placeholder="<head>&#10;  <title>Judul Halaman</title>&#10;  <meta name=&quot;description&quot; content=&quot;Deskripsi...&quot;>&#10;</head>"
						rows="5"
						required
						class="font-mono text-xs"
					/>
				</UFormField>
				<div class="flex justify-end">
					<UButton
						type="submit"
						color="primary"
						variant="solid"
						icon="ph:code"
						label="Analisis HTML"
						:loading="loading"
					/>
				</div>
			</form>
		</div>

		<div
			v-if="error"
			class="panel border-error/50 bg-error/10 p-4 text-sm text-error"
		>
			{{ error }}
		</div>

		<div
			v-if="result"
			class="space-y-6"
		>
			<!-- SERP Live Preview Card -->
			<div class="panel p-5">
				<div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
					<div>
						<h3 class="font-semibold text-highlighted">
							Simulasi Tampilan Google SERP
						</h3>
						<p class="text-xs text-muted">
							Pratinjau visual bagaimana cuplikan halaman ini muncul di hasil pencarian Google
						</p>
					</div>
					<div class="flex items-center gap-1 rounded border border-default p-0.5">
						<button
							type="button"
							class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
							:class="previewMode === 'desktop' ? 'bg-primary text-white' : 'text-muted hover:text-highlighted'"
							@click="previewMode = 'desktop'"
						>
							Desktop
						</button>
						<button
							type="button"
							class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
							:class="previewMode === 'mobile' ? 'bg-primary text-white' : 'text-muted hover:text-highlighted'"
							@click="previewMode = 'mobile'"
						>
							Mobile
						</button>
					</div>
				</div>

				<!-- Google SERP Card -->
				<div
					class="rounded-lg border border-default bg-white p-4 text-left font-sans text-black shadow-sm dark:bg-[#202124] dark:text-[#bdc1c6]"
					:class="previewMode === 'mobile' ? 'max-w-md' : 'max-w-2xl'"
				>
					<div class="flex items-center gap-2 text-xs">
						<img
							v-if="result.favicon"
							:src="result.favicon"
							alt="Favicon"
							class="size-4 shrink-0 rounded-full"
							@error="($event.target as HTMLElement).style.display = 'none'"
						>
						<div class="min-w-0">
							<div class="font-medium text-[#202124] dark:text-[#dadce0] truncate">
								{{ result.og.siteName || previewDomain }}
							</div>
							<div class="text-[11px] text-[#4d5156] dark:text-[#bdc1c6] truncate">
								{{ previewBreadcrumb }}
							</div>
						</div>
					</div>

					<div class="mt-1.5">
						<a
							href="#"
							class="text-lg font-medium text-[#1a0dab] hover:underline dark:text-[#8ab4f8] line-clamp-1 cursor-pointer"
							@click.prevent
						>
							{{ previewTitle }}
						</a>
					</div>

					<p class="mt-1 text-xs leading-relaxed text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2">
						{{ previewDescription }}
					</p>
				</div>
			</div>

			<!-- Meta tags details breakdown -->
			<div class="grid gap-6 md:grid-cols-2">
				<!-- Title tag analysis -->
				<div class="panel p-5 space-y-3">
					<div class="flex items-center justify-between">
						<h4 class="font-semibold text-highlighted">
							Title Tag
						</h4>
						<span
							class="rounded px-2 py-0.5 text-xs font-medium"
							:class="{
								'bg-success/15 text-success': result.titleStatus === 'good',
								'bg-warning/15 text-warning': result.titleStatus === 'short',
								'bg-error/15 text-error': result.titleStatus === 'long'
							}"
						>
							{{ result.titleLength }} karakter / ~{{ result.titlePixelWidth }}px
						</span>
					</div>
					<div class="rounded bg-muted/50 p-3 text-sm text-highlighted break-words">
						{{ result.title || '(Kosong)' }}
					</div>
					<p class="text-xs text-muted">
						Rekomendasi Google: 50–60 karakter (maksimal ~600 piksel).
					</p>
				</div>

				<!-- Meta description analysis -->
				<div class="panel p-5 space-y-3">
					<div class="flex items-center justify-between">
						<h4 class="font-semibold text-highlighted">
							Meta Description
						</h4>
						<span
							class="rounded px-2 py-0.5 text-xs font-medium"
							:class="{
								'bg-success/15 text-success': result.descriptionStatus === 'good',
								'bg-warning/15 text-warning': result.descriptionStatus === 'short',
								'bg-error/15 text-error': result.descriptionStatus === 'long' || result.descriptionStatus === 'missing'
							}"
						>
							{{ result.descriptionLength }} karakter / ~{{ result.descriptionPixelWidth }}px
						</span>
					</div>
					<div class="rounded bg-muted/50 p-3 text-sm text-highlighted break-words">
						{{ result.description || '(Tidak ada meta description)' }}
					</div>
					<p class="text-xs text-muted">
						Rekomendasi Google: 120–160 karakter (maksimal ~960 piksel).
					</p>
				</div>

				<!-- Technical signals -->
				<div class="panel p-5 space-y-3">
					<h4 class="font-semibold text-highlighted">
						Sinyal Indexing & Canonical
					</h4>
					<div class="space-y-2 text-xs">
						<div class="flex items-center justify-between border-b border-default pb-1.5">
							<span class="text-muted">Indexability</span>
							<span
								class="font-medium"
								:class="result.isIndexable ? 'text-success' : 'text-error'"
							>
								{{ result.isIndexable ? 'Indexable' : 'Noindex Diterapkan' }}
							</span>
						</div>
						<div class="flex items-center justify-between border-b border-default pb-1.5">
							<span class="text-muted">Robots Directives</span>
							<span class="font-mono text-highlighted">
								{{ result.robotsDirectives.length ? result.robotsDirectives.join(', ') : 'default (index, follow)' }}
							</span>
						</div>
						<div class="flex items-start justify-between border-b border-default pb-1.5">
							<span class="text-muted shrink-0">Canonical URL</span>
							<span class="font-mono text-highlighted truncate max-w-xs text-right">
								{{ result.canonical || '(Tidak disetel)' }}
							</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted">Kesesuaian Canonical</span>
							<span :class="result.canonicalMatches ? 'text-success' : 'text-warning'">
								{{ result.canonicalMatches ? 'Sesuai dengan URL saat ini' : 'Berbeda / canonicalizing' }}
							</span>
						</div>
					</div>
				</div>

				<!-- Open Graph quick check -->
				<div class="panel p-5 space-y-3">
					<h4 class="font-semibold text-highlighted">
						Open Graph & Twitter Tags
					</h4>
					<div class="space-y-2 text-xs">
						<div class="flex items-center justify-between border-b border-default pb-1.5">
							<span class="text-muted">og:title</span>
							<span class="text-highlighted truncate max-w-xs">{{ result.og.title || '—' }}</span>
						</div>
						<div class="flex items-center justify-between border-b border-default pb-1.5">
							<span class="text-muted">og:image</span>
							<span class="text-highlighted truncate max-w-xs">{{ result.og.image || '—' }}</span>
						</div>
						<div class="flex items-center justify-between border-b border-default pb-1.5">
							<span class="text-muted">twitter:card</span>
							<span class="text-highlighted">{{ result.twitter.card || '—' }}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-muted">H1 Terpasang</span>
							<span class="text-highlighted">{{ result.headings.h1.length }} tag ({{ result.headings.h1[0] || 'Tidak ada' }})</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
