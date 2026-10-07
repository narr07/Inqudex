export default defineAppConfig({
	ui: {
		colors: {
			primary: 'orange',
			neutral: 'stone'
		},
		button: {
			slots: { base: 'cursor-pointer' }
		},
		formField: { slots: { root: 'w-full' } },
		input: { slots: { root: 'w-full' } },
		textarea: { slots: { root: 'w-full' } }
	}
})
