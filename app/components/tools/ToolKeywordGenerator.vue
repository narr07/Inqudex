<script setup lang="ts">
import { generateKeywordIdeas, type KeywordIdea } from '~/composables/useSeoTools'

const { saveCsv, copy } = useExport()

const seed = ref('')
const locale = ref<'id' | 'en'>('id')
const ideas = ref<KeywordIdea[]>([])
const selectedIntent = ref<'all' | KeywordIdea['intent']>('all')

function runGenerate() {
	if (!seed.value.trim()) return
	ideas.value = generateKeywordIdeas(seed.value.trim(), locale.value)
}

const filteredIdeas = computed(() => {
	if (selectedIntent.value === 'all') return ideas.value
	return ideas.value.filter(item => item.intent === selectedIntent.value)
})

const intentLabels: Record<string, string> = {
	all: 'Semua Intent',
	informational: 'Informational',
	commercial: 'Commercial',
	transactional: 'Transactional',
	navigational: 'Navigational',
	question: 'Pertanyaan'
}

function exportCsv() {
	saveCsv(`keyword-ideas-${seed.value.trim()}`, [
		{ key: 'keyword', label: 'Kata Kunci' },
		{ key: 'intent', label: 'Search Intent' },
		{ key: 'volumeEstimate', label: 'Estimasi Volume' },
		{ key: 'difficulty', label: 'Kesulitan (0-100)' },
		{ key: 'cpcRange', label: 'Kisaran CPC' }
	], ideas.value)
}
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5">
			<form
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runGenerate"
			>
				<UFormField
					label="Kata Kunci Utama (Seed Keyword)"
					class="flex-1"
					hint="Temukan kluster kata kunci turunan berdasarkan klasifikasi search intent"
				>
					<UInput
						v-model="seed"
						placeholder="contoh: kacamata minus, nuxt seo, kopi robusta"
						required
						icon="ph:lightbulb"
					/>
				</UFormField>

				<UFormField
					label="Bahasa & Wilayah"
					class="w-full sm:w-44"
				>
					<USelect
						v-model="locale"
						:items="[
							{ label: 'Indonesia (ID)', value: 'id' },
							{ label: 'English (Global)', value: 'en' }
						]"
					/>
				</UFormField>

				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:magic-wand"
					label="Hasilkan Ide"
				/>
			</form>
		</div>

		<div
			v-if="ideas.length"
			class="space-y-4"
		>
			<!-- Intent Filters & Export -->
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap gap-1.5">
					<button
						v-for="(label, key) in intentLabels"
						:key="key"
						type="button"
						class="rounded px-2.5 py-1 text-xs font-medium transition-colors"
						:class="selectedIntent === key ? 'bg-primary text-white' : 'border border-default bg-panel text-muted hover:text-highlighted'"
						@click="selectedIntent = key as any"
					>
						{{ label }}
						<span class="ml-1 text-[11px] opacity-75">
							({{ key === 'all' ? ideas.length : ideas.filter(i => i.intent === key).length }})
						</span>
					</button>
				</div>

				<UButton
					size="xs"
					icon="ph:download-simple"
					label="Ekspor CSV"
					@click="exportCsv"
				/>
			</div>

			<!-- Keywords Table -->
			<div class="panel overflow-hidden">
				<div class="max-h-[480px] overflow-auto">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-default bg-muted/30 text-muted sticky top-0 backdrop-blur-xs">
							<tr>
								<th class="p-3">
									Ide Kata Kunci
								</th>
								<th class="p-3">
									Search Intent
								</th>
								<th class="p-3">
									Estimasi Volume
								</th>
								<th class="p-3">
									Tingkat Kesulitan (KD)
								</th>
								<th class="p-3">
									Perkiraan CPC
								</th>
								<th class="p-3 text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-default">
							<tr
								v-for="(item, idx) in filteredIdeas"
								:key="idx"
								class="hover:bg-muted/30"
							>
								<td class="p-3 font-medium text-highlighted">
									{{ item.keyword }}
								</td>
								<td class="p-3">
									<span
										class="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
										:class="{
											'bg-blue-500/10 text-blue-600 dark:text-blue-400': item.intent === 'informational',
											'bg-amber-500/10 text-amber-600 dark:text-amber-400': item.intent === 'commercial',
											'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': item.intent === 'transactional',
											'bg-purple-500/10 text-purple-600 dark:text-purple-400': item.intent === 'navigational',
											'bg-rose-500/10 text-rose-600 dark:text-rose-400': item.intent === 'question'
										}"
									>
										{{ item.intent }}
									</span>
								</td>
								<td class="p-3 capitalize text-muted">
									{{ item.volumeEstimate }}
								</td>
								<td class="p-3">
									<div class="flex items-center gap-2">
										<div class="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
											<div
												class="h-full rounded-full"
												:class="item.difficulty > 60 ? 'bg-error' : item.difficulty > 30 ? 'bg-warning' : 'bg-success'"
												:style="{ width: `${item.difficulty}%` }"
											/>
										</div>
										<span class="num text-muted">{{ item.difficulty }}/100</span>
									</div>
								</td>
								<td class="p-3 text-muted num">
									{{ item.cpcRange }}
								</td>
								<td class="p-3 text-right">
									<UButton
										size="xs"
										icon="ph:copy"
										variant="ghost"
										color="neutral"
										@click="copy(item.keyword, 'Kata kunci')"
									/>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</template>
