import fs from 'node:fs';
import path from 'node:path';
import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { pathToFileURL, fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

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
	if (interaction.isModalSubmit())
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
