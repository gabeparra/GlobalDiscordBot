// server.js
require("dotenv").config(); // <-- loads .env

const express = require("express");
const axios = require("axios");
const { Client, GatewayIntentBits } = require("discord.js");

const {
  TOKEN,
  RESPOND_WEBHOOK_URL,
  RESPOND_CHANNEL_ID,
  RESPOND_API_TOKEN,
  FORWARD_CHANNEL_ID,
  DISCORD_REPLY_CHANNEL_ID,
  RESPOND_OUTBOUND_TOKEN,
  PORT
} = process.env;

// --- Discord client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => {
  console.log(`Discord bot online as ${client.user.tag}`);
});

// --- Discord -> Respond.io: forward messages from FORWARD_CHANNEL_ID ---
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!FORWARD_CHANNEL_ID || message.channel.id !== FORWARD_CHANNEL_ID) return;

  try {
    await axios.post(
      RESPOND_WEBHOOK_URL,
      {
        channelId: RESPOND_CHANNEL_ID,
        contactId: `discord-${message.author.id}`, // Custom ID
        events: [
          {
            type: "message",
            mId: message.id,
            timestamp: Date.now(),
            message: {
              type: "text",
              text: message.content,
            },
          },
        ],
        contact: {
          firstName: message.author.username,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESPOND_API_TOKEN}`,
        },
      }
    );

    console.log("Forwarded message from Discord to Respond.io");
  } catch (err) {
    console.error(
      "Error forwarding to Respond.io:",
      err.response?.data || err.message
    );
  }
});

// --- Express server: Respond.io -> Discord (outgoing webhook) ---
const app = express();
app.use(express.json());

app.post("/respond-message", async (req, res) => {
  try {
    // Simple auth with bearer token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!RESPOND_OUTBOUND_TOKEN || token !== RESPOND_OUTBOUND_TOKEN) {
      return res.status(401).send("Unauthorized");
    }

    // Adjust these fields based on the exact payload Respond.io sends you
    const { contactId, message } = req.body;

    if (!DISCORD_REPLY_CHANNEL_ID) {
      console.warn("DISCORD_REPLY_CHANNEL_ID not set");
      return res.status(500).send("No reply channel configured");
    }

    const channel = await client.channels.fetch(DISCORD_REPLY_CHANNEL_ID);

    const text =
      message?.text ||
      `[non-text message from respond.io]\n${JSON.stringify(message)}`;

    await channel.send(`**Reply for ${contactId}:** ${text}`);

    // Respond.io usually expects mId in response, can be any unique string
    return res.status(200).json({ mId: Date.now().toString() });
  } catch (err) {
    console.error("Error in /respond-message:", err);
    return res.status(500).send("Error");
  }
});

const port = PORT || 3000;
app.listen(port, () => {
  console.log(`HTTP server listening on port ${port}`);
  client.login(TOKEN); // <-- uses .env TOKEN
});
