import { ContextMenuCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags, ApplicationCommandType, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { handleBan } from "../../utils/ban";

export default {
	data: new ContextMenuCommandBuilder()
		.setName('Ban User')
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
			.setCustomId('banUserModal:' + target.id)
			.setTitle('Ban @' + target.user.username);

		modal.addLabelComponents(
			new LabelBuilder()
				.setLabel("Reason for the ban (optional)")
				.setDescription("Through the bot, this will be sent to the banned user.")
				.setTextInputComponent(
					new TextInputBuilder()
								.setCustomId('reasonInput')
								.setStyle(TextInputStyle.Paragraph)
								.setRequired(false)
								.setPlaceholder('Breaking server rules')
				),
			new LabelBuilder()
				.setLabel("Delete Message History")
				.setDescription("Defaults to not deleting any message history.")
				.setStringSelectMenuComponent(
					new StringSelectMenuBuilder()
						.setCustomId('deleteMessageHistorySelect')
						.addOptions(new StringSelectMenuOptionBuilder().setLabel("Don't Delete Any").setValue('0').setDefault(true))
						.addOptions(new StringSelectMenuOptionBuilder().setLabel("Previous Hour").setValue('1'))
						.addOptions(new StringSelectMenuOptionBuilder().setLabel("Previous 6 Hours").setValue('6'))
						.addOptions(new StringSelectMenuOptionBuilder().setLabel("Previous 12 Hours").setValue('12'))
						.addOptions(new StringSelectMenuOptionBuilder().setLabel("Previous 24 Hours").setValue('24'))
						.addOptions(new StringSelectMenuOptionBuilder().setLabel("Previous 3 Days").setValue('72'))
						.addOptions(new StringSelectMenuOptionBuilder().setLabel("Previous 7 Days").setValue('168'))
				)
		);

		await interaction.showModal(modal);
	},
	async onModalSubmit(id, interaction) {
		const split = id.split(':');
		if (split[0] == 'banUserModal') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const target = await interaction.guild.members.fetch(split[1]);
			if (!target) {
				await interaction.editReply({ content: '❌ User not found!' });
				return;
			}
			const reason = interaction.fields.getTextInputValue('reasonInput');
			const deleteMessageHistory = interaction.fields.getStringSelectValues('deleteMessageHistorySelect')[0];

			await handleBan(target, reason, deleteMessageHistory, interaction);
			return true;
		}
		return false;
	}
};
