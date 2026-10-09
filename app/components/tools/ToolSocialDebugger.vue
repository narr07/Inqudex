<script setup lang="ts">
import { inspectMeta, type MetaTagResult } from '~/composables/useSeoTools'

const urlInput = ref('')
const loading = ref(false)
const error = ref('')
const meta = ref<MetaTagResult | null>(null)
const platform = ref<'twitter' | 'facebook' | 'linkedin' | 'discord'>('twitter')

const settings = useSettings()
watch(() => settings.value.defaultSite, (s) => {
	if (!urlInput.value && s) {
		urlInput.value = s.startsWith('sc-domain:') ? `https://${s.slice(10)}/` : s
	}
}, { immediate: true })

async function runDebug() {
	if (!urlInput.value.trim()) return
	loading.value = true
	error.value = ''
	meta.value = null
	try {
		meta.value = await inspectMeta(urlInput.value.trim())
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

const previewTitle = computed(() => meta.value?.og.title || meta.value?.title || 'Judul Halaman')
const previewDesc = computed(() => meta.value?.og.description || meta.value?.description || 'Deskripsi halaman untuk pratinjau media sosial.')
const previewImage = computed(() => meta.value?.og.image || meta.value?.twitter.image || '')
const previewDomain = computed(() => {
	if (!meta.value?.url) return 'contoh.com'
	try {
		return new URL(meta.value.url).hostname
	} catch {
		return 'contoh.com'
	}
})

const tagChecklist = computed(() => {
	if (!meta.value) return []
	const m = meta.value
	return [
		{ tag: 'og:title', value: m.og.title, required: true },
		{ tag: 'og:description', value: m.og.description, required: true },
		{ tag: 'og:image', value: m.og.image, required: true },
		{ tag: 'og:url', value: m.og.url, required: false },
		{ tag: 'og:type', value: m.og.type, required: false },
		{ tag: 'twitter:card', value: m.twitter.card, required: true },
		{ tag: 'twitter:site', value: m.twitter.site, required: false }
	]
})
</script>

<template>
	<div class="space-y-6">
		<div class="panel p-5">
			<form
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="runDebug"
			>
				<UFormField
					label="URL Halaman untuk Social Debugger"
					class="flex-1"
					hint="Ambil kartu pratinjau Open Graph dan Twitter Cards persis seperti saat dibagikan"
				>
					<UInput
						v-model="urlInput"
						placeholder="https://contoh.com/artikel"
						type="url"
						required
						icon="ph:share-network"
					/>
				</UFormField>
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:magnifying-glass"
					label="Debug Card"
					:loading="loading"
				/>
			</form>
		</div>

		<div
			v-if="error"
			class="panel border-error/50 bg-error/10 p-4 text-sm text-error"
		>
			{{ error }}
		</div>

		<div
			v-if="meta"
			class="space-y-6"
		>
			<!-- Platform preview tabs -->
			<div class="panel p-5">
				<div class="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-default pb-4">
					<div>
						<h3 class="font-semibold text-highlighted">
							Simulasi Pratinjau Sosial
						</h3>
						<p class="text-xs text-muted">
							Pilih platform untuk melihat rendering visual kartu
						</p>
					</div>

					<div class="flex flex-wrap gap-1 rounded-lg border border-default p-1 bg-muted/40">
						<button
							type="button"
							class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
							:class="platform === 'twitter' ? 'bg-panel text-highlighted shadow-xs' : 'text-muted hover:text-highlighted'"
							@click="platform = 'twitter'"
						>
							<UIcon
								name="ph:x-logo"
								class="size-4"
							/>
							Twitter / X
						</button>
						<button
							type="button"
							class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
							:class="platform === 'facebook' ? 'bg-panel text-highlighted shadow-xs' : 'text-muted hover:text-highlighted'"
							@click="platform = 'facebook'"
						>
							<UIcon
								name="ph:facebook-logo"
								class="size-4"
							/>
							Facebook
						</button>
						<button
							type="button"
							class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
							:class="platform === 'linkedin' ? 'bg-panel text-highlighted shadow-xs' : 'text-muted hover:text-highlighted'"
							@click="platform = 'linkedin'"
						>
							<UIcon
								name="ph:linkedin-logo"
								class="size-4"
							/>
							LinkedIn
						</button>
						<button
							type="button"
							class="flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors"
							:class="platform === 'discord' ? 'bg-panel text-highlighted shadow-xs' : 'text-muted hover:text-highlighted'"
							@click="platform = 'discord'"
						>
							<UIcon
								name="ph:discord-logo"
								class="size-4"
							/>
							Discord
						</button>
					</div>
				</div>

				<!-- Mock Cards -->
				<div class="flex justify-center p-2">
					<!-- Twitter / X Card -->
					<div
						v-if="platform === 'twitter'"
						class="w-full max-w-lg overflow-hidden rounded-2xl border border-default bg-black text-white shadow-md font-sans"
					>
						<div class="relative aspect-video w-full overflow-hidden bg-zinc-900">
							<img
								v-if="previewImage"
								:src="previewImage"
								alt="OG Image Preview"
								class="size-full object-cover"
								@error="($event.target as HTMLElement).style.display = 'none'"
							>
							<div
								v-else
								class="flex size-full items-center justify-center text-xs text-zinc-500"
							>
								Tidak ada og:image
							</div>
							<div class="absolute bottom-2 left-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-medium backdrop-blur-xs">
								{{ previewDomain }}
							</div>
						</div>
						<div class="p-3">
							<p class="font-bold text-sm text-zinc-100 line-clamp-1">
								{{ previewTitle }}
							</p>
							<p class="mt-0.5 text-xs text-zinc-400 line-clamp-2">
								{{ previewDesc }}
							</p>
						</div>
					</div>

					<!-- Facebook Card -->
					<div
						v-else-if="platform === 'facebook'"
						class="w-full max-w-lg overflow-hidden rounded-md border border-default bg-white text-black shadow-sm dark:bg-[#242526] dark:text-[#e4e6eb] font-sans"
					>
						<div class="aspect-video w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
							<img
								v-if="previewImage"
								:src="previewImage"
								alt="Preview"
								class="size-full object-cover"
								@error="($event.target as HTMLElement).style.display = 'none'"
							>
							<div
								v-else
								class="flex size-full items-center justify-center text-xs text-muted"
							>
								Gambar belum disetel
							</div>
						</div>
						<div class="border-t border-default p-3 bg-[#f0f2f5] dark:bg-[#3a3b3c]">
							<span class="text-[11px] uppercase tracking-wider text-muted font-medium">{{ previewDomain }}</span>
							<p class="font-semibold text-sm line-clamp-1 mt-0.5">
								{{ previewTitle }}
							</p>
							<p class="text-xs text-muted line-clamp-1 mt-0.5">
								{{ previewDesc }}
							</p>
						</div>
					</div>

					<!-- LinkedIn Card -->
					<div
						v-else-if="platform === 'linkedin'"
						class="w-full max-w-lg overflow-hidden rounded-md border border-default bg-white text-black shadow-sm dark:bg-[#1b1f23] dark:text-white font-sans"
					>
						<div class="aspect-video w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
							<img
								v-if="previewImage"
								:src="previewImage"
								alt="Preview"
								class="size-full object-cover"
								@error="($event.target as HTMLElement).style.display = 'none'"
							>
						</div>
						<div class="p-3">
							<p class="font-semibold text-sm line-clamp-1">
								{{ previewTitle }}
							</p>
							<span class="text-xs text-muted">{{ previewDomain }}</span>
						</div>
					</div>

					<!-- Discord Embed -->
					<div
						v-else-if="platform === 'discord'"
						class="w-full max-w-lg rounded-r border-l-4 border-[#5865f2] bg-[#2f3136] p-4 text-[#dcddde] font-sans text-xs"
					>
						<div class="text-[11px] text-[#b9bbbe]">
							{{ meta.og.siteName || previewDomain }}
						</div>
						<a
							href="#"
							class="mt-1 block font-semibold text-sm text-[#00aff4] hover:underline"
							@click.prevent
						>
							{{ previewTitle }}
						</a>
						<p class="mt-1 leading-relaxed text-[#b9bbbe] line-clamp-3">
							{{ previewDesc }}
						</p>
						<div
							v-if="previewImage"
							class="mt-3 aspect-video max-w-xs overflow-hidden rounded"
						>
							<img
								:src="previewImage"
								alt="Embed"
								class="size-full object-cover"
								@error="($event.target as HTMLElement).style.display = 'none'"
							>
						</div>
					</div>
				</div>
			</div>

			<!-- Tags Checklist Table -->
			<div class="panel overflow-hidden">
				<div class="bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted">
					Status Tag Open Graph & Twitter
				</div>
				<div class="divide-y divide-default">
					<div
						v-for="item in tagChecklist"
						:key="item.tag"
						class="flex items-center justify-between p-4 text-xs"
					>
						<div class="space-y-0.5">
							<div class="flex items-center gap-2">
								<span class="font-mono font-medium text-highlighted">{{ item.tag }}</span>
								<span
									v-if="item.required"
									class="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted"
								>Wajib</span>
							</div>
							<p class="text-muted truncate max-w-md">
								{{ item.value || '(Belum disetel)' }}
							</p>
						</div>
						<div>
							<span
								v-if="item.value"
								class="rounded bg-success/15 px-2 py-0.5 font-medium text-success"
							>Ada</span>
							<span
								v-else
								class="rounded bg-error/15 px-2 py-0.5 font-medium text-error"
							>Hilang</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
