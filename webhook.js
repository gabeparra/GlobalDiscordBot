require("dotenv").config();
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(express.json());

// Discord client (same as your bot.js)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ENV vars
const TOKEN = process.env.token;
const DISCORD_REPLY_CHANNEL_ID = process.env.DISCORD_REPLY_CHANNEL_ID; 
const RESPOND_OUTBOUND_TOKEN = process.env.RESPOND_OUTBOUND_TOKEN; // simple auth

client.once("ready", () => {
  console.log(`Bot is online as ${client.user.tag}`);
});

// Respond.io → Discord
app.post("/respond-message", async (req, res) => {
  try {
    // Basic security: Respond.io will send a Bearer token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!RESPOND_OUTBOUND_TOKEN || token !== RESPOND_OUTBOUND_TOKEN) {
      return res.status(401).send("Unauthorized");
    }

    const { contactId, message } = req.body;

    const channel = await client.channels.fetch(DISCORD_REPLY_CHANNEL_ID);

    const text =
      message?.text ||
      `[non-text message received from Respond.io]\n${JSON.stringify(message)}`;

    await channel.send(`**Respond.io Reply → Contact ${contactId}:**\n${text}`);

    // Respond.io requires an mId in response
    return res.status(200).json({ mId: Date.now().toString() });
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(500).send("Error");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Webhook server running on port", PORT);
  client.login(TOKEN);
});
