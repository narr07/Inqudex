<script setup lang="ts">
import type { Col } from '~/types/table'

const props = withDefaults(
	defineProps<{
		columns: Col[]
		rows: Record<string, unknown>[]
		exportName?: string
		searchable?: boolean
		pageSize?: number
		caption?: string
	}>(),
	{ exportName: 'data', searchable: true, pageSize: 100, caption: '' }
)

const sortKey = ref<string | null>(null)
const sortDir = ref<'asc' | 'desc'>('desc')
const query = ref('')
const shown = ref(props.pageSize)

const display = (c: Col, r: Record<string, unknown>) => {
	const v = r[c.key]
	if (c.format) return c.format(v, r)
	if (v === null || v === undefined) return ''
	if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('id-ID') : v.toLocaleString('id-ID', { maximumFractionDigits: 2 })
	if (typeof v === 'object') return JSON.stringify(v)
	return String(v)
}

const filtered = computed(() => {
	const q = query.value.trim().toLowerCase()
	let out = props.rows
	if (q) out = out.filter(r => props.columns.some(c => display(c, r).toLowerCase().includes(q)))
	if (sortKey.value) {
		const k = sortKey.value
		const dir = sortDir.value === 'asc' ? 1 : -1
		out = [...out].sort((a, b) => {
			const x = a[k]
			const y = b[k]
			if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
			return String(x ?? '').localeCompare(String(y ?? ''), 'id') * dir
		})
	}
	return out
})

function sortBy(key: string) {
	if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
	else {
		sortKey.value = key
		sortDir.value = 'desc'
	}
}

watch(() => props.rows, () => (shown.value = props.pageSize))

const { saveCsv } = useExport()
const ariaSort = (key: string) => (sortKey.value === key ? (sortDir.value === 'asc' ? 'ascending' : 'descending') : 'none')
</script>

<template>
	<div class="panel overflow-hidden">
		<div class="flex flex-wrap items-center justify-between gap-2 border-b border-default p-3">
			<UInput
				v-if="searchable"
				v-model="query"
				icon="ph:magnifying-glass"
				placeholder="Cari di tabel"
				aria-label="Cari di tabel"
				class="max-w-xs"
			/>
			<p class="num text-sm text-muted">
				{{ filtered.length.toLocaleString('id-ID') }} baris
			</p>
			<UButton
				size="sm"
				icon="ph:download-simple"
				label="Ekspor CSV"
				:disabled="!filtered.length"
				@click="saveCsv(exportName, columns, filtered)"
			/>
		</div>
		<div class="max-h-[32rem] overflow-auto">
			<table class="w-full text-sm">
				<caption
					v-if="caption"
					class="sr-only"
				>
					{{ caption }}
				</caption>
				<thead class="sticky top-0 bg-muted">
					<tr>
						<th
							v-for="c in columns"
							:key="c.key"
							scope="col"
							:aria-sort="ariaSort(c.key)"
							class="px-3 py-2 font-medium text-toned"
							:class="c.align === 'right' ? 'text-right' : 'text-left'"
						>
							<button
								type="button"
								class="inline-flex min-h-6 items-center gap-1 rounded-sm hover:text-highlighted"
								@click="sortBy(c.key)"
							>
								{{ c.label }}
								<UIcon
									v-if="sortKey === c.key"
									:name="sortDir === 'asc' ? 'ph:arrow-up' : 'ph:arrow-down'"
									class="size-3.5"
								/>
							</button>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(r, i) in filtered.slice(0, shown)"
						:key="i"
						class="border-t border-default hover:bg-muted/60"
					>
						<td
							v-for="c in columns"
							:key="c.key"
							class="num px-3 py-2 align-top"
							:class="[c.align === 'right' ? 'text-right' : 'text-left', c.mono ? 'font-mono text-xs break-all' : 'break-words']"
						>
							{{ display(c, r) }}
						</td>
					</tr>
					<tr v-if="!filtered.length">
						<td
							:colspan="columns.length"
							class="px-3 py-6 text-center text-muted"
						>
							Tidak ada baris yang cocok dengan pencarian.
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<div
			v-if="filtered.length > shown"
			class="border-t border-default p-2 text-center"
		>
			<UButton
				size="sm"
				:label="`Tampilkan ${Math.min(pageSize, filtered.length - shown)} baris lagi`"
				@click="shown += pageSize"
			/>
		</div>
	</div>
</template>
