import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export interface CliResult {
	code: number | null
	stdout: string
	stderr: string
	killed: boolean
}

export interface LogLine {
	stream: 'stdout' | 'stderr'
	line: string
}

export interface RunOptions {
	env?: Record<string, string>
	cwd?: string
	id?: string
	onLog?: (l: LogLine) => void
}

export class CliError extends Error {
	code?: string
	nextCommand?: string | null
	constructor(message: string, code?: string, nextCommand?: string | null) {
		super(message)
		this.code = code
		this.nextCommand = nextCommand
	}
}

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let counter = 0
const newId = () => `job-${Date.now()}-${counter++}`

/** gscdump prints a status line on stdout before the JSON body, so cut from the first JSON token. */
export function extractJson(text: string): unknown {
	const trimmed = text.trim()
	try {
		return JSON.parse(trimmed)
	} catch {
		const m = /^[[{]/m.exec(trimmed)
		if (!m) throw new Error('no json')
		return JSON.parse(trimmed.slice(m.index))
	}
}

export function useCli() {
	const settings = useSettings()

	const bin = (name: keyof AppSettings['bins']) => settings.value.bins[name] || name

	/** Google credentials: only forced when the user set a key file; otherwise gscdump uses its own saved login. */
	const googleEnv = () => {
		const env: Record<string, string> = {}
		if (settings.value.serviceAccountPath) env.GOOGLE_APPLICATION_CREDENTIALS = settings.value.serviceAccountPath
		return env
	}

	async function run(program: string, args: string[], opts: RunOptions = {}): Promise<CliResult> {
		if (!isTauri()) {
			throw new CliError('Perintah CLI hanya bisa dijalankan di aplikasi desktop. Buka lewat `bun run tauri:dev`.', 'NO_TAURI')
		}
		const id = opts.id ?? newId()
		const live = Boolean(opts.onLog)
		const unlisten = live
			? await listen<{ id: string; stream: 'stdout' | 'stderr'; line: string }>('cli-log', (e) => {
					if (e.payload.id === id) opts.onLog?.({ stream: e.payload.stream, line: e.payload.line })
				})
			: undefined
		try {
			return await invoke<CliResult>('run_cli', {
				id,
				program,
				args,
				env: opts.env ?? {},
				cwd: opts.cwd ?? null,
				live
			})
		} catch (e) {
			throw new CliError(String(e), 'SPAWN')
		} finally {
			unlisten?.()
		}
	}

	async function runJson<T = unknown>(program: string, args: string[], opts: RunOptions = {}): Promise<T> {
		const res = await run(program, args, opts)
		let parsed: unknown
		try {
			parsed = extractJson(res.stdout)
		} catch {
			parsed = undefined
		}
		if (res.code !== 0) {
			const err = (parsed as { error?: { code?: string; message?: string; nextCommand?: string } } | undefined)?.error
			const fallback = res.stderr.split('\n').map(l => l.trim()).filter(Boolean).pop()
			throw new CliError(err?.message || fallback || `Perintah gagal (kode ${res.code})`, err?.code, err?.nextCommand)
		}
		if (parsed === undefined) throw new CliError('Output CLI bukan JSON yang valid.', 'BAD_JSON')
		return parsed as T
	}

	const cancel = (id: string) => (isTauri() ? invoke<boolean>('cancel_cli', { id }) : Promise.resolve(false))

	return { bin, googleEnv, run, runJson, cancel, newId }
}

/** A long-running CLI job with live log lines, a running flag and cancel. */
export function useJob() {
	const cli = useCli()
	const running = ref(false)
	const lines = ref<LogLine[]>([])
	const result = ref<CliResult | null>(null)
	const error = ref<string | null>(null)
	let currentId = ''

	async function start(program: string, args: string[], opts: RunOptions = {}) {
		if (running.value) return null
		running.value = true
		lines.value = []
		result.value = null
		error.value = null
		currentId = cli.newId()
		try {
			const res = await cli.run(program, args, {
				...opts,
				id: currentId,
				onLog: (l) => {
					lines.value.push(l)
					if (lines.value.length > 5000) lines.value.splice(0, 1000)
				}
			})
			result.value = res
			if (res.killed) error.value = 'Dibatalkan.'
			else if (res.code !== 0) error.value = `Proses selesai dengan kode ${res.code}.`
			return res
		} catch (e) {
			error.value = e instanceof Error ? e.message : String(e)
			return null
		} finally {
			running.value = false
		}
	}

	const cancel = () => currentId && cli.cancel(currentId)
	const clear = () => {
		lines.value = []
		result.value = null
		error.value = null
	}

	return { running, lines, result, error, start, cancel, clear }
}
