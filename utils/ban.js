// @ts-check

import { MessageFlags } from 'discord.js';
import { TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

/**
 * Handles banning out a user.
 * @param {import("discord.js").GuildMember} target The member to ban.
 * @param {string | null} reason The reason for the ban.
 * @param {string | null} hours The duration of message history to delete.
 * @param {import("discord.js").CommandInteraction} interaction The interaction that triggered the ban.
 * @param {import("discord.js").Message | null} [selectedMessage] The message that triggered the ban, if applicable.
 * @return {Promise<void>}
*/
export async function handleBan(target, reason, hours, interaction, selectedMessage = null)
{
    if (!hours) {
        await interaction.editReply({ content: '❌ Invalid delete duration! Must be between 0 and 168 hours (7 days).' });
        return;
    }

    // hours is a string, we need to convert it to seconds
    const time = Number(hours) * 3600;

    if (isNaN(time) || time < 0 || time > 604800) {
        await interaction.editReply({ content: '❌ Invalid delete duration! Must be between 0 and 168 hours (7 days).' });
        return;
    }

    const executorName = target.nickname ?? target.user.displayName;

    // dm the user
    await target.user.send({
        components: createBanDMComponents(target, reason, selectedMessage),
        flags: MessageFlags.IsComponentsV2
    });

    if (!reason)
    {
        await target.ban({
            deleteMessageSeconds: time,
            reason: `${executorName}: No reason provided.`
        })
        await interaction.editReply({ content: `✅ Banned ${target.displayName} (\`${target.id}\`).` });
    }
    else
    {
        await target.ban({
            deleteMessageSeconds: time,
            reason: `${executorName}: ${reason}`
        })
        await interaction.editReply({ content: `✅ Banned ${target.displayName} (\`${target.id}\`). Reason: ${reason}` });
    }
}

/**
 * Creates the components for a ban DM message.
 * 
 * @param {import("discord.js").GuildMember} target
 * @param {string | null} [reason]
 * @param {import("discord.js").Message | null} [selectedMessage]
 * @returns {(import("discord.js").TextDisplayBuilder |
 *            import("discord.js").SeparatorBuilder |
 *            import("discord.js").ContainerBuilder)[]}
 */
export function createBanDMComponents(target, reason = null, selectedMessage = null) {
    if (!target) throw new Error("Target user is required to create ban DM components.");

    const components = [];

    if (reason) {
        components.push(
            new TextDisplayBuilder().setContent("## 🔨 You've been banned from **Kristal** for the following reason:"),
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(false),
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(reason),
                ),
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        );
    }
    else
    {
        components.push(
            new TextDisplayBuilder().setContent("## 🔨 You've been banned from **Kristal**."),
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(false),
        );
    }

    if (selectedMessage) {
        components.push(
            new TextDisplayBuilder().setContent("### Your offending message:"),
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**" + target.displayName + "**"),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(selectedMessage.content ? selectedMessage.content : "*[No text content]*"),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`-# <t:${Math.floor(selectedMessage.createdTimestamp / 1000)}>`)
                    ),
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        );
    }

    components.push(
        new TextDisplayBuilder().setContent("-# If you feel the ban was undeserved, message a moderator."),
    );
    return components;
}
