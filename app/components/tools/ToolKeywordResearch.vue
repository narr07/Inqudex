<script setup lang="ts">
import { fetchKeywordSuggestions } from '~/composables/useSeoTools'

const { saveCsv, copy } = useExport()

const query = ref('')
const engine = ref<'all' | 'google' | 'bing'>('all')
const includeAlphabet = ref(false)
const loading = ref(false)
const list = ref<Array<{ keyword: string; source: string }>>([])

async function runResearch() {
	if (!query.value.trim()) return
	loading.value = true
	list.value = []
	try {
		const base = await fetchKeywordSuggestions(query.value.trim(), engine.value)
		list.value.push(...base)

		if (includeAlphabet.value) {
			const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
			for (const char of alphabet.slice(0, 10)) { // Run first 10 for quick responsive query
				const sub = await fetchKeywordSuggestions(`${query.value.trim()} ${char}`, engine.value)
				sub.forEach(item => {
					if (!list.value.some(x => x.keyword.toLowerCase() === item.keyword.toLowerCase())) {
						list.value.push(item)
					}
				})
			}
		}
	} finally {
		loading.value = false
	}
}

function exportCsv() {
	saveCsv(`keyword-research-${query.value.trim()}`, [
		{ key: 'keyword', label: 'Kata Kunci' },
		{ key: 'source', label: 'Sumber Mesin Pencari' }
	], list.value)
}
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5 space-y-4">
			<form
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runResearch"
			>
				<UFormField
					label="Frasa / Kata Kunci Pencarian"
					class="flex-1"
					hint="Ambil saran autocomplete realtime langsung dari server Google dan Bing"
				>
					<UInput
						v-model="query"
						placeholder="contoh: belajar nuxt, cara membuat website, harga laptop"
						required
						icon="ph:magnifying-glass"
					/>
				</UFormField>

				<UFormField
					label="Sumber Mesin"
					class="w-full sm:w-44"
				>
					<USelect
						v-model="engine"
						:items="[
							{ label: 'Semua Mesin (Gabungan)', value: 'all' },
							{ label: 'Google Saja', value: 'google' },
							{ label: 'Bing Saja', value: 'bing' }
						]"
					/>
				</UFormField>

				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:magnifying-glass-plus"
					label="Riset Keyword"
					:loading="loading"
				/>
			</form>

			<div class="pt-2 border-t border-default text-xs">
				<label class="flex items-center gap-2 cursor-pointer text-muted hover:text-highlighted">
					<input
						v-model="includeAlphabet"
						type="checkbox"
						class="rounded accent-primary"
					>
					<span>Gunakan ekspansi Alphabet Soup (seed + a..z untuk variasi long-tail mendalam)</span>
				</label>
			</div>
		</div>

		<div
			v-if="list.length"
			class="space-y-4"
		>
			<div class="flex items-center justify-between">
				<div class="text-xs text-muted">
					Ditemukan <span class="num font-semibold text-highlighted">{{ list.length }}</span> saran kata kunci relevan
				</div>
				<UButton
					size="xs"
					icon="ph:download-simple"
					label="Ekspor CSV"
					@click="exportCsv"
				/>
			</div>

			<div class="panel overflow-hidden">
				<div class="max-h-[460px] overflow-auto">
					<table class="w-full text-left text-xs">
						<thead class="border-b border-default bg-muted/30 text-muted sticky top-0 backdrop-blur-xs">
							<tr>
								<th class="p-3">
									#
								</th>
								<th class="p-3">
									Saran Kata Kunci (Autocomplete)
								</th>
								<th class="p-3">
									Sumber Mesin
								</th>
								<th class="p-3 text-right">
									Aksi
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-default">
							<tr
								v-for="(item, idx) in list"
								:key="idx"
								class="hover:bg-muted/30"
							>
								<td class="p-3 text-muted num w-12">
									{{ idx + 1 }}
								</td>
								<td class="p-3 font-medium text-highlighted">
									{{ item.keyword }}
								</td>
								<td class="p-3">
									<span class="rounded bg-muted px-2 py-0.5 text-[10px] text-muted">
										{{ item.source }}
									</span>
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
