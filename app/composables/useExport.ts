import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './useCli'

export interface ExportColumn {
	key: string
	label: string
}

const esc = (v: unknown) => {
	const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(columns: ExportColumn[], rows: Record<string, unknown>[]) {
	const head = columns.map(c => esc(c.label)).join(',')
	const body = rows.map(r => columns.map(c => esc(r[c.key])).join(','))
	// BOM so Excel opens UTF-8 (Indonesian text) correctly.
	return '\uFEFF' + [head, ...body].join('\r\n')
}

export function useExport() {
	const toast = useToast()

	async function saveText(defaultName: string, content: string, ext = 'csv') {
		try {
			if (isTauri()) {
				const { save } = await import('@tauri-apps/plugin-dialog')
				const path = await save({ defaultPath: defaultName, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] })
				if (!path) return
				await invoke('write_text', { path, content })
				toast.add({ title: 'File disimpan', description: path, color: 'success' })
			} else {
				const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }))
				const a = document.createElement('a')
				a.href = url
				a.download = defaultName
				a.click()
				URL.revokeObjectURL(url)
			}
		} catch (e) {
			toast.add({ title: 'Gagal menyimpan', description: String(e), color: 'error' })
		}
	}

	const saveCsv = (name: string, columns: ExportColumn[], rows: Record<string, unknown>[]) =>
		saveText(`${name}.csv`, toCsv(columns, rows), 'csv')

	async function copy(text: string, what = 'Teks') {
		await navigator.clipboard.writeText(text)
		toast.add({ title: `${what} disalin`, color: 'success' })
	}

	async function pickFile(extensions: string[], title: string) {
		if (!isTauri()) return null
		const { open } = await import('@tauri-apps/plugin-dialog')
		const res = await open({ multiple: false, title, filters: [{ name: title, extensions }] })
		return typeof res === 'string' ? res : null
	}

	return { saveText, saveCsv, copy, pickFile }
}
