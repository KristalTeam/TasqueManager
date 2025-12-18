import { SlashCommandBuilder, MessageFlags, LabelBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, FileUploadBuilder } from 'discord.js';
import database from '../../database.js';
import { eq } from 'drizzle-orm';
import { userRoles } from '../../db/schema.ts';

class BoostRoleCommand {
	constructor() {
		this.data = new SlashCommandBuilder()
			.setName('boostrole')
			.setDescription('Configures your boost role.');
	}

	async execute(interaction) {
		// find the member in the guild

		const guild = await interaction.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
		const member = await guild.members.fetch(interaction.user.id);

		if (!member) {
			await interaction.reply({ content: '❌ You weren\'t found in the guild!', flags: MessageFlags.Ephemeral });
			return;
		}

		const boostRole = member.roles.cache.find(role => role.tags?.premiumSubscriberRole)

		if (!boostRole) {
			await interaction.reply({ content: '❌ You are not boosting the server!', flags: MessageFlags.Ephemeral });
			return;
		}

		const modal = new ModalBuilder()
			.setCustomId('createBoostRoleModal')
			.setTitle('Customize your Boost Role');

		modal.addLabelComponents(
			new LabelBuilder()
				.setLabel("The name of the role")
				.setDescription("Set the name for your boost role. Please keep it appropriate.")
				.setTextInputComponent(
					new TextInputBuilder()
						.setCustomId('roleNameInput')
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setPlaceholder("My role")
						.setMaxLength(100)
				),
			new LabelBuilder()
				.setLabel("The color of the role")
				.setDescription("Set the color for your boost role in HEX format (e.g., #00FFFF).")
				.setTextInputComponent(
					new TextInputBuilder()
						.setCustomId('roleColorInput')
						.setStyle(TextInputStyle.Short)
						.setRequired(true)
						.setPlaceholder('#FFFFFF')
						.setMinLength(7)
						.setMaxLength(7)
				),
			new LabelBuilder()
				.setLabel("The icon of the role (optional)")
				.setDescription("Upload an image file to use as the role icon.")
				.setFileUploadComponent(
					new FileUploadBuilder()
						.setCustomId('roleIconInput')
						.setRequired(false)
						.setMaxValues(1)
				)
		);

		await interaction.showModal(modal);
	}

	modal_handlers = {
		"createBoostRoleModal": async (interaction) => {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const guild = await interaction.client.guilds.fetch(process.env.DISCORD_GUILD_ID);
			const member = await guild.members.fetch(interaction.user.id);
			if (!member) {
				await interaction.editReply({ content: '❌ You weren\'t found in the guild! Try again later?' });
				return;
			}

			// get the "boost header" role
			const boostRole = await guild.roles.fetch(process.env.ROLE_BOOST_ROLES.toString()).catch(() => null);
			if (!boostRole) {
				await interaction.editReply({ content: '❌ Boost header not found, try again later?' });
				return;
			}

			// create the role
			const roleName = interaction.fields.getTextInputValue('roleNameInput');
			const roleColor = interaction.fields.getTextInputValue('roleColorInput');
			const roleIconFiles = interaction.fields.getUploadedFiles('roleIconInput');
			let url = null;

			if (roleIconFiles) {
				if (roleIconFiles.size > 1) {
					await interaction.editReply({ content: '❌ You can only upload one file for the role icon.' });
					return;
				}
				const file = roleIconFiles.first();
				if (file.size > 256 * 1024) {
					await interaction.editReply({ content: '❌ The role icon file size exceeds the 256KB limit.' });
					return;
				}

				if (file.contentType && !file.contentType.startsWith('image/')) {
					await interaction.editReply({ content: '❌ The role icon must be an image file.' });
					return;
				}

				url = file.url;
			}

			const userRole = await database.select().from(userRoles).where(eq(userRoles.user_id, interaction.user.id)).limit(1);
			if (userRole && userRole[0]) {
				const roleID = userRole[0].role_id;
				const existingRole = await guild.roles.fetch(roleID.toString()).catch(() => null);

				if (!existingRole) {
					await interaction.editReply({ content: '❌ Your previous boost role was not found; it may have been deleted. Please re-run the command.' });
					await database.delete(userRoles).where(eq(userRoles.user_id, interaction.user.id));
					return;
				}

				// edit the existing role
				try {
					await existingRole.edit({
						name: roleName,
						colors: { primaryColor: roleColor },
						icon: url,
						reason: `Boost role updated by ${interaction.user.tag}`,
					});
				}
				catch (error) {
					await interaction.editReply({ content: '❌ Failed to update the role; please make sure the color is a valid HEX code and try again.' });
					return;
				}

				await interaction.editReply({ content: `✅ Your boost role has been updated: ${existingRole}` });
				return;
			}

			let newRole;
			try {
				newRole = await guild.roles.create({
					name: roleName,
					colors: { primaryColor: roleColor },
					icon: url,
					hoist: false,
					mentionable: false,
					position: boostRole.position,
					reason: `Boost role created by ${interaction.user.tag}`,
				});
			}
			catch (error) {
				await interaction.editReply({ content: '❌ Failed to create the role; please make sure the color is a valid HEX code and try again.' });
				return;
			}

			await database.insert(userRoles).values({
				user_id: interaction.user.id,
				role_id: newRole.id
			});

			// assign the role to the member
			await member.roles.add(newRole, 'Assigning boost role to member');
			await interaction.editReply({ content: `✅ Your boost role has been created and assigned: ${newRole}` });
			return true;
		}
	}
}

export default new BoostRoleCommand();
