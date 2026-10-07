<script setup lang="ts">
defineProps<{
	items: { to: string; label: string; icon: string }[]
	isActive: (to: string) => boolean
}>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
</script>

<template>
	<div class="flex h-full min-h-0 flex-1 flex-col">
		<div class="flex items-center gap-2 px-4 py-5">
			<span
				class="grid size-8 place-items-center rounded-md bg-[var(--ink)] text-sm font-semibold text-white"
				aria-hidden="true"
			>IN</span>
			<span class="text-lg font-semibold tracking-tight text-highlighted">Inqudex</span>
		</div>
		<nav class="min-h-0 flex-1 overflow-y-auto px-2">
			<ul class="space-y-0.5">
				<li
					v-for="i in items"
					:key="i.to"
				>
					<NuxtLink
						:to="i.to"
						class="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium"
						:class="isActive(i.to) ? 'bg-elevated text-highlighted shadow-[inset_3px_0_0_var(--ui-primary)]' : 'text-muted hover:bg-elevated/70 hover:text-highlighted'"
						:aria-current="isActive(i.to) ? 'page' : undefined"
					>
						<UIcon
							:name="i.icon"
							class="size-5 shrink-0"
						/>
						{{ i.label }}
					</NuxtLink>
				</li>
			</ul>
		</nav>
		<div class="border-t border-default p-3">
			<UButton
				:icon="isDark ? 'ph:sun' : 'ph:moon'"
				:label="isDark ? 'Tema terang' : 'Tema gelap'"
				color="neutral"
				variant="ghost"
				block
				class="min-h-11 justify-start"
				@click="colorMode.preference = isDark ? 'light' : 'dark'"
			/>
		</div>
	</div>
</template>
