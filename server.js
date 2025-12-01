// server.js
const express = require("express");
const { Client, GatewayIntentBits } = require("discord.js");

const DISCORD_TOKEN = "YOUR_DISCORD_BOT_TOKEN";
const DISCORD_TARGET_CHANNEL_ID = "DISCORD_CHANNEL_ID_TO_POST_AGENT_REPLIES";

const app = express();
app.use(express.json());

// --- Discord client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
});

// This is the endpoint you will put in "Destination Webhook URL"
app.post("/respond-message", async (req, res) => {
  try {
    // Basic auth check if you want – Respond.io will send Authorization: Bearer <API_TOKEN>
    const bearer = req.headers.authorization || "";
    const token = bearer.startsWith("Bearer ") ? bearer.slice(7) : null;
    const EXPECTED_TOKEN = "YOUR_RESPOND_API_TOKEN"; // you'll fill this later

    if (!token || token !== EXPECTED_TOKEN) {
      return res.status(401).send("Unauthorized");
    }

    const { channelId, contactId, message } = req.body; // structure from docs

    const ch = await client.channels.fetch(DISCORD_TARGET_CHANNEL_ID);

    const text =
      message?.text ||
      `[non-text message from respond.io]\n${JSON.stringify(message)}`;

    await ch.send(`**From respond.io contact ${contactId}:** ${text}`);

    // Respond.io expects 200 + mId in body
    return res.status(200).json({ mId: Date.now().toString() });
  } catch (err) {
    console.error("Error handling /respond-message:", err);
    return res.status(500).send("Error");
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
  client.login(DISCORD_TOKEN);
});
