import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export default {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('[OWNER] Registers commands.'),
	async execute(interaction) {
		if (interaction.user && interaction.user.id === process.env.DISCORD_OWNER_ID) {
			await interaction.client.application.commands.set(interaction.client.commands.map(command => command.data.toJSON()));
			await interaction.reply({ content: '✅ Registered commands!', flags: MessageFlags.Ephemeral });
			return;
		}
		await interaction.reply({ content: '❌ You are not the owner!', flags: MessageFlags.Ephemeral });
	},
};
