<script setup lang="ts">
import { analyzeSerp, type SerpAnalysisResult } from '~/composables/useSeoTools'

const { copy, saveCsv } = useExport()

const query = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<SerpAnalysisResult | null>(null)

async function runAnalyze() {
	if (!query.value.trim()) return
	loading.value = true
	error.value = ''
	result.value = null
	try {
		result.value = await analyzeSerp(query.value.trim())
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

function exportCsv() {
	if (!result.value) return
	saveCsv(`serp-analysis-${query.value.trim()}`, [
		{ key: 'position', label: 'Posisi' },
		{ key: 'title', label: 'Judul' },
		{ key: 'domain', label: 'Domain' },
		{ key: 'url', label: 'URL' },
		{ key: 'titleChars', label: 'Panjang Karakter' },
		{ key: 'snippet', label: 'Cuplikan Snippet' }
	], result.value.results)
}
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5">
			<form
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runAnalyze"
			>
				<UFormField
					label="Target Kueri / Kata Kunci SERP"
					class="flex-1"
					hint="Inspeksi peringkat 10 besar, fitur pencarian khusus, dan struktur judul kompetitor"
				>
					<UInput
						v-model="query"
						placeholder="contoh: framework javascript tercepat, jasa seo jakarta"
						required
						icon="ph:magnifying-glass"
					/>
				</UFormField>
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:chart-bar"
					label="Analisis SERP"
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
			<!-- Summary Metrics -->
			<div class="grid gap-4 sm:grid-cols-4">
				<div class="panel p-4">
					<div class="text-xs text-muted">
						Rata-rata Panjang Title
					</div>
					<div class="mt-1 text-base font-semibold text-highlighted num">
						{{ result.avgTitleLength }} Karakter
					</div>
				</div>
				<div class="panel p-4">
					<div class="text-xs text-muted">
						Rata-rata Snippet
					</div>
					<div class="mt-1 text-base font-semibold text-highlighted num">
						{{ result.avgSnippetLength }} Karakter
					</div>
				</div>
				<div class="panel p-4 sm:col-span-2">
					<div class="text-xs text-muted">
						Fitur SERP Terdeteksi
					</div>
					<div class="mt-1 flex flex-wrap gap-1.5">
						<span
							v-for="(f, i) in result.serpFeatures"
							:key="i"
							class="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
						>
							{{ f }}
						</span>
					</div>
				</div>
			</div>

			<!-- Rankings Table -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-highlighted text-sm">
						Peringkat 10 Besar Hasil Pencarian
					</h3>
					<UButton
						size="xs"
						icon="ph:download-simple"
						label="Ekspor CSV"
						@click="exportCsv"
					/>
				</div>

				<div class="panel divide-y divide-default overflow-hidden">
					<div
						v-for="item in result.results"
						:key="item.position"
						class="p-4 space-y-1.5 hover:bg-muted/20 text-xs"
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span class="flex size-6 items-center justify-center rounded-full bg-muted font-bold text-highlighted num text-[11px]">
									#{{ item.position }}
								</span>
								<span class="text-muted font-mono">{{ item.domain }}</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="text-muted num">{{ item.titleChars }} kar</span>
								<UButton
									size="xs"
									icon="ph:copy"
									variant="ghost"
									color="neutral"
									@click="copy(item.url, 'URL')"
								/>
							</div>
						</div>

						<a
							:href="item.url"
							target="_blank"
							rel="noopener noreferrer"
							class="block font-semibold text-sm text-primary hover:underline"
						>
							{{ item.title }}
						</a>

						<p class="text-muted leading-relaxed">
							{{ item.snippet }}
						</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
