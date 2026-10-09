<script setup lang="ts">
import { validateSitemap, type SitemapValidationResult } from '~/composables/useSeoTools'

const mode = ref<'url' | 'xml'>('url')
const urlInput = ref('')
const xmlInput = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<SitemapValidationResult | null>(null)

const settings = useSettings()
watch(() => settings.value.defaultSite, (s) => {
	if (!urlInput.value && s) {
		const base = s.startsWith('sc-domain:') ? `https://${s.slice(10)}` : s.replace(/\/$/, '')
		urlInput.value = `${base}/sitemap.xml`
	}
}, { immediate: true })

async function runValidate() {
	loading.value = true
	error.value = ''
	result.value = null
	try {
		if (mode.value === 'url') {
			if (!urlInput.value.trim()) return
			result.value = await validateSitemap(urlInput.value.trim(), false)
		} else {
			if (!xmlInput.value.trim()) return
			result.value = await validateSitemap(xmlInput.value.trim(), true)
		}
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

function loadSample() {
	mode.value = 'xml'
	xmlInput.value = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://contoh.com/</loc>
    <lastmod>2026-03-20</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://contoh.com/tentang-kami</loc>
    <lastmod>2026-02-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>http://contoh.com/kontak</loc>
    <lastmod>invalid-date</lastmod>
  </url>
</urlset>`
}
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-default pb-3">
				<div class="flex items-center gap-2">
					<UButton
						size="xs"
						:variant="mode === 'url' ? 'solid' : 'ghost'"
						:color="mode === 'url' ? 'primary' : 'neutral'"
						label="Ambil URL Sitemap"
						icon="ph:link"
						@click="mode = 'url'"
					/>
					<UButton
						size="xs"
						:variant="mode === 'xml' ? 'solid' : 'ghost'"
						:color="mode === 'xml' ? 'primary' : 'neutral'"
						label="Tempel Teks XML"
						icon="ph:code"
						@click="mode = 'xml'"
					/>
				</div>
				<UButton
					size="xs"
					variant="ghost"
					color="neutral"
					icon="ph:lightbulb"
					label="Muat Contoh XML"
					@click="loadSample"
				/>
			</div>

			<form
				v-if="mode === 'url'"
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runValidate"
			>
				<UFormField
					label="URL XML Sitemap"
					class="flex-1"
					hint="Mendukung Sitemap standar maupun Sitemap Index multi-file"
				>
					<UInput
						v-model="urlInput"
						placeholder="https://contoh.com/sitemap.xml"
						type="url"
						required
						icon="ph:tree-structure"
					/>
				</UFormField>
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:check-circle"
					label="Validasi Sitemap"
					:loading="loading"
				/>
			</form>

			<form
				v-else
				class="space-y-3"
				@submit.prevent="runValidate"
			>
				<UFormField
					label="Konten XML Sitemap"
					hint="Tempel konten teks dokumen XML sitemap untuk divalidasi"
				>
					<UTextarea
						v-model="xmlInput"
						rows="6"
						class="font-mono text-xs"
						required
					/>
				</UFormField>
				<div class="flex justify-end">
					<UButton
						type="submit"
						color="primary"
						variant="solid"
						icon="ph:check-circle"
						label="Validasi Dokumen XML"
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
			<!-- Summary Stats -->
			<div class="grid gap-4 sm:grid-cols-4">
				<div class="panel p-4">
					<div class="text-xs text-muted">
						Format Dokumen
					</div>
					<div class="mt-1 text-base font-semibold text-highlighted">
						{{ result.isSitemapIndex ? 'Sitemap Index' : 'Standard Urlset' }}
					</div>
				</div>
				<div class="panel p-4">
					<div class="text-xs text-muted">
						Total URL / Entri
					</div>
					<div class="mt-1 text-base font-semibold text-highlighted num">
						{{ result.totalUrls }}
					</div>
				</div>
				<div class="panel p-4">
					<div class="text-xs text-muted">
						Ukuran Dokumen
					</div>
					<div class="mt-1 text-base font-semibold text-highlighted num">
						{{ (result.fileSizeBytes / 1024).toFixed(1) }} KB
					</div>
				</div>
				<div class="panel p-4">
					<div class="text-xs text-muted">
						Status Masalah
					</div>
					<div
						class="mt-1 text-base font-semibold"
						:class="result.issues.length ? 'text-warning' : 'text-success'"
					>
						{{ result.issues.length ? `${result.issues.length} Catatan` : 'Sempurna' }}
					</div>
				</div>
			</div>

			<!-- Issues List -->
			<div
				v-if="result.issues.length"
				class="panel divide-y divide-default overflow-hidden"
			>
				<div class="bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
					Peringatan & Kesalahan Validasi
				</div>
				<div
					v-for="(issue, idx) in result.issues"
					:key="idx"
					class="flex items-start gap-3 p-4 text-xs"
				>
					<UIcon
						v-if="issue.type === 'error'"
						name="ph:x-circle-fill"
						class="size-4 shrink-0 text-error mt-0.5"
					/>
					<UIcon
						v-else
						name="ph:warning-circle-fill"
						class="size-4 shrink-0 text-warning mt-0.5"
					/>
					<span :class="issue.type === 'error' ? 'text-error font-medium' : 'text-toned'">{{ issue.message }}</span>
				</div>
			</div>

			<!-- Sample URLs table -->
			<div class="panel overflow-hidden">
				<div class="flex items-center justify-between bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
					<span>Daftar URL Terdeteksi (Maks 500)</span>
					<span class="num">{{ result.urls.length }} URL ditampilkan</span>
				</div>
				<div class="max-h-96 overflow-auto">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-default bg-muted/20 text-muted">
							<tr>
								<th class="p-3">
									Lokasi URL (loc)
								</th>
								<th class="p-3">
									Terakhir Dimodifikasi (lastmod)
								</th>
								<th class="p-3 text-right">
									HTTPS
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-default">
							<tr
								v-for="(u, idx) in result.urls"
								:key="idx"
								class="hover:bg-muted/30"
							>
								<td class="p-3 font-mono text-highlighted truncate max-w-md">
									{{ u.loc }}
								</td>
								<td class="p-3 text-muted">
									<span :class="!u.isValidDate ? 'text-error font-medium' : ''">
										{{ u.lastmod || '—' }}
									</span>
								</td>
								<td class="p-3 text-right">
									<span
										class="rounded px-1.5 py-0.5 font-medium text-[10px]"
										:class="u.isHttps ? 'bg-success/15 text-success' : 'bg-error/15 text-error'"
									>
										{{ u.isHttps ? 'HTTPS' : 'HTTP' }}
									</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</template>
