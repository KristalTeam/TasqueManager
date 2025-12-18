import { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } from "discord.js";
import { handleBan } from "../../utils/ban";

export default {
	data: new SlashCommandBuilder()
		.setName('ban')
		.setDescription('[MOD] Bans a member.')
		.addUserOption(option =>
			option.setName('user')
			.setDescription('The user to ban')
			.setRequired(true))
		.addStringOption(option =>
			option.setName('delete_messages')
			.setDescription('How much of their recent message history to delete')
			.setRequired(false)
			.setChoices(
				{ name: "Don't Delete Any", value: '0' },
				{ name: 'Previous Hour', value: '1' },
				{ name: 'Previous 6 Hours', value: '6' },
				{ name: 'Previous 12 Hours', value: '12' },
				{ name: 'Previous 24 Hours', value: '24' },
				{ name: 'Previous 3 Days', value: '72' },
				{ name: 'Previous 7 Days', value: '168' },
			))
		.addStringOption(option =>
			option.setName('reason')
			.setDescription('The reason for banning, if any')
			.setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const target = await interaction.options.getMember('user');
		const reason = interaction.options.getString('reason');
		const deleteMessageHistory = interaction.options.getString('delete_messages');

		if (!target) {
			await interaction.editReply({ content: '❌ User not found!' });
			return;
		}

		await handleBan(target, reason, deleteMessageHistory, interaction);

		return true;
	},
};
