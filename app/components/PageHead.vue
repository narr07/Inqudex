<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
	<header class="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
		<div class="min-w-0">
			<h1 class="text-2xl font-semibold tracking-tight text-highlighted sm:text-3xl">
				{{ title }}
			</h1>
			<p
				v-if="description"
				class="mt-1 max-w-2xl text-sm text-muted"
			>
				{{ description }}
			</p>
			<div
				class="ruler mt-3"
				aria-hidden="true"
			/>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<slot name="actions" />
		</div>
	</header>
</template>
