<script setup lang="ts">
import type { Col } from '~/types/table'

/**
 * Renders any gscdump JSON (reports, analyzers, inspections) without a hand-written view per
 * analyzer: arrays of flat objects become tables, plain objects become key/value lists, and
 * everything else falls back to formatted JSON.
 */
const props = defineProps<{ data: unknown; name: string }>()

type Row = Record<string, unknown>
interface Block {
	title: string
	kind: 'table' | 'kv' | 'json'
	rows?: Row[]
	cols?: Col[]
	value?: unknown
}

const isObj = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)
const isRows = (v: unknown): v is Row[] => Array.isArray(v) && v.length > 0 && v.every(isObj)
const scalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v)

const pretty = (k: string) => k.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, c => c.toUpperCase())

function toCols(rows: Row[]): Col[] {
	const keys = [...new Set(rows.slice(0, 50).flatMap(r => Object.keys(r)))].slice(0, 12)
	return keys.map(k => ({
		key: k,
		label: pretty(k),
		align: rows.some(r => typeof r[k] === 'number') ? 'right' : 'left'
	}))
}

function flatten(v: unknown, path: string, out: Block[], depth = 0) {
	if (isRows(v)) {
		out.push({ title: path, kind: 'table', rows: v, cols: toCols(v) })
		return
	}
	if (isObj(v)) {
		const scalars: Row = {}
		for (const [k, val] of Object.entries(v)) {
			if (scalar(val)) scalars[k] = val
		}
		if (Object.keys(scalars).length) out.push({ title: path, kind: 'kv', value: scalars })
		for (const [k, val] of Object.entries(v)) {
			if (scalar(val)) continue
			if (depth < 3) flatten(val, path ? `${path} / ${pretty(k)}` : pretty(k), out, depth + 1)
			else out.push({ title: `${path} / ${pretty(k)}`, kind: 'json', value: val })
		}
		return
	}
	if (Array.isArray(v)) {
		if (v.length && v.every(scalar)) out.push({ title: path, kind: 'kv', value: Object.fromEntries(v.map((x, i) => [String(i + 1), x])) })
		else if (v.length) out.push({ title: path, kind: 'json', value: v })
		return
	}
	out.push({ title: path, kind: 'kv', value: { nilai: v } })
}

const blocks = computed<Block[]>(() => {
	const out: Block[] = []
	flatten(props.data, '', out)
	return out
})

const fmt = (v: unknown) => (typeof v === 'number' ? v.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : String(v ?? ''))
</script>

<template>
	<div class="space-y-5">
		<section
			v-for="(b, i) in blocks"
			:key="i"
		>
			<h3
				v-if="b.title"
				class="mb-2 text-sm font-semibold text-highlighted"
			>
				{{ b.title }}
			</h3>
			<DataTable
				v-if="b.kind === 'table'"
				:columns="b.cols!"
				:rows="b.rows!"
				:export-name="`${name}-${i + 1}`"
				:page-size="50"
			/>
			<dl
				v-else-if="b.kind === 'kv'"
				class="panel grid gap-x-6 gap-y-1 p-3 text-sm sm:grid-cols-[minmax(8rem,14rem)_1fr]"
			>
				<template
					v-for="(val, k) in (b.value as Row)"
					:key="k"
				>
					<dt class="text-muted">
						{{ pretty(String(k)) }}
					</dt>
					<dd class="num break-words text-highlighted">
						{{ fmt(val) }}
					</dd>
				</template>
			</dl>
			<pre
				v-else
				class="log max-h-72 overflow-auto p-3 break-words whitespace-pre-wrap"
			>{{ JSON.stringify(b.value, null, 2) }}</pre>
		</section>
	</div>
</template>
