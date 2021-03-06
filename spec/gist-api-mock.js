function mergeFiles (gistFiles, files) {
	for (const filename in files) {
		const file = files[filename]
		if (('filename' in file && file.filename === null) || ('content' in file && (!file.content || file.content.toString().trim() === ''))) {
			delete gistFiles[filename]
		} else if (filename in gistFiles) {
			gistFiles[filename].content = file.content
		} else {
			gistFiles[filename] = {
				content: file.content,
				filename,
			}
		}
	}

	return gistFiles
}

function randomHexString (len = 32) {
	let str = ''
	while (str.length < len) {
		str += Math.random().toString(16).substr(2)
	}
	return str.substring(0, len)
}

const gistCache = {}

module.exports = {
	getUrl () {
		const gistId = atom.config.get('sync-settings.gistId')
		return gistId ? `https://gist.github.com/${gistId}` : ''
	},

	async get () {
		const gistId = atom.config.get('sync-settings.gistId')
		if (!(gistId in gistCache)) {
			throw new Error(JSON.stringify({ message: 'Not Found' }))
		}

		return {
			files: gistCache[gistId].files,
			time: gistCache[gistId].history[0].committed_at,
			history: gistCache[gistId].history,
		}
	},

	async update (files) {
		const gistId = atom.config.get('sync-settings.gistId')
		if (!(gistId in gistCache)) {
			throw new Error(JSON.stringify({ message: 'Not Found' }))
		}

		const time = new Date().toISOString()
		const gist = gistCache[gistId]
		gist.description = atom.config.get('sync-settings.gistDescription')
		gist.files = mergeFiles(gist.files, files)
		gist.history.unshift({
			version: randomHexString(),
			committed_at: time,
		})

		return { time }
	},

	async fork () {
		const gistId = atom.config.get('sync-settings.gistId')
		if (!(gistId in gistCache)) {
			throw new Error(JSON.stringify({ message: 'Not Found' }))
		}

		const oldGist = gistCache[gistId]
		await this.create()
		const newGist = gistCache[gistId]
		newGist.description = oldGist.description
		newGist.files = mergeFiles({}, oldGist.files)

		return {}
	},

	async create () {
		const gistId = `mock-${randomHexString()}`
		atom.config.set('sync-settings.gistId', gistId)
		const gist = {
			id: gistId,
			description: atom.config.get('sync-settings.gistDescription'),
			files: { README: { content: Buffer.from('# Generated by Sync Settings for Atom\n\n<https://github.com/atom-community/sync-settings>') } },
			history: [{
				version: randomHexString(),
				committed_at: new Date().toISOString(),
			}],
			html_url: `https://${gistId}`,
		}
		gistCache[gistId] = gist

		return {}
	},

	async delete () {
		const gistId = atom.config.get('sync-settings.gistId')
		delete gistCache[gistId]
		return {}
	},
}
