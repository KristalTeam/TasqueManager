import { SlashCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags } from "discord.js";
import { handleTimeout } from "../../utils/timeout.js";

export default {
	data: new SlashCommandBuilder()
		.setName('timeout')
		.setDescription('[MOD] Times out a member.')
		.addUserOption(option =>
			option.setName('user')
			.setDescription('The user to timeout.')
			.setRequired(true))
		.addStringOption(option =>
			option.setName('duration')
			.setDescription('Duration of the timeout. Examples: `30m`, `2.5h`, `4d12h`')
			.setRequired(true))
		.addStringOption(option =>
			option.setName('reason')
			.setDescription('The reason for the timeout.')
			.setRequired(false))
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const target = await interaction.options.getMember('user');
		const reason = interaction.options.getString('reason');

		if (!target) {
			await interaction.editReply({ content: '❌ User not found!' });
			return;
		}

		const duration = interaction.options.getString('duration');

		await handleTimeout(target, duration, reason, interaction);

		return true;
	},
};
