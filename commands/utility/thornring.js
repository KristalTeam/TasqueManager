import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TextDisplayBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

class ThornRingCommand {
	constructor() {
		this.data = new SlashCommandBuilder()
			.setName('thornring')
			.setDescription('* That\'s not... the... ThornRing, is it...?.');
	}

	async execute(interaction) {
		const components = [
			new TextDisplayBuilder().setContent("\\* That's not... the... ThornRing, is it...?"),
			new ActionRowBuilder()
				.addComponents(
					new ButtonBuilder()
						.setStyle(ButtonStyle.Primary)
						.setLabel("Equip")
						.setEmoji({
							name: "❤️",
						})
						.setCustomId("equip_a"),
					new ButtonBuilder()
						.setStyle(ButtonStyle.Primary)
						.setLabel("Equip")
						.setEmoji({
							name: "❤️",
						})
						.setCustomId("equip_b"),
				),
		];

		await interaction.reply({ components: components, flags: MessageFlags.IsComponentsV2 });
	}
}

export default new ThornRingCommand();