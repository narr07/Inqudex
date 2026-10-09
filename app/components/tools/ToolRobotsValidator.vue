<script setup lang="ts">
import { validateRobotsTxt, type RobotsValidationResult } from '~/composables/useSeoTools'

const robotsContent = ref(`User-agent: *
Disallow: /admin/
Disallow: /private/
Allow: /

User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

Sitemap: https://contoh.com/sitemap.xml`)

const targetUrl = ref('')
const testPath = ref('/admin/login')
const testUserAgent = ref('Googlebot')
const loading = ref(false)
const error = ref('')
const result = ref<RobotsValidationResult | null>(null)

const userAgents = [
	'Googlebot',
	'Bingbot',
	'GPTBot',
	'ClaudeBot',
	'PerplexityBot',
	'CCBot',
	'* (Semua crawler)'
]

async function fetchFromUrl() {
	if (!targetUrl.value.trim()) return
	loading.value = true
	error.value = ''
	try {
		let u = targetUrl.value.trim()
		if (!/^https?:\/\//i.test(u)) u = `https://${u}`
		const robotsUrl = u.endsWith('/robots.txt') ? u : `${u.replace(/\/$/, '')}/robots.txt`
		const res = await appFetch(robotsUrl)
		if (!res.ok) throw new Error(`HTTP ${res.status}: Gagal memuat robots.txt dari ${robotsUrl}`)
		robotsContent.value = await res.text()
		test()
	} catch (e) {
		error.value = (e as Error).message
	} finally {
		loading.value = false
	}
}

function test() {
	const ua = testUserAgent.value.startsWith('*') ? '*' : testUserAgent.value
	result.value = validateRobotsTxt(robotsContent.value, testPath.value.trim(), ua)
}

onMounted(() => {
	test()
})
</script>

<template>
	<div class="space-y-6">
		<!-- Fetch Bar -->
		<div class="panel p-5">
			<form
				class="flex flex-col gap-3 sm:flex-row sm:items-end"
				@submit.prevent="fetchFromUrl"
			>
				<UFormField
					label="Ambil robots.txt dari Domain / URL Situs"
					class="flex-1"
					hint="Masukkan URL situs untuk mengunduh robots.txt secara otomatis"
				>
					<UInput
						v-model="targetUrl"
						placeholder="https://contoh.com"
						type="url"
						icon="ph:globe"
					/>
				</UFormField>
				<UButton
					type="submit"
					color="primary"
					variant="solid"
					icon="ph:download-simple"
					label="Ambil robots.txt"
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

		<div class="grid gap-6 lg:grid-cols-2">
			<!-- Input editor & Test Controls -->
			<div class="panel p-5 space-y-4">
				<div class="flex items-center justify-between border-b border-default pb-2">
					<h3 class="font-semibold text-highlighted text-xs uppercase tracking-wider">
						Isi robots.txt
					</h3>
					<span class="text-xs text-muted">Bisa diedit langsung</span>
				</div>

				<UTextarea
					v-model="robotsContent"
					rows="12"
					class="font-mono text-xs leading-relaxed"
					placeholder="User-agent: *&#10;Disallow: /admin/"
					@input="test"
				/>

				<!-- Test runner controls -->
				<div class="space-y-3 pt-2 border-t border-default">
					<h4 class="font-semibold text-highlighted text-xs uppercase tracking-wider">
						Uji URL & Crawler
					</h4>

					<div class="grid gap-3 sm:grid-cols-2">
						<UFormField label="User-Agent Penguji">
							<USelect
								v-model="testUserAgent"
								:items="userAgents"
								@update:model-value="test"
							/>
						</UFormField>

						<UFormField label="Path Halaman yang Diuji">
							<UInput
								v-model="testPath"
								placeholder="/blog/artikel-1 atau /admin/"
								icon="ph:link"
								@input="test"
							/>
						</UFormField>
					</div>
				</div>
			</div>

			<!-- Test Results -->
			<div class="panel p-5 space-y-5">
				<div class="flex items-center justify-between border-b border-default pb-3">
					<h3 class="font-semibold text-highlighted">
						Hasil Pengujian RFC 9309
					</h3>
					<span
						v-if="result"
						class="rounded px-3 py-1 text-xs font-bold uppercase tracking-wider"
						:class="result.status === 'allowed' ? 'bg-success/15 text-success' : 'bg-error/15 text-error'"
					>
						{{ result.status === 'allowed' ? '✓ DIIZINKAN (ALLOWED)' : '✕ DIBLOKIR (BLOCKED)' }}
					</span>
				</div>

				<div
					v-if="result"
					class="space-y-4"
				>
					<div class="rounded-lg border border-default bg-muted/30 p-4 space-y-2 text-xs">
						<div class="flex items-center justify-between border-b border-default pb-2">
							<span class="text-muted">User-Agent Diuji</span>
							<span class="font-mono font-bold text-highlighted">{{ result.userAgent }}</span>
						</div>
						<div class="flex items-center justify-between border-b border-default pb-2">
							<span class="text-muted">Path Diuji</span>
							<span class="font-mono font-medium text-highlighted">{{ result.testedPath }}</span>
						</div>
						<div class="flex items-center justify-between border-b border-default pb-2">
							<span class="text-muted">Status Akses</span>
							<span
								class="font-bold"
								:class="result.status === 'allowed' ? 'text-success' : 'text-error'"
							>
								{{ result.status === 'allowed' ? 'Bot Diizinkan Crawling' : 'Bot Dilarang Mengakses' }}
							</span>
						</div>
						<div
							v-if="result.matchingRule"
							class="flex items-start justify-between pt-1"
						>
							<span class="text-muted shrink-0">Aturan Penentu</span>
							<div class="text-right">
								<span class="font-mono text-highlighted font-semibold">
									{{ result.matchingRule.directive }}: {{ result.matchingRule.path }}
								</span>
								<div class="text-[11px] text-muted">
									(Baris #{{ result.matchingRule.line }} pada grup {{ result.matchingRule.userAgentGroup }})
								</div>
							</div>
						</div>
						<div
							v-else
							class="text-muted pt-1 text-[11px]"
						>
							Tidak ada aturan spesifik yang memblokir, akses diizinkan secara default.
						</div>
					</div>

					<!-- Sitemaps detected -->
					<div
						v-if="result.sitemaps.length"
						class="space-y-2"
					>
						<h4 class="text-xs font-semibold text-highlighted">
							Sitemap Ditemukan di robots.txt
						</h4>
						<ul class="space-y-1">
							<li
								v-for="(sm, i) in result.sitemaps"
								:key="i"
								class="flex items-center gap-2 rounded bg-muted/40 p-2 text-xs font-mono text-highlighted"
							>
								<UIcon
									name="ph:tree-structure"
									class="size-4 shrink-0 text-muted"
								/>
								<span class="truncate">{{ sm }}</span>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
