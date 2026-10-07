<script setup lang="ts">
import type { Col } from '~/types/table'

useHead({ title: 'Kata kunci | Inqudex' })

const seed = ref('')
const engine = ref<'google' | 'bing'>('google')
const lang = ref('id')
const mode = ref<'alpha' | 'questions' | 'prepositions'>('alpha')

const modes = [
	{ label: 'Tambah huruf a-z di belakang', value: 'alpha' },
	{ label: 'Awalan pertanyaan', value: 'questions' },
	{ label: 'Kata hubung (untuk, dengan, vs)', value: 'prepositions' }
]
const langs = [
	{ label: 'Indonesia', value: 'id' },
	{ label: 'English', value: 'en' }
]

const words = {
	questions: {
		id: ['apa', 'bagaimana', 'cara', 'kenapa', 'mengapa', 'kapan', 'dimana', 'siapa', 'berapa', 'apakah', 'bisakah'],
		en: ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'is', 'are', 'does']
	},
	prepositions: {
		id: ['untuk', 'dengan', 'tanpa', 'vs', 'atau', 'dan', 'terbaik', 'murah', 'gratis', 'adalah', 'di'],
		en: ['for', 'with', 'without', 'vs', 'or', 'and', 'best', 'cheap', 'free', 'near', 'to']
	}
} as const

function queries(): string[] {
	const s = seed.value.trim()
	if (mode.value === 'alpha') return [s, ...'abcdefghijklmnopqrstuvwxyz'.split('').map(c => `${s} ${c}`)]
	if (mode.value === 'questions') return [s, ...words.questions[lang.value as 'id' | 'en'].map(w => `${w} ${s}`)]
	return [s, ...words.prepositions[lang.value as 'id' | 'en'].map(w => `${s} ${w}`)]
}

async function suggest(q: string): Promise<string[]> {
	const url = engine.value === 'google'
		? `https://suggestqueries.google.com/complete/search?client=firefox&hl=${lang.value}&q=${encodeURIComponent(q)}`
		: `https://api.bing.com/osjson.aspx?mkt=${lang.value === 'id' ? 'id-ID' : 'en-US'}&query=${encodeURIComponent(q)}`
	const data = await fetchJson<[string, string[]]>(url)
	return Array.isArray(data?.[1]) ? data[1] : []
}

const state = ref<'idle' | 'loading' | 'error' | 'done'>('idle')
const error = ref('')
const done = ref(0)
const total = ref(0)
const rows = ref<{ keyword: string; words: number; from: string }[]>([])
let cancelled = false

async function run() {
	state.value = 'loading'
	error.value = ''
	cancelled = false
	rows.value = []
	const list = queries()
	total.value = list.length
	done.value = 0
	const found = new Map<string, string>()
	let failures = 0
	try {
		for (const q of list) {
			if (cancelled) break
			try {
				for (const k of await suggest(q)) if (!found.has(k.toLowerCase())) found.set(k.toLowerCase(), q)
			} catch {
				failures++
			}
			done.value++
			rows.value = [...found.entries()].map(([keyword, from]) => ({ keyword, from, words: keyword.split(/\s+/).length }))
			// Polite pacing: autocomplete endpoints throttle bursts.
			await sleep(180)
		}
		if (failures === list.length) throw new Error('Semua permintaan gagal. Cek koneksi internet, atau mesin pencari memblokir permintaan sementara.')
		state.value = 'done'
	} catch (e) {
		error.value = (e as Error).message
		state.value = 'error'
	}
}

const cols: Col[] = [
	{ key: 'keyword', label: 'Saran kata kunci' },
	{ key: 'words', label: 'Jumlah kata', align: 'right' },
	{ key: 'from', label: 'Ditemukan lewat' }
]
</script>

<template>
	<div>
		<PageHead
			title="Kata kunci"
			description="Saran dari kolom pencarian Google atau Bing, diperluas otomatis. Gratis, tanpa akun, dan tanpa angka volume."
		/>

		<form
			class="panel mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6"
			@submit.prevent="run"
		>
			<UFormField
				label="Kata kunci awal"
				class="sm:col-span-2 lg:col-span-2"
			>
				<UInput
					v-model="seed"
					required
					placeholder="mis. jasa pembuatan website"
				/>
			</UFormField>
			<UFormField label="Mesin">
				<USelect
					v-model="engine"
					:items="[{ label: 'Google', value: 'google' }, { label: 'Bing', value: 'bing' }]"
				/>
			</UFormField>
			<UFormField label="Bahasa">
				<USelect
					v-model="lang"
					:items="langs"
				/>
			</UFormField>
			<UFormField
				label="Cara memperluas"
				class="lg:col-span-2"
			>
				<USelect
					v-model="mode"
					:items="modes"
				/>
			</UFormField>
			<div class="flex gap-2 sm:col-span-2 lg:col-span-6">
				<UButton
					v-if="state !== 'loading'"
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:magnifying-glass"
					label="Cari saran"
				/>
				<UButton
					v-else
					color="error"
					icon="ph:stop"
					label="Hentikan"
					@click="cancelled = true"
				/>
			</div>
		</form>

		<div
			v-if="state === 'loading'"
			class="mb-4"
			role="status"
		>
			<p class="mb-1 text-sm text-muted">
				{{ done }} dari {{ total }} permintaan, {{ rows.length }} saran sejauh ini
			</p>
			<UProgress
				:model-value="done"
				:max="total"
				aria-label="Kemajuan pencarian saran"
			/>
		</div>

		<StateBox
			v-if="state === 'idle'"
			kind="empty"
			title="Belum ada saran"
			hint="Tulis satu kata kunci awal. Satu pencarian mengirim sampai 27 permintaan kecil dengan jeda, jadi butuh sekitar 5 detik."
		/>
		<StateBox
			v-else-if="state === 'error'"
			kind="error"
			title="Pencarian saran gagal"
			:hint="error"
		/>
		<StateBox
			v-else-if="!rows.length && state === 'done'"
			kind="empty"
			title="Tidak ada saran"
			hint="Mesin pencari tidak punya saran untuk kata kunci ini. Coba kata yang lebih umum."
		/>
		<DataTable
			v-else-if="rows.length"
			:columns="cols"
			:rows="rows"
			:export-name="`kata-kunci-${seed}`"
			caption="Saran kata kunci"
			:page-size="200"
		/>
	</div>
</template>
