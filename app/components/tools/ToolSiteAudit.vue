<script setup lang="ts">
import { inspectMeta, type MetaTagResult } from '~/composables/useSeoTools'

const targetUrl = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<MetaTagResult | null>(null)

const settings = useSettings()
watch(() => settings.value.defaultSite, (s) => {
	if (!targetUrl.value && s) {
		targetUrl.value = s.startsWith('sc-domain:') ? `https://${s.slice(10)}/` : s
	}
}, { immediate: true })

async function runAudit() {
	if (!targetUrl.value.trim()) return
	loading.value = true
	error.value = ''
	result.value = null
	try {
		result.value = await inspectMeta(targetUrl.value.trim())
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

interface CheckItem {
	label: string
	status: 'pass' | 'warning' | 'fail'
	detail: string
}

const checks = computed<CheckItem[]>(() => {
	if (!result.value) return []
	const r = result.value
	const list: CheckItem[] = []

	// Title
	if (!r.title) {
		list.push({ label: 'Title Tag', status: 'fail', detail: 'Halaman tidak memiliki tag <title>.' })
	} else if (r.titleStatus === 'short') {
		list.push({ label: 'Title Tag', status: 'warning', detail: `Terlalu pendek (${r.titleLength} karakter). Idealnya 50-60 karakter.` })
	} else if (r.titleStatus === 'long') {
		list.push({ label: 'Title Tag', status: 'warning', detail: `Terlalu panjang (${r.titleLength} kar / ${r.titlePixelWidth}px). Berpotensi terpotong di Google.` })
	} else {
		list.push({ label: 'Title Tag', status: 'pass', detail: `Optimal (${r.titleLength} karakter, ~${r.titlePixelWidth}px).` })
	}

	// Description
	if (!r.description) {
		list.push({ label: 'Meta Description', status: 'fail', detail: 'Meta description kosong atau tidak ditemukan.' })
	} else if (r.descriptionStatus === 'short') {
		list.push({ label: 'Meta Description', status: 'warning', detail: `Terlalu pendek (${r.descriptionLength} karakter). Idealnya 120-160 karakter.` })
	} else if (r.descriptionStatus === 'long') {
		list.push({ label: 'Meta Description', status: 'warning', detail: `Terlalu panjang (${r.descriptionLength} karakter). Snippet dapat terpotong di SERP.` })
	} else {
		list.push({ label: 'Meta Description', status: 'pass', detail: `Optimal (${r.descriptionLength} karakter).` })
	}

	// Canonical
	if (!r.canonical) {
		list.push({ label: 'Canonical URL', status: 'warning', detail: 'Tag <link rel="canonical"> tidak terdeteksi.' })
	} else if (!r.canonicalMatches) {
		list.push({ label: 'Canonical URL', status: 'warning', detail: `Canonical (${r.canonical}) berbeda dari URL halaman saat ini.` })
	} else {
		list.push({ label: 'Canonical URL', status: 'pass', detail: 'Canonical tag terpasang dan sesuai dengan URL saat ini.' })
	}

	// Indexability
	if (!r.isIndexable) {
		list.push({ label: 'Indexability', status: 'fail', detail: `Halaman diblokir dari indexasi oleh robots directive: ${r.robotsDirectives.join(', ')}` })
	} else {
		list.push({ label: 'Indexability', status: 'pass', detail: 'Halaman mengizinkan indexasi mesin pencari.' })
	}

	// Headings
	if (!r.headings.h1.length) {
		list.push({ label: 'Heading H1', status: 'fail', detail: 'Tidak ada tag <h1> di dalam dokumen.' })
	} else if (r.headings.h1.length > 1) {
		list.push({ label: 'Heading H1', status: 'warning', detail: `Terdapat ${r.headings.h1.length} tag <h1>. Disarankan hanya 1 per halaman.` })
	} else {
		list.push({ label: 'Heading H1', status: 'pass', detail: `1 tag <h1>: "${r.headings.h1[0]}"` })
	}

	// Open Graph & Social
	if (!r.og.title || !r.og.image) {
		list.push({ label: 'Open Graph Tags', status: 'warning', detail: 'Tag og:title atau og:image belum lengkap untuk share preview.' })
	} else {
		list.push({ label: 'Open Graph Tags', status: 'pass', detail: 'Tag Open Graph utama lengkap.' })
	}

	// Mobile Viewport
	if (!r.viewport) {
		list.push({ label: 'Mobile Viewport', status: 'fail', detail: 'Meta viewport tidak ditemukan. Halaman mungkin tidak ramah mobile.' })
	} else {
		list.push({ label: 'Mobile Viewport', status: 'pass', detail: 'Meta viewport terpasang dengan baik.' })
	}

	// Favicon
	if (!r.hasFavicon) {
		list.push({ label: 'Favicon', status: 'warning', detail: 'Link rel="icon" tidak ditemukan di <head>.' })
	} else {
		list.push({ label: 'Favicon', status: 'pass', detail: 'Favicon terkonfigurasi.' })
	}

	return list
})

const score = computed(() => {
	if (!checks.value.length) return 0
	let total = 0
	checks.value.forEach(c => {
		if (c.status === 'pass') total += 100
		else if (c.status === 'warning') total += 50
	})
	return Math.round(total / checks.value.length)
})

const scoreColor = computed(() => {
	if (score.value >= 80) return 'text-success'
	if (score.value >= 50) return 'text-warning'
	return 'text-error'
})
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5">
			<form
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runAudit"
			>
				<UFormField
					label="URL Halaman yang Ingin Diaudit"
					class="flex-1"
					hint="Periksa sinyal indexabilitas, metadata, heading, dan sosial dalam satu halaman"
				>
					<UInput
						v-model="targetUrl"
						placeholder="https://contoh.com/artikel-terbaru"
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
					label="Audit Halaman"
					:loading="loading"
				/>
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
			<!-- Score summary -->
			<div class="panel grid gap-4 p-5 sm:grid-cols-3 sm:items-center">
				<div class="flex items-center gap-4">
					<div
						class="flex size-16 items-center justify-center rounded-lg border border-default bg-muted text-2xl font-bold num"
						:class="scoreColor"
					>
						{{ score }}
					</div>
					<div>
						<h3 class="font-semibold text-highlighted">
							Skor Kesehatan Halaman
						</h3>
						<p class="text-xs text-muted">
							Berdasarkan 8 kriteria teknis SEO on-page
						</p>
					</div>
				</div>

				<div class="text-sm text-muted sm:col-span-2">
					<p class="font-medium text-highlighted truncate">
						{{ result.url || targetUrl }}
					</p>
					<div class="mt-2 flex flex-wrap gap-2 text-xs">
						<span
							class="rounded px-2 py-0.5 font-medium"
							:class="result.isIndexable ? 'bg-success/15 text-success' : 'bg-error/15 text-error'"
						>
							{{ result.isIndexable ? 'Indexable' : 'Noindex' }}
						</span>
						<span class="rounded bg-muted px-2 py-0.5 text-muted">
							Charset: {{ result.charset }}
						</span>
						<span class="rounded bg-muted px-2 py-0.5 text-muted">
							H1: {{ result.headings.h1.length }} | H2: {{ result.headings.h2Count }}
						</span>
					</div>
				</div>
			</div>

			<!-- Checks list -->
			<div class="panel divide-y divide-default overflow-hidden">
				<div class="bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
					Daftar Pemeriksaan On-Page
				</div>
				<div
					v-for="(c, i) in checks"
					:key="i"
					class="flex items-start gap-3 p-4 text-sm"
				>
					<UIcon
						v-if="c.status === 'pass'"
						name="ph:check-circle-fill"
						class="size-5 shrink-0 text-success mt-0.5"
					/>
					<UIcon
						v-else-if="c.status === 'warning'"
						name="ph:warning-circle-fill"
						class="size-5 shrink-0 text-warning mt-0.5"
					/>
					<UIcon
						v-else
						name="ph:x-circle-fill"
						class="size-5 shrink-0 text-error mt-0.5"
					/>

					<div class="min-w-0 flex-1">
						<p class="font-medium text-highlighted">
							{{ c.label }}
						</p>
						<p class="text-xs text-muted mt-0.5">
							{{ c.detail }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
