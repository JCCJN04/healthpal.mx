/// <reference types="vite/client" />

declare module 'mammoth/mammoth.browser' {
	export interface MammothConvertResult {
		value: string
		messages?: Array<unknown>
	}

	export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<MammothConvertResult>

	const mammoth: {
		convertToHtml: typeof convertToHtml
	}

	export default mammoth
}
