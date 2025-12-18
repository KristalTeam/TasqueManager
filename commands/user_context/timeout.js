import { ContextMenuCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags, ApplicationCommandType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from "discord.js";
import { handleTimeout } from "../../utils/timeout";

export default {
	data: new ContextMenuCommandBuilder()
		.setName('Timeout User')
		.setType(ApplicationCommandType.User)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		const target = interaction.targetMember;

		if (!target) {
			await interaction.reply({ content: '❌ User not found!' });
			return;
		}

		const modal = new ModalBuilder()
			.setCustomId('timeoutUserModal:' + target.id)
			.setTitle('Timeout User');

		const durationInput = new TextInputBuilder()
			.setCustomId('durationInput')
			.setLabel("Duration of the timeout")
			.setStyle(TextInputStyle.Short)
			.setRequired(true)
			.setPlaceholder('e.g., 30m, 2.5h, 4d12h');

		const reasonInput = new TextInputBuilder()
			.setCustomId('reasonInput')
			.setLabel("Reason for the timeout (optional)")
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(false)
			.setPlaceholder('Reason for the timeout');

		modal.addComponents(
			new ActionRowBuilder().addComponents(durationInput),
			new ActionRowBuilder().addComponents(reasonInput)
		);

		await interaction.showModal(modal);
	},
	async onModalSubmit(id, interaction) {
		const split = id.split(':');
		if (split[0] == 'timeoutUserModal') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const target = await interaction.guild.members.fetch(split[1]);
			if (!target) {
				await interaction.editReply({ content: '❌ User not found!' });
				return;
			}
			const duration = interaction.fields.getTextInputValue('durationInput');
			const reason = interaction.fields.getTextInputValue('reasonInput');

			await handleTimeout(target, duration, reason, interaction);
			return true;
		}
		return false;
	}
};
