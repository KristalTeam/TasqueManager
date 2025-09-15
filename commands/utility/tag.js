const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

class TagCommand {
	constructor() {
		this.data = new SlashCommandBuilder()
			.setName('tag')
			.setDescription('Posts a tag.')
			.addStringOption(option =>
				option.setName('name')
				.setDescription('The name of the tag to post.')
				.setAutocomplete(true)
				.setRequired(true));

		this.tags = new Map();
	}

	init(client) {
		// recurse through the `tags` folder

		// it should do the following:

		// - tags/my_cool_tag.json -> `my_cool_tag` is now a key in the map, value is the content of the file
		// - tags/my_cool_tag/* -> if a folder exists with the same name as the tag, it contains attachments for the tag
		// - tags/my_cool_tag/nested.json -> now, `my_cool_tag/nested` is a key.
		// - tags/my_second_tag.json -> `my_second_tag` is now a tag
		// - tags/my_second_tag/hi.png -> attachment for `my_second_tag` named `hi.png`

		const tagsPath = path.join(__dirname, '../../', 'tags');
		// this folder should always exist

		const walk = dir => {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const filePath = path.join(dir, file);
				if (fs.lstatSync(filePath).isDirectory()) {
					walk(filePath);
				} else if (file.endsWith('.json')) {
					// It's a tag file
					const tagName = path.relative(tagsPath, filePath).slice(0, -5).replace(/\\/g, '/'); // remove .json and convert \ to /
					let attachmentsDir = path.join(tagsPath, tagName); // attachments are in a folder with the same name as the tag
					if (!fs.existsSync(attachmentsDir) || !fs.lstatSync(attachmentsDir).isDirectory()) {
						attachmentsDir = null; // no attachments
					}

					this.tags.set(tagName, {
						path: filePath,
						content: require(filePath),
						attachmentsDir: attachmentsDir
					});
					console.log(`Loaded tag: ${tagName}`);
				}
			}
		};
		walk(tagsPath);

		console.log(`Loaded ${this.tags.size} tags.`);
	}

	async execute(interaction) {
		const tagName = interaction.options.getString('name');
		const tagData = this.tags.get(tagName);

		if (!tagData) {
			await interaction.reply({ content: `❌ Tag "${tagName}" not found!`, flags: MessageFlags.Ephemeral });
			return;
		}

		// Process attachments

		const attachments = [];

		if (tagData.attachmentsDir != null && fs.existsSync(tagData.attachmentsDir) && fs.lstatSync(tagData.attachmentsDir).isDirectory())
		{
			// We'll upload any file, the content is expected to use all attachments

			const file_attachments = fs.readdirSync(tagData.attachmentsDir);
			// Okay, add them to the discord.js attachment array
			for (const file of file_attachments) {
				const filePath = path.join(tagData.attachmentsDir, file);
				if (fs.lstatSync(filePath).isFile()) {
					if (file.endsWith('.json')) continue; // Ignore JSON files because those are other tags
					attachments.push({ attachment: filePath, name: file });
				}
			}
		}

		await interaction.reply({ components: tagData.content, flags: MessageFlags.IsComponentsV2, files: attachments, allowedMentions: {
			users: [],
			roles: []
		} });
	}

	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();

		const tagNames = Array.from(this.tags.keys());

		// Filter tag names based on the focused value
		if (!focusedValue) {
			await interaction.respond(this.tags.size > 25 ? [] : tagNames.map(name => ({ name, value: name })));
			return;
		}

		const filtered = tagNames.filter(name => name.toLowerCase().includes(focusedValue.toLowerCase()));
		const response = filtered.map(name => ({ name, value: name }));
		await interaction.respond(response);
	}
}

module.exports = new TagCommand();