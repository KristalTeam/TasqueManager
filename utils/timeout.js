// @ts-check

import parse from 'parse-duration';
import { MessageFlags } from 'discord.js';
import { TextDisplayBuilder, ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize } from 'discord.js';

/**
 * Handles timing out a user.
 * @param {import("discord.js").GuildMember} target The member to timeout.
 * @param {string} duration The duration string.
 * @param {string | null} reason The reason for the timeout.
 * @param {import("discord.js").CommandInteraction} interaction The interaction that triggered the timeout.
 * @param {import("discord.js").Message | null} [selectedMessage] The message that triggered the timeout, if applicable.
 * @return {Promise<void>}
*/
export async function handleTimeout(target, duration, reason, interaction, selectedMessage = null)
{
    if (!duration) {
        await interaction.editReply({ content: '❌ Invalid duration! Examples: `30m`, `2.5h`, `4d12h`' });
        return;
    }

    const time = parse(duration);

    if (!time || isNaN(time)) {
        await interaction.editReply({ content: '❌ Invalid duration! Examples: `30m`, `2.5h`, `4d12h`' });
        return;
    }

    if (time < (1000 * 30) || time > (1000 * 60 * 60 * 24 * 28)) {
        await interaction.editReply({ content: '❌ Duration must be between 30 seconds and 28 days!' });
        return;
    }

    const executorName = target.nickname ?? target.user.displayName;

    if (!reason)
    {
        await target.timeout(time, `${executorName}: No reason provided.`);
        await interaction.editReply({ content: `✅ Timed out ${target.displayName} (\`${target.id}\`) for ${duration}.` });
    }
    else
    {
        await target.timeout(time, `${executorName}: ${reason}`);
        await interaction.editReply({ content: `✅ Timed out ${target.displayName} (\`${target.id}\`) for ${duration}. Reason: ${reason}` });
    }

    // dm the user
    await target.user.send({
        components: createTimeoutDMComponents(target, time, reason, selectedMessage),
        flags: MessageFlags.IsComponentsV2
    });
}

/**
 * Creates the components for a timeout DM message.
 * 
 * @param {import("discord.js").GuildMember} target
 * @param {number} time
 * @param {string | null} [reason]
 * @param {import("discord.js").Message | null} [selectedMessage]
 * @returns {(import("discord.js").TextDisplayBuilder |
 *            import("discord.js").SeparatorBuilder |
 *            import("discord.js").ContainerBuilder)[]}
 */
export function createTimeoutDMComponents(target, time, reason = null, selectedMessage = null) {
    if (!target) throw new Error("Target user is required to create timeout DM components.");
    if (isNaN(time)) throw new Error("Duration must be a valid time string to create timeout DM components.");

    const components = [];

    if (reason) {
        components.push(
            new TextDisplayBuilder().setContent("## ⏰ You've been timed out from **Kristal** for the following reason:"),
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
            new TextDisplayBuilder().setContent("## ⏰ You've been timed out from **Kristal**."),
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
                    new TextDisplayBuilder().setContent(`-# 🔗 [Jump to message](${selectedMessage.url}) | <t:${Math.floor(selectedMessage.createdTimestamp / 1000)}>`)
                    ),
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
        );
    }

    components.push(
        new TextDisplayBuilder().setContent("-# Your timeout will expire <t:" + Math.floor((Date.now() + time) / 1000) + ":R>. Please review the rules if necessary, and if you feel the timeout was undeserved, message a moderator."),
    );
    return components;
}
