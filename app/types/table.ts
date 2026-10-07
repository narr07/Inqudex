export interface Col {
	key: string
	label: string
	align?: 'left' | 'right'
	format?: (v: unknown, row: Record<string, unknown>) => string
	mono?: boolean
}
