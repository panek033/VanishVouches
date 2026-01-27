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
  Routes,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");

const express = require("express");
const app = express();
const crypto = require('crypto');

// keep-alive server
app.get("/", (req, res) => res.send("Bot alive"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
  partials: ['CHANNEL'],
});

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Generate hash for init request
function generateHash(data, secret) {
    return crypto.createHash('sha256')
        .update(data + secret)
        .digest('hex');
}

// ⭐ star helper
function stars(count) {
  const c = Math.max(1, Math.min(5, parseInt(count)));
  return "⭐".repeat(c);
}

// REGISTER SLASH COMMAND
const commands = [
  new SlashCommandBuilder()
    .setName("vouch")
    .setDescription("Submit an anonymous vouch")
    .toJSON(),
  
  new SlashCommandBuilder()
    .setName("loader")
    .setDescription("Download loader")
    .addStringOption(option =>
      option
        .setName("license")
        .setDescription("Your license key")
        .setRequired(true)
    )
    .toJSON(),
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(
        process.env.CLIENT_ID,
        process.env.GUILD_ID
      ),
      { body: commands }
    );
    console.log("Slash commands registered");
  } catch (err) {
    console.error(err);
  }
})();

client.on("interactionCreate", async (interaction) => {

  // /vouch command → product dropdown
  if (interaction.isChatInputCommand() && interaction.commandName === "vouch") {

    const select = new StringSelectMenuBuilder()
      .setCustomId("vouchProduct")
      .setPlaceholder("Select product")
      .addOptions([
        { label: "Eon Cheat", value: "Eon Cheat" },
        { label: "Eon Account", value: "Eon Account" },
        { label: "Discord Account", value: "Discord Account" },
        { label: "Spoofer", value: "Spoofer" }
      ]);

    const row = new ActionRowBuilder().addComponents(select);

    await interaction.reply({
      content: "Choose the product you want to vouch for:",
      components: [row],
      ephemeral: true
    });
  }

  // loader command
   if (interaction.isChatInputCommand() && interaction.commandName === "loader") {
    const key = interaction.options.getString("license");
  
    try {
      // 1) Init KeyAuth session
      const initDataToHash = `${process.env.KEYAUTH_APP}${process.env.KEYAUTH_OWNERID}`;
      const initHash = generateHash(initDataToHash, process.env.KEYAUTH_SECRET);

      const initUrl = `https://keyauth.win/api/1.3/?type=init&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}&hash=${process.env.HASH}`;
      //const initUrl = `https://keyauth.win/api/1.3/?type=init&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}`;
      const initRes = await fetch(initUrl);
      const initData = await initRes.json();

      if (!initData.success) {
            return interaction.reply({
                content: `Failed to initialize auth session. Error: ${initData.message || 'Unknown error'}`,
                ephemeral: true
            });
        }
  
      // 2) License check
      const sessionid = initData.sessionid;
      const licenseUrl = `https://keyauth.win/api/1.3/?type=license&key=${key}&sessionid=${sessionid}&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}`;
  
      const licenseRes = await fetch(licenseUrl);
      const licenseData = await licenseRes.json();
  
      if (licenseData.success) {
  
        // Create DM embed
        const embed = new EmbedBuilder()
          .setColor(0x2f3136)
          .setTitle("Key Valid")
          .setThumbnail("https://raw.githubusercontent.com/panek033/VanishVouches/main/vh.png")
          .addFields(
            { name: "🔑 License Key", value: `\`${key}\``, inline: false },
            {
              name: "🔗 Download",
              value: `[Click here](${process.env.YOUR_LINK})`,
              inline: false
            }
          )
          .setFooter({ text: "Vanish | Auth Verification" })
          .setTimestamp();
  
        // DM user
        const dm = await interaction.user.createDM();
        await dm.send({ embeds: [embed] });
  
        await interaction.reply({
          content: "Key is valid. Check your DMs!",
          ephemeral: true
        });
  
      } else {
        await interaction.reply({
          content: "Invalid key. Please try again.",
          ephemeral: true
        });
      }
  
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "Error checking your key — please try again later.",
        ephemeral: true
      });
    }
  }

  // Product selected → show modal
  if (interaction.isStringSelectMenu() && interaction.customId === "vouchProduct") {

    const product = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId(`vouchModal:${product}`)
      .setTitle("Vanish Vouch");

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

  // Modal submit → send embed
  if (interaction.isModalSubmit() && interaction.customId.startsWith("vouchModal:")) {

    const product = interaction.customId.split(":")[1];
    const rating = interaction.fields.getTextInputValue("rating");
    const desc = interaction.fields.getTextInputValue("desc");

    await interaction.reply({
      content: "Your anonymous vouch was submitted ✅",
      ephemeral: true
    });

    try {
      const channel = await interaction.guild.channels.fetch(process.env.VOUCH_CHANNEL);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle("Vanish Vouch")
        .setThumbnail("https://raw.githubusercontent.com/panek033/VanishVouches/main/vh.png")
        .addFields(
          { name: "📦 Product", value: product, inline: true },
          { name: "Rating", value: stars(rating), inline: true },
          { name: "📝 Description", value: desc, inline: false }
        )
        .setFooter({ text: "Anonymous customer feedback" })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

    } catch (err) {
      console.error("Failed to send vouch:", err);
    }
  }
});

client.login(process.env.TOKEN);
