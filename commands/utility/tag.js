const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
var sanitize = require("sanitize-filename");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tag')
		.setDescription('Posts a tag.')
		.addStringOption(option =>
			option.setName('name')
			.setDescription('The name of the tag to post.')
			.setAutocomplete(true)
			.setRequired(true)),
	async execute(interaction) {
		const tagName = sanitize(interaction.options.getString('name'));
		// Read the tag file
		const tagFilePath = path.join(__dirname, '../../', 'tags', `${tagName}.json`);
		if (!fs.existsSync(tagFilePath)) {
			await interaction.reply({ content: `❌ Tag "${tagName}" not found!`, flags: MessageFlags.Ephemeral });
			return;
		}

		let tagData;
		try {
			tagData = require(tagFilePath);
		}
		catch (error)
		{
			console.error(`Error loading tag file ${tagFilePath}:`, error);
			await interaction.reply({ content: '❌ There was an error loading the tag!', flags: MessageFlags.Ephemeral });
			return;
		}

		// Alright, we have the tag data. But does it also have an attachments folder?
		// - tags/my_cool_tag.json
		// - tags/my_cool_tag/*

		const attachments = [];

		const tagAttachmentsPath = path.join(__dirname, '../../', 'tags', tagName);
		if (fs.existsSync(tagAttachmentsPath) && fs.lstatSync(tagAttachmentsPath).isDirectory()) {
			// If it does, we need to add the attachments to the tag data
			// We'll upload any file, the content is expected to use all attachments

			const file_attachments = fs.readdirSync(tagAttachmentsPath);
			// Okay, add them to the discord.js attachment array
			for (const file of file_attachments) {
				const filePath = path.join(tagAttachmentsPath, file);
				if (fs.lstatSync(filePath).isFile()) {
					attachments.push({ attachment: filePath, name: file });
				}
			}
		}

		await interaction.reply({ components: tagData, flags: MessageFlags.IsComponentsV2, files: attachments });
	},
	async autocomplete(interaction) {
		const focusedValue = interaction.options.getFocused();

		// Get all tag files in the tags directory
		const tagsPath = path.join(__dirname, '../../', 'tags');
		const tagFiles = fs.readdirSync(tagsPath).filter(file => file.endsWith('.json'));
		// Extract tag names from file names
		const tagNames = tagFiles.map(file => path.basename(file, '.json'));
		// Filter tag names based on the focused value
		if (!focusedValue) {
			await interaction.respond(tagNames.map(name => ({ name, value: name })));
			return;
		}

		const filtered = tagNames.filter(name => name.startsWith(sanitize(focusedValue)));
		const response = filtered.map(name => ({ name, value: name }));
		await interaction.respond(response);
	}
};
