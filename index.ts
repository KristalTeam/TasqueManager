import fs from 'node:fs';
import path from 'node:path';
import { ButtonStyle, ChannelType, Client, Collection, ComponentType, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { pathToFileURL, fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { CronJob } from 'cron';
import { eq } from 'drizzle-orm';
import { userRoles } from './db/schema';
import database from './database';

dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    // ESM dynamic import
	const fileUrl = pathToFileURL(filePath).href;
	const commandModule = await import(fileUrl);
    const command = commandModule.default;

    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }

    if ("init" in command) {
      command.init(client);
    }
  }
}

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, async readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);

	// local func
	const checkRoles = async () => {
		const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID);
		if (!guild) return;

		// query the database for all users with boost roles

		const userRoleList = await database.select().from(userRoles);

		for (const userRole of userRoleList) {
			const member = await guild.members.fetch(userRole.user_id.toString()).catch(() => null);

			if (!member) {
				console.log(`User ID ${userRole.user_id} not found in guild.`);
				// User not found in guild, also delete their role from the database
				const existingRole = await guild.roles.fetch(userRole.role_id.toString()).catch(() => null);
				if (existingRole)
				{
					try {
						console.log(`Deleting role ${existingRole.name} for missing user ID ${userRole.user_id}`);
						await existingRole.delete(`User not found in guild; cleaning up boost role.`);
					}
					catch (error) {
						console.log(`Failed to delete role for missing user ID ${userRole.user_id}: ${error}`);
					}
				}
				await database.delete(userRoles).where(eq(userRoles.user_id, userRole.user_id));
				continue;
			}

			const boostRole = member.roles.cache.find(role => role.tags?.premiumSubscriberRole)
			if (!boostRole)
			{
				console.log(`User ${member.user.tag} is no longer boosting.`);
				// They don't have the boost role, so delete their role if it exists
				const existingRole = await guild.roles.fetch(userRole.role_id.toString()).catch(() => null);
				if (existingRole)
				{
					try {
						console.log(`Deleting role ${existingRole.name} for user ${member.user.tag}`);
						await existingRole.delete(`User ${member.user.tag} is no longer boosting the server.`);
						await database.delete(userRoles).where(eq(userRoles.user_id, userRole.user_id));
					} catch (error) {
						console.log(`Failed to delete role for user ${member.user.tag}: ${error}`);
					}
				}
			}
		}
	}

	let scheduledMessage = new CronJob('00 00 14 * * *', async () => {
		// This runs every day at hour 14 (2 PM)
		await checkRoles();
	});

	scheduledMessage.start();

	await checkRoles();

	// TODO: Split this out, probably make it a different script instead of doing it here?
	// Doesn't actually rely on any bot state I'm pretty sure

	const sendFeatureRequestHeader = process.env.SEND_FEATURE_REQUESTS_HEADER === 'true';
	const sendBugReportHeader = process.env.SEND_BUG_REPORTS_HEADER === 'true';

	if (sendFeatureRequestHeader || sendBugReportHeader) {
		// FIRST: fetch server
		const guild = await readyClient.guilds.fetch(process.env.DISCORD_GUILD_ID);
		// THEN: fetch forum channels
		const bugForum = await guild.channels.fetch(process.env.FORUM_BUG_REPORTS);
		const featureForum = await guild.channels.fetch(process.env.FORUM_FEATURE_REQUESTS);

		// NOW: send header messages
		if (sendFeatureRequestHeader && bugForum && bugForum.type === ChannelType.GuildForum) {
			const thread = await bugForum.threads.create({
				name: "Submitting a bug report?",
				message: {
					content: `
# Before you report a bug...

## Please ensure that your issue happens:
- on the latest commit of Kristal
- reproducibly, not just once
- due to the engine itself and NOT due to a mod or library
## If your issue is an accuracy issue to DELTARUNE, please:
- explain what the issue is
- provide screenshots or video evidence
- if possible, go into technical detail
## If your issue is a crash, please:
- provide a screenshot of the crash
- provide steps to reproduce the crash (e.g. code snippets, actions taken)


Additionally, try not to submit duplicate reports; please search the existing open bug reports before submitting a new one.

__Failure to follow these steps will result in your bug report being **closed as invalid**, and your access **may be restricted**.__

To gain access to the bug reports forum, please click the button below to acknowledge you have read and understood the above instructions.`,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									custom_id: "bug_reports_allow",
									label: "I understand",
									style: ButtonStyle.Primary,
									emoji: { name: "✅" }
								},
							]
						}
					]
				}
			})

			// pin
			try
			{
				await thread.pin();
			}
			catch (error)
			{
				console.warn("Failed to pin bug report header thread (something already pinned?)");
			}
		}

		if (sendBugReportHeader && featureForum && featureForum.type === ChannelType.GuildForum) {
			const thread = await featureForum.threads.create({
				name: "Submitting a feature request?",
				message: {
					content: `
# Before you submit a feature request...

## Please ensure that your request is:
- not already implemented in Kristal
- not already requested (search existing feature requests)
- for the engine itself (e.g., not for a mod, library, or the website)
- not a "chapter gimmick" (e.g., Tenna's boards, Cyber City mouse puzzles)
- something that **fits as a part of the base engine**, and is not overly specific or niche

Additionally, please do not delete your feature requests if they're declined.

__Failure to follow these steps will result in your feature request being **closed as invalid**, and your access **may be restricted**.__

To gain access to the feature requests forum, please click the button below to acknowledge you have read and understood the above instructions.`,
					components: [
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									custom_id: "feature_requests_allow",
									label: "I understand",
									style: ButtonStyle.Primary,
									emoji: { name: "✅" }
								}
							]
						}
					]
				}
			})

			// pin
			try
			{
				await thread.pin();
			}
			catch (error)
			{
				console.warn("Failed to pin feature request header thread (something already pinned?)");
			}
		}
	}
});

client.on(Events.ThreadCreate, async thread => {
	if (thread.parentId === process.env.FORUM_BUG_REPORTS) {
		// Add the tag
		await thread.setAppliedTags([process.env.TAG_NEEDS_TRIAGE_BUG_REPORTS]);
	}
	else if (thread.parentId === process.env.FORUM_FEATURE_REQUESTS) {
		// Add the tag
		await thread.setAppliedTags([process.env.TAG_NEEDS_TRIAGE_FEATURE_REQUESTS]);
	}
});

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isButton())
	{
		if (interaction.customId === 'bug_reports_allow') {
			if (!interaction.member || !interaction.member.roles)
			{
				await interaction.reply({ content: '❌ Unable to assign role. Please contact a moderator.', flags: MessageFlags.Ephemeral });
				return;
			}

			if (interaction.member.roles.cache.has(process.env.ROLE_BUG_REPORTS)) {
				await interaction.reply({ content: '✅ You already have access to the forum!', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.member.roles.add(process.env.ROLE_BUG_REPORTS);
			await interaction.reply({ content: '✅ You have been given access to the forum!', flags: MessageFlags.Ephemeral });
		}
		else if (interaction.customId === 'feature_requests_allow') {
			if (!interaction.member || !interaction.member.roles)
			{
				await interaction.reply({ content: '❌ Unable to assign role. Please contact a moderator.', flags: MessageFlags.Ephemeral });
				return;
			}
			if (interaction.member.roles.cache.has(process.env.ROLE_FEATURE_REQUESTS)) {
				await interaction.reply({ content: '✅ You already have access to the forum!', flags: MessageFlags.Ephemeral });
				return;
			}
			await interaction.member.roles.add(process.env.ROLE_FEATURE_REQUESTS);
			await interaction.reply({ content: '✅ You have been given access to the forum!', flags: MessageFlags.Ephemeral });
		}
		else
		{
			// we dont have any button stuff for now (other than what gets handled by the library)
		}
	}
	else if (interaction.isModalSubmit())
	{
		// go through all commands and see if they have "modal_handlers"
		for (const command of interaction.client.commands.values())
		{
			if ("modal_handlers" in command)
			{
				if (interaction.customId in command.modal_handlers)
				{
					try {
						await command.modal_handlers[interaction.customId](interaction);
					} catch (error) {
						console.error(error);
						if (interaction.replied || interaction.deferred) {
							await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
						} else {
							await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
						}
					}
					break;
				}
			}
			if ("onModalSubmit" in command)
			{
				try {
					if (await command.onModalSubmit(interaction.customId, interaction))
						break;
				} catch (error) {
					console.error(error);
					if (interaction.replied || interaction.deferred) {
						await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
					} else {
						await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
					}
				}
			}
		}
	}
	else if (interaction.isChatInputCommand())
	{
		// Handle command interactions
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			}
		}
	}
	else if (interaction.isAutocomplete())
	{
		// Handle autocomplete interactions
		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}
	else if (interaction.isContextMenuCommand())
	{
		// Handle context menu interactions
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
			}
		}
	}
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
