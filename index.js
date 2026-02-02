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
    .setName("guide")
    .setDescription("Display guide for Vanish")
    .toJSON(),
  
  new SlashCommandBuilder()
    .setName("loader")
    .setDescription("Enter your license key to download the loader")
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

  // Guide Command
  if (interaction.isChatInputCommand() && interaction.commandName === "guide") {
     const guideEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle("📘 Vanish Guide")
      .setDescription("Welcome to the Vanish guide. Follow the steps below to get started safely and correctly.")
      .addFields(
        {
          name: "🔹 Step 1 — Download Loader",
          value: "Use `/loader` and enter your license key when prompted to download the loader.",
        },
        {
          name: "🔹 Step 2 — Disable Antivirus",
          value: "Disable Windows Defender or any antivirus to avoid the loader being deleted.",
        },
        {
          name: "🔹 Step 3 — Disable Hardware Acceleration",
          value: "Disable hardware acceleration",
        },
        {
          name: "🔹 Step 4 — Enable Discord/Nvida Overlay",
          value: "You can chose which one you want to use, nvidia is **only** for nvidia gpus. The cheat itself first checks for nvidia overlay.",
        },
        {
          name: "🔹 Step 5 — Run Loader As Admin",
          value: "Always run loader as **Admin** to avoid errors.",
        },
        {
          name: "🔹 Step 6 — Settings",
          value: "Make sure Fortnite is running in **Fullscreen Windowed** mode! Menu key by default is Right Shift.",
        },
        {
          name: "⚠️ Important",
          value: "Do **not** share your license key. Keep it private.",
        }
      )
      .setFooter({ text: "Vanish • Official Guide" });
  
    await interaction.reply({
      embeds: [guideEmbed],
      ephemeral: true
    });
  }

  // loader command
   if (interaction.isChatInputCommand() && interaction.commandName === "loader") {
     const modal = new ModalBuilder()
      .setCustomId("licenseModal")
      .setTitle("Enter Your License Key");
  
    const licenseInput = new TextInputBuilder()
      .setCustomId("licenseKey")
      .setLabel("License Key")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);
  
    modal.addComponents(
      new ActionRowBuilder().addComponents(licenseInput)
    );
  
    await interaction.showModal(modal);
  }
  
  // License modal submit
  if (interaction.isModalSubmit() && interaction.customId === "licenseModal") {
  
    const key = interaction.fields.getTextInputValue("licenseKey");
  
    try {
      // Init KeyAuth
      const initUrl = `https://keyauth.win/api/1.3/?type=init&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}`;
      const initRes = await fetch(initUrl);
      const initData = await initRes.json();
  
      if (!initData.success) {
        return interaction.reply({
          content: "Failed to initialize auth session.",
          ephemeral: true
        });
      }
  
      const sessionid = initData.sessionid;
  
      // License check
      const licenseUrl = `https://keyauth.win/api/1.3/?type=license&key=${key}&sessionid=${sessionid}&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}`;
      const licenseRes = await fetch(licenseUrl);
      const licenseData = await licenseRes.json();
  
      if (!licenseData.success) {
        return interaction.reply({
          content: "Invalid key. Please try again.",
          ephemeral: true
        });
      }
  
      // Send DM with loader
      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle("Key Valid ✅")
        .setThumbnail("https://raw.githubusercontent.com/panek033/VanishVouches/main/vh.png")
        .addFields(
          { name: "🔑 License Key", value: `\`${key}\`` },
          { name: "🔗 Loader Download", value: `[Click here](${process.env.YOUR_LINK})` },
          { name: "🔗 Required .dll", value: `[Click here](${process.env.YOUR_LINK2})` }
        )
        .setFooter({ text: "Vanish | Auth Verification" })
        .setTimestamp();
  
      const dm = await interaction.user.createDM();
      await dm.send({ embeds: [embed] });
  
      await interaction.reply({
        content: "Key valid. Check your DMs!",
        ephemeral: true
      });
  
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "Error checking your key — try again later.",
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
