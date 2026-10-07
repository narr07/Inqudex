<script setup lang="ts">
withDefaults(
	defineProps<{
		kind: 'empty' | 'loading' | 'error'
		title: string
		hint?: string
		next?: string | null
	}>(),
	{ hint: '', next: null }
)
const { copy } = useExport()
</script>

<template>
	<div
		class="panel flex flex-col items-start gap-2 p-5"
		:role="kind === 'error' ? 'alert' : 'status'"
		:aria-busy="kind === 'loading'"
	>
		<div class="flex items-center gap-2">
			<UIcon
				v-if="kind === 'loading'"
				name="ph:circle-notch"
				class="size-5 animate-spin text-muted"
			/>
			<UIcon
				v-else-if="kind === 'error'"
				name="ph:warning-octagon"
				class="size-5 text-error"
			/>
			<UIcon
				v-else
				name="ph:tray"
				class="size-5 text-muted"
			/>
			<p class="font-medium text-highlighted">
				{{ title }}
			</p>
		</div>
		<p
			v-if="hint"
			class="max-w-prose text-sm break-words text-muted"
		>
			{{ hint }}
		</p>
		<div
			v-if="next"
			class="flex flex-wrap items-center gap-2"
		>
			<code class="rounded-sm bg-muted px-2 py-1 font-mono text-xs break-all">{{ next }}</code>
			<UButton
				size="xs"
				icon="ph:copy"
				label="Salin perintah"
				@click="copy(next, 'Perintah')"
			/>
		</div>
		<slot />
	</div>
</template>
