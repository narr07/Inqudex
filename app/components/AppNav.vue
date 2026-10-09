<script setup lang="ts">
export interface NavItem {
	to: string
	label: string
	icon: string
	badge?: string
}

export interface NavGroup {
	label?: string
	items: NavItem[]
}

defineProps<{
	groups: NavGroup[]
	isActive: (to: string) => boolean
}>()

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
</script>

<template>
	<div class="flex h-full min-h-0 flex-1 flex-col">
		<!-- Header Logo -->
		<div class="flex items-center gap-2.5 px-4 py-4 border-b border-default/60">
			<span
				class="grid size-8 place-items-center rounded-md bg-[var(--ink)] text-sm font-semibold text-white tracking-wider"
				aria-hidden="true"
			>IN</span>
			<div>
				<span class="text-base font-semibold tracking-tight text-highlighted block leading-tight">Inqudex</span>
				<span class="text-[10px] text-muted tracking-wider uppercase font-medium">SEO Desktop Suite</span>
			</div>
		</div>

		<!-- Grouped Navigation -->
		<nav class="min-h-0 flex-1 overflow-y-auto px-2 py-3 space-y-4">
			<div
				v-for="(group, gIdx) in groups"
				:key="gIdx"
				class="space-y-0.5"
			>
				<div
					v-if="group.label"
					class="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted/70 select-none"
				>
					{{ group.label }}
				</div>
				<ul class="space-y-0.5">
					<li
						v-for="i in group.items"
						:key="i.to"
					>
						<NuxtLink
							:to="i.to"
							class="flex min-h-9 items-center justify-between rounded-md px-3 text-xs font-medium transition-colors"
							:class="isActive(i.to) ? 'bg-elevated text-highlighted shadow-[inset_3px_0_0_var(--ui-primary)]' : 'text-muted hover:bg-elevated/70 hover:text-highlighted'"
							:aria-current="isActive(i.to) ? 'page' : undefined"
						>
							<div class="flex items-center gap-2.5 min-w-0">
								<UIcon
									:name="i.icon"
									class="size-4 shrink-0"
								/>
								<span class="truncate">{{ i.label }}</span>
							</div>
							<span
								v-if="i.badge"
								class="rounded bg-primary/10 px-1.5 py-0.2 text-[9px] font-semibold text-primary"
							>
								{{ i.badge }}
							</span>
						</NuxtLink>
					</li>
				</ul>
			</div>
		</nav>

		<!-- Bottom theme toggle -->
		<div class="border-t border-default p-2.5">
			<UButton
				:icon="isDark ? 'ph:sun' : 'ph:moon'"
				:label="isDark ? 'Tema terang' : 'Tema gelap'"
				color="neutral"
				variant="ghost"
				block
				size="sm"
				class="justify-start text-xs"
				@click="colorMode.preference = isDark ? 'light' : 'dark'"
			/>
		</div>
	</div>
</template>
