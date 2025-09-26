import { ContextMenuCommandBuilder, PermissionFlagsBits, InteractionContextType, MessageFlags, ApplicationCommandType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } from "discord.js";
import { TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';
import parse from 'parse-duration';

export default {
	data: new ContextMenuCommandBuilder()
		.setName('Timeout User')
		.setType(ApplicationCommandType.User)
		.setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
		.setContexts(InteractionContextType.Guild),
	async execute(interaction) {
		//await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
			if (!duration || isNaN(parse(duration))) {
				await interaction.editReply({ content: '❌ Invalid duration! Examples: `30m`, `2.5h`, `4d12h`' });
				return;
			}
			if (parse(duration) < 1000 * 30 || parse(duration) > 1000 * 60 * 60 * 24 * 28) {
				await interaction.editReply({ content: '❌ Duration must be between 30 seconds and 28 days!' });
				return;
			}
			const executorName = interaction.member ? interaction.member.displayName : interaction.user.displayName;
			if (!reason)
			{
				await target.timeout(parse(duration), `${executorName}: No reason provided.`);
				await interaction.editReply({ content: `✅ Timed out ${target.displayName} (\`${target.id}\`) for ${duration}.` }, { flags: MessageFlags.Ephemeral });
			}
			else
			{
				await target.timeout(parse(duration), `${executorName}: ${reason}`);
				await interaction.editReply({ content: `✅ Timed out ${target.displayName} (\`${target.id}\`) for ${duration}. Reason: ${reason}` }, { flags: MessageFlags.Ephemeral });
			}

			const components = [
					new TextDisplayBuilder().setContent("## ⏰ You've been timed out from **Kristal** for the following reason:"),
					new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(false),
					new ContainerBuilder()
						.addTextDisplayComponents(
							new TextDisplayBuilder().setContent(reason ? reason : "No reason provided."),
						),
					new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
					new TextDisplayBuilder().setContent("-# Your timeout will expire <t:" + Math.floor((Date.now() + parse(duration)) / 1000) + ":R>. Please review the rules if necessary, and if you feel the timeout was undeserved, message a moderator."),
			];

			// dm the user
			const message = await interaction.client.channels.cache.get(target.user.dmChannel?.id ?? (await target.user.createDM()).id).send({ components: components, flags: MessageFlags.IsComponentsV2 });

			return true;
		}
		return false;
	}
};
