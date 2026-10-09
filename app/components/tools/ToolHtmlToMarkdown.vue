<script setup lang="ts">
import { htmlToMarkdown, type HtmlToMarkdownResult } from '~/composables/useSeoTools'

const { copy } = useExport()

const mode = ref<'url' | 'html'>('url')
const urlInput = ref('')
const htmlInput = ref('')
const loading = ref(false)
const error = ref('')

const readabilityMode = ref(true)
const includeImages = ref(true)
const includeLinks = ref(true)
const includeTables = ref(true)

const result = ref<HtmlToMarkdownResult | null>(null)
const viewTab = ref<'markdown' | 'preview'>('markdown')

async function runConvert() {
	loading.value = true
	error.value = ''
	result.value = null
	try {
		let htmlContent = ''
		let sourceUrl = ''
		if (mode.value === 'url') {
			if (!urlInput.value.trim()) return
			sourceUrl = urlInput.value.trim()
			if (!/^https?:\/\//i.test(sourceUrl)) sourceUrl = `https://${sourceUrl}`
			const res = await appFetch(sourceUrl)
			if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memuat konten dari ${sourceUrl}`)
			htmlContent = await res.text()
		} else {
			if (!htmlInput.value.trim()) return
			htmlContent = htmlInput.value.trim()
		}

		result.value = htmlToMarkdown(htmlContent, {
			readabilityMode: readabilityMode.value,
			includeImages: includeImages.value,
			includeLinks: includeLinks.value,
			includeTables: includeTables.value
		})
		result.value.sourceUrl = sourceUrl
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

function downloadMd() {
	if (!result.value) return
	const filename = `${(result.value.title || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`
	const blob = new Blob([result.value.markdown], { type: 'text/markdown;charset=utf-8' })
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5 space-y-4">
			<div class="flex items-center gap-2 border-b border-default pb-3">
				<UButton
					size="xs"
					:variant="mode === 'url' ? 'solid' : 'ghost'"
					:color="mode === 'url' ? 'primary' : 'neutral'"
					label="Ambil dari URL"
					icon="ph:globe"
					@click="mode = 'url'"
				/>
				<UButton
					size="xs"
					:variant="mode === 'html' ? 'solid' : 'ghost'"
					:color="mode === 'html' ? 'primary' : 'neutral'"
					label="Tempel Kode HTML"
					icon="ph:code"
					@click="mode = 'html'"
				/>
			</div>

			<form
				v-if="mode === 'url'"
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runConvert"
			>
				<UFormField
					label="URL Halaman Web"
					class="flex-1"
					hint="Konversi halaman web menjadi Markdown bersih untuk Nuxt Content atau LLMs"
				>
					<UInput
						v-model="urlInput"
						placeholder="https://contoh.com/artikel"
						type="url"
						required
						icon="ph:link"
					/>
				</UFormField>
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:file-text"
					label="Konversi ke Markdown"
					:loading="loading"
				/>
			</form>

			<form
				v-else
				class="space-y-3"
				@submit.prevent="runConvert"
			>
				<UFormField
					label="Kode HTML Mentah"
					hint="Tempel markup HTML yang ingin diubah menjadi Markdown"
				>
					<UTextarea
						v-model="htmlInput"
						rows="6"
						class="font-mono text-xs"
						placeholder="<article><h1>Judul</h1><p>Konten...</p></article>"
						required
					/>
				</UFormField>
				<div class="flex justify-end">
					<UButton
						type="submit"
						color="primary"
						variant="solid"
						icon="ph:file-text"
						label="Konversi ke Markdown"
						:loading="loading"
					/>
				</div>
			</form>

			<!-- Conversion Options -->
			<div class="flex flex-wrap items-center gap-4 pt-2 border-t border-default text-xs">
				<label class="flex items-center gap-2 cursor-pointer text-muted hover:text-highlighted">
					<input
						v-model="readabilityMode"
						type="checkbox"
						class="rounded accent-primary"
					>
					<span>Mode Readability (Hapus header, footer & nav otomatis)</span>
				</label>
				<label class="flex items-center gap-2 cursor-pointer text-muted hover:text-highlighted">
					<input
						v-model="includeImages"
						type="checkbox"
						class="rounded accent-primary"
					>
					<span>Sertakan Gambar</span>
				</label>
				<label class="flex items-center gap-2 cursor-pointer text-muted hover:text-highlighted">
					<input
						v-model="includeLinks"
						type="checkbox"
						class="rounded accent-primary"
					>
					<span>Sertakan Tautan Link</span>
				</label>
				<label class="flex items-center gap-2 cursor-pointer text-muted hover:text-highlighted">
					<input
						v-model="includeTables"
						type="checkbox"
						class="rounded accent-primary"
					>
					<span>Format Tabel Markdown</span>
				</label>
			</div>
		</div>

		<div
			v-if="error"
			class="panel border-error/50 bg-error/10 p-4 text-sm text-error"
		>
			{{ error }}
		</div>

		<div
			v-if="result"
			class="panel p-5 space-y-4"
		>
			<!-- Metrics banner & Actions -->
			<div class="flex flex-wrap items-center justify-between gap-4 border-b border-default pb-4">
				<div class="flex flex-wrap items-center gap-4 text-xs">
					<div class="font-medium text-highlighted">
						{{ result.title }}
					</div>
					<div class="flex gap-2">
						<span class="rounded bg-muted px-2 py-0.5 text-muted num">{{ result.wordCount }} Kata</span>
						<span class="rounded bg-muted px-2 py-0.5 text-muted num">{{ result.charCount }} Karakter</span>
						<span class="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary num">~{{ result.estimatedTokens }} Token LLM</span>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<div class="flex rounded border border-default p-0.5">
						<button
							type="button"
							class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
							:class="viewTab === 'markdown' ? 'bg-primary text-white' : 'text-muted hover:text-highlighted'"
							@click="viewTab = 'markdown'"
						>
							Markdown
						</button>
						<button
							type="button"
							class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
							:class="viewTab === 'preview' ? 'bg-primary text-white' : 'text-muted hover:text-highlighted'"
							@click="viewTab = 'preview'"
						>
							Pratinjau
						</button>
					</div>
					<UButton
						size="xs"
						icon="ph:copy"
						label="Salin Markdown"
						@click="copy(result.markdown, 'Markdown')"
					/>
					<UButton
						size="xs"
						icon="ph:download-simple"
						label="Unduh .md"
						color="primary"
						variant="solid"
						@click="downloadMd"
					/>
				</div>
			</div>

			<!-- Editor / Preview Area -->
			<div v-if="viewTab === 'markdown'">
				<textarea
					v-model="result.markdown"
					rows="16"
					class="w-full rounded bg-ink p-4 font-mono text-xs text-[#e8e4da] leading-relaxed outline-hidden select-all"
				/>
			</div>

			<div
				v-else
				class="prose prose-sm dark:prose-invert max-w-none rounded bg-panel p-5 border border-default min-h-[300px] overflow-auto"
			>
				<div class="whitespace-pre-wrap font-sans text-sm leading-relaxed">
					{{ result.markdown }}
				</div>
			</div>
		</div>
	</div>
</template>
