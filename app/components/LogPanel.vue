<script setup lang="ts">
import type { LogLine } from '~/composables/useCli'

const props = defineProps<{
	lines: LogLine[]
	running: boolean
	error?: string | null
	emptyHint?: string
}>()
defineEmits<{ cancel: [] }>()

const el = ref<HTMLElement>()
watch(
	() => props.lines.length,
	async () => {
		await nextTick()
		if (el.value) el.value.scrollTop = el.value.scrollHeight
	}
)

const { copy } = useExport()
const text = computed(() => props.lines.map(l => l.line).join('\n'))
</script>

<template>
	<section
		class="panel p-3"
		aria-label="Output proses"
	>
		<div class="mb-2 flex items-center justify-between gap-2">
			<p class="text-sm font-medium text-highlighted">
				Output
				<span
					v-if="running"
					class="ml-2 text-xs font-normal text-muted"
				>berjalan, {{ lines.length }} baris</span>
			</p>
			<div class="flex gap-2">
				<UButton
					v-if="running"
					size="xs"
					color="error"
					icon="ph:stop"
					label="Hentikan"
					@click="$emit('cancel')"
				/>
				<UButton
					size="xs"
					icon="ph:copy"
					label="Salin"
					:disabled="!lines.length"
					@click="copy(text, 'Output')"
				/>
			</div>
		</div>
		<div
			ref="el"
			class="log max-h-96 min-h-32 overflow-auto p-3 break-words whitespace-pre-wrap"
			tabindex="0"
			role="log"
		>
			<template v-if="lines.length">
				<div
					v-for="(l, i) in lines"
					:key="i"
					:class="l.stream === 'stderr' ? 'text-amber-300' : ''"
				>
					{{ l.line }}
				</div>
			</template>
			<p
				v-else
				class="text-stone-400"
			>
				{{ running ? 'Menunggu output pertama...' : emptyHint || 'Belum ada proses yang dijalankan.' }}
			</p>
		</div>
		<p
			v-if="error"
			class="mt-2 text-sm text-error"
			role="alert"
		>
			{{ error }}
		</p>
	</section>
</template>
