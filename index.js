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
    .setDescription("Enter your login info to download the loader")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register in vanish")
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
      .setTitle("Vanish Guide")
      .setDescription("[Youtube Video Tutorial](https://youtu.be/db0tEYnaXVQ)")
      .addFields(
        {
          name: "🔹 Step 1 — Register",
          value: "Use `/register` to create an account for you in vanish, using your license.",
        },
        {
          name: "🔹 Step 2 — Download Loader",
          value: "Use `/loader` enter your username and password to get download link.",
        },
        {
          name: "🔹 Step 3 — Disable Antivirus",
          value: "Disable Windows Defender or any antivirus to avoid the loader being deleted.",
        },
        {
          name: "🔹 Step 4 — Enable Discord Overlay",
          value: "Use new version, not legacy. Later in-game makse sure it shows up.",
        },
        {
          name: "🔹 Step 5 — Run Loader As Admin",
          value: "Always run loader as **Admin** to avoid errors.",
        },
        {
          name: "🔹 Step 6 — Register In Loader",
          value: "Under Login button there is a text 'Dont have an account?' press it and you will be on register page.",
        },
        {
          name: "🔹 Step 7 — Settings",
          value: "Make sure Fortnite is running on **Performance Mode & Fullscreen Windowed** mode! Menu key by default is Right Shift.",
        },
        {
          name: "⚠️ Important",
          value: "Do **not** share your login info, doing so will lead to a ban. Keep it private.",
        }
      )
      .setFooter({ text: "Vanish • Official Guide" });
  
    await interaction.reply({
      embeds: [guideEmbed],
      ephemeral: true
    });
  }

      // /register command
    if (interaction.isChatInputCommand() && interaction.commandName === "register") {
    
      const modal = new ModalBuilder()
        .setCustomId("registerModal")
        .setTitle("Vanish Register");
    
      const userInput = new TextInputBuilder()
        .setCustomId("reg_username")
        .setLabel("Username")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      const passInput = new TextInputBuilder()
        .setCustomId("reg_password")
        .setLabel("Password")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      const licenseInput = new TextInputBuilder()
        .setCustomId("reg_license")
        .setLabel("License Key")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
    
      modal.addComponents(
        new ActionRowBuilder().addComponents(userInput),
        new ActionRowBuilder().addComponents(passInput),
        new ActionRowBuilder().addComponents(licenseInput)
      );
    
      await interaction.showModal(modal);
    }

    // Register modal submit
    if (interaction.isModalSubmit() && interaction.customId === "registerModal") {
    
      const username = interaction.fields.getTextInputValue("reg_username");
      const password = interaction.fields.getTextInputValue("reg_password");
      const license = interaction.fields.getTextInputValue("reg_license");
    
      try {
    
        // ---------------- INIT ----------------
        const initUrl = `https://keyauth.win/api/1.3/?type=init&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}&hash=${process.env.HASH}`;
        const initRes = await fetch(initUrl);
        const initData = await initRes.json();
    
        if (!initData.success) {
          console.log(initData);
          return interaction.reply({
            content: "Auth init failed.",
            ephemeral: true
          });
        }
    
        const sessionid = initData.sessionid;
    
        // ---------------- REGISTER ----------------
        const registerUrl = `https://keyauth.win/api/1.3/?type=register&username=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}&key=${encodeURIComponent(license)}&sessionid=${sessionid}&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}`;
    
        const registerRes = await fetch(registerUrl);
        const registerData = await registerRes.json();
    
        if (!registerData.success) {
          console.log(registerData);
          return interaction.reply({
            content: `Register failed: ${registerData.message}`,
            ephemeral: true
          });
        }
    
        // ---------------- SUCCESS ----------------
        const embed = new EmbedBuilder()
          .setColor(0x2f3136)
          .setTitle("Registration Successful")
          .setThumbnail("https://raw.githubusercontent.com/panek033/VanishVouches/main/vh.png")
          .addFields(
            { name: "👤 Username", value: `\`${username}\``, inline: true },
            { name: "🔑 Password", value: `||${password}||`, inline: true },
            { name: "\u200B", value: "\u200B" }, // optional spacer
            { name: "📦 Status", value: "Account created successfully.", inline: false }
          )
          .setFooter({ text: "Vanish Discord Bot" })
          .setTimestamp();
    
        const dm = await interaction.user.createDM();
        await dm.send({ embeds: [embed] });
    
        await interaction.reply({
          content: "Account created. Check your DMs!",
          ephemeral: true
        });
    
      } catch (err) {
        console.error("Register error:", err);
        await interaction.reply({
          content: "Auth register error, try again later.",
          ephemeral: true
        });
      }
}



  // loader command
   if (interaction.isChatInputCommand() && interaction.commandName === "loader") {
     const modal = new ModalBuilder()
      .setCustomId("licenseModal")
      .setTitle("Loader Download");
  
    const userInput = new TextInputBuilder()
      .setCustomId("username")
      .setLabel("Username")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const passInput = new TextInputBuilder()
      .setCustomId("password")
      .setLabel("Password")
      .setStyle(TextInputStyle.Short) // use Paragraph if you want hidden typing workaround
      .setRequired(true);
  
    modal.addComponents(
      new ActionRowBuilder().addComponents(userInput),
      new ActionRowBuilder().addComponents(passInput)
    );
  
    await interaction.showModal(modal);
  }
  
    // License modal submit
   if (interaction.isModalSubmit() && interaction.customId === "licenseModal") {
  
    const username = interaction.fields.getTextInputValue("username");
    const password = interaction.fields.getTextInputValue("password");
  
    try {
  
      // ---------------- INIT ----------------
      const initUrl = `https://keyauth.win/api/1.3/?type=init&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}&hash=${process.env.HASH}`;
  
      const initRes = await fetch(initUrl);
      const initData = await initRes.json();
  
      if (!initData.success) {
        console.log(initData);
        return interaction.reply({
          content: "Auth init failed.",
          ephemeral: true
        });
      }
  
      const sessionid = initData.sessionid;
  
      // Required handshake hash
      const hash = crypto
        .createHash("sha256")
        .update(process.env.KEYAUTH_SECRET)
        .digest("hex");
  
      // ---------------- LOGIN ----------------
      const loginUrl = `https://keyauth.win/api/1.3/?type=login&username=${encodeURIComponent(username)}&pass=${encodeURIComponent(password)}&sessionid=${sessionid}&name=${process.env.KEYAUTH_APP}&ownerid=${process.env.KEYAUTH_OWNERID}`;
  
      const loginRes = await fetch(loginUrl);
      const loginData = await loginRes.json();
  
      if (!loginData.success) {
        console.log(loginData);
        return interaction.reply({
          content: "Invalid username or password.",
          ephemeral: true
        });
      }
  
      // Send DM with loader
      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setTitle("Loader Download")
        .setThumbnail("https://raw.githubusercontent.com/panek033/VanishVouches/main/vh.png")
        .addFields(
            { name: "👤 Username", value: `\`${username}\``, inline: true },
            { name: "🔑 Password", value: `||${password}||`, inline: true },
            { name: "\u200B", value: "\u200B" }, // optional spacer
            { name: "🔗 Loader Download", value: `[Click here](${process.env.YOUR_LINK})`, inline: false }
        )
        .setFooter({ text: "Vanish Discord Bot" })
        .setTimestamp();
  
      const dm = await interaction.user.createDM();
      await dm.send({ embeds: [embed] });
  
      await interaction.reply({
        content: "Login Succesfull. Check your DMs!",
        ephemeral: true
      });
  
    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "Auth handshake error, try again later.",
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
