<script setup lang="ts">
useHead({ title: 'Pengaturan | Inqudex' })

const settings = useSettings()
const { pickFile, copy } = useExport()
const { sites, loadSites, sitesLoading } = useGsc()
const cli = useCli()
const toast = useToast()

const authJob = useJob()

async function chooseServiceAccount() {
	const p = await pickFile(['json'], 'File service account Google')
	if (p) {
		settings.value.serviceAccountPath = p
		toast.add({ title: 'Path service account diperbarui', description: p, color: 'success' })
	}
}

async function testGscAuth() {
	await authJob.start(cli.bin('gscdump'), ['auth', 'status', '--json'], { env: cli.googleEnv() })
	if (authJob.result.value?.code === 0) {
		toast.add({ title: 'Login Google terverifikasi', color: 'success' })
		await loadSites()
	}
}

function handleReset() {
	if (confirm('Kembalikan semua pengaturan ke nilai awal?')) {
		resetSettings()
		toast.add({ title: 'Pengaturan direset ke awal', color: 'neutral' })
	}
}
</script>

<template>
	<div>
		<PageHead
			title="Pengaturan"
			description="Konfigurasi kredensial Google, PageSpeed API, IndexNow, dan lokasi binary CLI di komputer."
		>
			<template #actions>
				<UButton
					color="error"
					variant="subtle"
					icon="ph:arrow-counter-clockwise"
					label="Reset ke Awal"
					@click="handleReset"
				/>
			</template>
		</PageHead>

		<div class="space-y-6">
			<!-- Google & Search Console -->
			<section class="panel p-5">
				<h2 class="text-base font-semibold text-highlighted">
					Akun Google & Search Console
				</h2>
				<p class="mt-1 text-sm text-muted">
					Kredensial service account dipakai oleh gscdump dan google-indexing-script tanpa perlu login browser berulang.
				</p>

				<div class="mt-4 space-y-4">
					<UFormField
						label="File Service Account (.json)"
						hint="Download dari Google Cloud Console IAM & Admin > Service Accounts"
					>
						<div class="flex gap-2">
							<UInput
								v-model="settings.serviceAccountPath"
								placeholder="C:\kunci\service_account.json"
								class="font-mono"
							/>
							<UButton
								icon="ph:folder-open"
								label="Pilih File"
								@click="chooseServiceAccount"
							/>
						</div>
					</UFormField>

					<div class="flex flex-wrap items-center gap-3">
						<UButton
							color="primary"
							variant="solid"
							icon="ph:check-circle"
							label="Uji Kredensial Google"
							:loading="authJob.running.value"
							@click="testGscAuth"
						/>
						<UButton
							variant="outline"
							icon="ph:arrows-clockwise"
							label="Segarkan Daftar Situs"
							:loading="sitesLoading"
							@click="loadSites"
						/>
					</div>

					<div v-if="authJob.lines.value.length || authJob.error.value" class="mt-3">
						<LogPanel
							:lines="authJob.lines.value"
							:running="authJob.running.value"
							:error="authJob.error.value"
							empty-hint="Output verifikasi gscdump muncul di sini."
							@cancel="authJob.cancel"
						/>
					</div>
				</div>
			</section>

			<!-- PageSpeed & IndexNow -->
			<section class="panel p-5">
				<h2 class="text-base font-semibold text-highlighted">
					API Eksternal (PageSpeed & IndexNow)
				</h2>
				<p class="mt-1 text-sm text-muted">
					Opsional tapi direkomendasikan untuk menaikkan kuota audit kecepatan dan memvalidasi pengiriman URL instan.
				</p>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<UFormField
						label="Google PageSpeed API Key"
						hint="Dapatkan gratis di console.cloud.google.com"
					>
						<UInput
							v-model="settings.pagespeedKey"
							placeholder="AIzaSy..."
							type="password"
						/>
					</UFormField>

					<UFormField
						label="Host Utama IndexNow"
						hint="Contoh: permadi.dev atau domain utama"
					>
						<UInput
							v-model="settings.indexNowHost"
							placeholder="contoh.com"
						/>
					</UFormField>

					<UFormField
						label="Key IndexNow Aktif"
						hint="Minimal 8 karakter hex/alfanumerik"
						class="sm:col-span-2"
					>
						<div class="flex gap-2">
							<UInput
								v-model="settings.indexNowKey"
								placeholder="a1b2c3d4e5f6..."
								class="font-mono"
							/>
							<UButton
								size="sm"
								icon="ph:copy"
								label="Salin Key"
								:disabled="!settings.indexNowKey"
								@click="copy(settings.indexNowKey, 'Key IndexNow')"
							/>
						</div>
					</UFormField>
				</div>
			</section>

			<!-- CLI Executable Paths -->
			<section class="panel p-5">
				<h2 class="text-base font-semibold text-highlighted">
					Path Program CLI
				</h2>
				<p class="mt-1 text-sm text-muted">
					Ubah nama program di bawah jika tool dipasang di folder khusus dan tidak terdaftar langsung di PATH sistem operasi.
				</p>

				<div class="mt-4 grid gap-4 sm:grid-cols-2">
					<UFormField label="gscdump binary">
						<UInput
							v-model="settings.bins.gscdump"
							class="font-mono"
							placeholder="gscdump"
						/>
					</UFormField>

					<UFormField label="google-indexing-script (gis) binary">
						<UInput
							v-model="settings.bins.gis"
							class="font-mono"
							placeholder="gis"
						/>
					</UFormField>

					<UFormField label="Node.js binary">
						<UInput
							v-model="settings.bins.node"
							class="font-mono"
							placeholder="node"
						/>
					</UFormField>

					<UFormField label="Lighthouse binary">
						<UInput
							v-model="settings.bins.lighthouse"
							class="font-mono"
							placeholder="lighthouse"
						/>
					</UFormField>
				</div>
			</section>
		</div>
	</div>
</template>
