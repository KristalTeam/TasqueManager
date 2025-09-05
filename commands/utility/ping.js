const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Test if the bot is working.'),
	async execute(interaction) {
		await interaction.reply({ content: 'Order, order!', flags: MessageFlags.Ephemeral });
	},
};
