require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  REST,
  Routes
} = require("discord.js");

const express = require("express");
const app = express();

// keep-alive server
app.get("/", (req, res) => res.send("Bot alive"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// REGISTER SLASH COMMAND
const commands = [
  new SlashCommandBuilder()
    .setName("vouch")
    .setDescription("Submit an anonymous vouch")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash command...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Slash command registered");
  } catch (err) {
    console.error(err);
  }
})();

client.on("interactionCreate", async (interaction) => {

  if (interaction.isChatInputCommand() && interaction.commandName === "vouch") {

    const modal = new ModalBuilder()
      .setCustomId("vouchModal")
      .setTitle("Anonymous Vouch");

    const rating = new TextInputBuilder()
      .setCustomId("rating")
      .setLabel("Rating (1–5)")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const desc = new TextInputBuilder()
      .setCustomId("desc")
      .setLabel("Description")
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(rating),
      new ActionRowBuilder().addComponents(desc)
    );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "vouchModal") {

    const rating = interaction.fields.getTextInputValue("rating");
    const desc = interaction.fields.getTextInputValue("desc");

    const channel = interaction.guild.channels.cache.get(process.env.CHANNEL_ID);

    await channel.send(
      `⭐ **Rating:** ${rating}\n📝 **Vouch:** ${desc}`
    );

    await interaction.reply({
      content: "Your anonymous vouch was submitted ✅",
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
