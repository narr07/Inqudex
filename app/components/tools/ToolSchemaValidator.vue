<script setup lang="ts">
import { validateSchema, type SchemaValidationResult } from '~/composables/useSeoTools'

const mode = ref<'url' | 'json'>('url')
const urlInput = ref('')
const jsonInput = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<SchemaValidationResult | null>(null)
const selectedSchemaIdx = ref(0)

const settings = useSettings()
watch(() => settings.value.defaultSite, (s) => {
	if (!urlInput.value && s) {
		urlInput.value = s.startsWith('sc-domain:') ? `https://${s.slice(10)}/` : s
	}
}, { immediate: true })

async function runValidate() {
	loading.value = true
	error.value = ''
	result.value = null
	selectedSchemaIdx.value = 0
	try {
		if (mode.value === 'url') {
			if (!urlInput.value.trim()) return
			result.value = await validateSchema(urlInput.value.trim(), false)
		} else {
			if (!jsonInput.value.trim()) return
			result.value = await validateSchema(jsonInput.value.trim(), true)
		}
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

function loadExample() {
	mode.value = 'json'
	jsonInput.value = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'Article',
		'headline': 'Panduan Lengkap SEO Teknis untuk Nuxt dan Vue',
		'image': ['https://contoh.com/og-image.png'],
		'datePublished': '2026-03-15T08:00:00+07:00',
		'dateModified': '2026-04-01T09:20:00+07:00',
		'author': {
			'@type': 'Person',
			'name': 'Narr',
			'url': 'https://contoh.com/penulis/narr'
		},
		'publisher': {
			'@type': 'Organization',
			'name': 'Inqudex Suite',
			'logo': {
				'@type': 'ImageObject',
				'url': 'https://contoh.com/logo.png'
			}
		},
		'description': 'Pelajari cara mengoptimasi performa, meta tags, dan sitemap di Nuxt.'
	}, null, 2)
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
						label="Fetch URL Halaman"
						icon="ph:link"
						@click="mode = 'url'"
					/>
					<UButton
						size="xs"
						:variant="mode === 'json' ? 'solid' : 'ghost'"
						:color="mode === 'json' ? 'primary' : 'neutral'"
						label="Tempel JSON-LD / HTML"
						icon="ph:code"
						@click="mode = 'json'"
					/>
				</div>
				<UButton
					size="xs"
					variant="ghost"
					color="neutral"
					icon="ph:lightbulb"
					label="Muat Contoh Schema"
					@click="loadExample"
				/>
			</div>

			<form
				v-if="mode === 'url'"
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runValidate"
			>
				<UFormField
					label="URL Halaman Web"
					class="flex-1"
					hint="Ekstrak dan validasi semua blok Schema.org JSON-LD yang tertanam di halaman"
				>
					<UInput
						v-model="urlInput"
						placeholder="https://contoh.com/produk/sepatu"
						type="url"
						required
						icon="ph:globe"
					/>
				</UFormField>
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:check-circle"
					label="Validasi Schema"
					:loading="loading"
				/>
			</form>

			<form
				v-else
				class="space-y-3"
				@submit.prevent="runValidate"
			>
				<UFormField
					label="Kode JSON-LD atau Dokumen HTML"
					hint="Tempel objek JSON-LD Schema.org atau dokumen HTML yang memuat script ld+json"
				>
					<UTextarea
						v-model="jsonInput"
						placeholder="{\n  &quot;@context&quot;: &quot;https://schema.org&quot;,\n  &quot;@type&quot;: &quot;Article&quot;,\n  &quot;headline&quot;: &quot;...&quot;\n}"
						rows="6"
						required
						class="font-mono text-xs"
					/>
				</UFormField>
				<div class="flex justify-end">
					<UButton
						type="submit"
						color="primary"
						variant="solid"
						icon="ph:check-circle"
						label="Validasi JSON-LD"
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
			<!-- Summary banner -->
			<div class="panel flex flex-wrap items-center justify-between gap-4 p-4">
				<div class="flex items-center gap-3">
					<div
						class="flex size-10 items-center justify-center rounded-lg border border-default"
						:class="!result.hasErrors && result.totalSchemas > 0 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'"
					>
						<UIcon
							:name="!result.hasErrors && result.totalSchemas > 0 ? 'ph:check-circle-bold' : 'ph:warning-circle-bold'"
							class="size-6"
						/>
					</div>
					<div>
						<h3 class="font-semibold text-highlighted">
							{{ result.totalSchemas }} Blok Schema Ditemukan
						</h3>
						<p class="text-xs text-muted">
							Tipe terdeteksi: {{ result.allTypes.join(', ') || 'None' }}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<span
						v-if="result.totalSchemas === 0"
						class="rounded bg-error/15 px-2.5 py-1 text-xs font-medium text-error"
					>
						Tidak ada JSON-LD
					</span>
					<span
						v-else-if="!result.hasErrors"
						class="rounded bg-success/15 px-2.5 py-1 text-xs font-medium text-success"
					>
						Sintaks Valid
					</span>
					<span
						v-else
						class="rounded bg-error/15 px-2.5 py-1 text-xs font-medium text-error"
					>
						Memerlukan Perbaikan
					</span>
				</div>
			</div>

			<!-- Schema Selector if multiple -->
			<div
				v-if="result.schemas.length > 1"
				class="flex flex-wrap gap-2"
			>
				<button
					v-for="(s, idx) in result.schemas"
					:key="idx"
					type="button"
					class="rounded border px-3 py-1.5 text-xs font-medium transition-colors"
					:class="selectedSchemaIdx === idx ? 'border-primary bg-primary/10 text-primary' : 'border-default bg-panel text-muted hover:text-highlighted'"
					@click="selectedSchemaIdx = idx"
				>
					#{{ idx + 1 }} {{ s.type }}
					<span
						v-if="s.errors.length"
						class="ml-1 text-error"
					>({{ s.errors.length }} err)</span>
				</button>
			</div>

			<!-- Selected Schema Inspector -->
			<div
				v-if="result.schemas[selectedSchemaIdx]"
				class="grid gap-6 lg:grid-cols-2"
			>
				<!-- Diagnostics Panel -->
				<div class="panel p-5 space-y-4">
					<div class="flex items-center justify-between border-b border-default pb-3">
						<h4 class="font-semibold text-highlighted">
							Diagnostik: {{ result.schemas[selectedSchemaIdx].type }}
						</h4>
						<span
							class="rounded px-2 py-0.5 text-xs font-medium"
							:class="result.schemas[selectedSchemaIdx].richResultEligible ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'"
						>
							{{ result.schemas[selectedSchemaIdx].richResultEligible ? 'Siap Rich Result' : 'Perlu Kelengkapan' }}
						</span>
					</div>

					<!-- Errors -->
					<div
						v-if="result.schemas[selectedSchemaIdx].errors.length"
						class="space-y-1.5"
					>
						<div class="text-xs font-semibold text-error uppercase tracking-wider">
							Error Wajib Google Rich Results
						</div>
						<ul class="list-disc pl-5 text-xs text-error space-y-1">
							<li
								v-for="(err, i) in result.schemas[selectedSchemaIdx].errors"
								:key="i"
							>
								{{ err }}
							</li>
						</ul>
					</div>

					<!-- Warnings / Suggestions -->
					<div
						v-if="result.schemas[selectedSchemaIdx].recommendedMissing.length"
						class="space-y-1.5"
					>
						<div class="text-xs font-semibold text-warning uppercase tracking-wider">
							Properti Opsional Disarankan
						</div>
						<p class="text-xs text-muted">
							Menambahkan properti ini meningkatkan kelayakan tampilan fitur pencarian:
						</p>
						<div class="flex flex-wrap gap-1.5 mt-1">
							<span
								v-for="(rec, i) in result.schemas[selectedSchemaIdx].recommendedMissing"
								:key="i"
								class="rounded bg-warning/10 px-2 py-0.5 font-mono text-[11px] text-warning"
							>
								{{ rec }}
							</span>
						</div>
					</div>

					<div
						v-if="!result.schemas[selectedSchemaIdx].errors.length && !result.schemas[selectedSchemaIdx].recommendedMissing.length"
						class="flex items-center gap-2 text-xs text-success"
					>
						<UIcon
							name="ph:check-circle"
							class="size-4 shrink-0"
						/>
						<span>Semua kriteria wajib dan disarankan telah terpenuhi secara lengkap.</span>
					</div>
				</div>

				<!-- JSON Viewer -->
				<div class="panel p-5 space-y-3">
					<div class="flex items-center justify-between border-b border-default pb-2">
						<h4 class="font-semibold text-highlighted text-xs uppercase tracking-wider">
							Raw JSON-LD Object
						</h4>
						<span class="text-xs text-muted font-mono">application/ld+json</span>
					</div>
					<pre class="max-h-96 overflow-auto rounded bg-muted/60 p-3 font-mono text-xs text-highlighted leading-relaxed whitespace-pre">{{ JSON.stringify(result.schemas[selectedSchemaIdx].raw, null, 2) }}</pre>
				</div>
			</div>
		</div>
	</div>
</template>
