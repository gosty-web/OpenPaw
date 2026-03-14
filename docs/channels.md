# Channels

Channels in OpenPaw allow your agents to break out of the web dashboard and interact with users directly in their favorite messaging applications.

OpenPaw currently has generalized support for the following messaging platforms:
- **Telegram**
- **Discord**
- **Slack**
- **WhatsApp**

## Connecting a Channel

When connecting an agent to a channel, the backend listens for incoming events on these platforms and treats them exactly like web chat interactions, passing context back and forth seamlessly.

### Telegram
1. Open your Telegram app and search for `@BotFather`.
2. Send `/newbot`, choose a name, and choose a unique username.
3. BotFather will provide an **HTTP API Token** (e.g., `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`).
4. In OpenPaw, navigate to **Channels** > **Add Channel**.
5. Select **Telegram** and paste your Bot Token.
6. The agent will immediately boot up and begin listening to messages sent directly to it or in group chats where it’s added.

### Discord
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a "New Application". Navigate to the "Bot" tab and add a bot.
3. Reset and copy the **Token**.
4. In OpenPaw, navigate to **Channels** > **Add Channel**.
5. Select **Discord** and paste your token.
6. In Discord's OAuth2 tab, generate an invite URL with bot permissions and add the bot to your server.

### Slack
1. Go to [api.slack.com/apps](https://api.slack.com/apps) and "Create New App".
2. You will need the **Bot User OAuth Token** (starts with `xoxb-`) and the **Signing Secret** or **App-Level Token** depending on if you are using Socket Mode (recommended) or Webhooks.
3. Configure these values in OpenPaw's Slack Channel settings.
4. Invite the bot to your desired Slack channels using `@bot_name`.

### WhatsApp
1. OpenPaw connects to WhatsApp via a localized headless browser or cloud API wrapper (via Baileys/WWeb.js).
2. Go to **Add Channel**, select **WhatsApp**.
3. The platform will dynamically generate a **QR Code**.
4. Open WhatsApp on your phone, go to Linked Devices -> Link a Device.
5. Scan the QR code. Your agent will now hijack the session to answer messages on your behalf or as a designated business number.

## Agent Assignment

A channel can be connected to exactly **one Agent** or to an **Orchestrator Agent** that routes requests to smaller sub-agents. Assigning multiple channels to one agent allows it to maintain cohesive identity and memory across platforms.

> **Note:** OpenPaw includes robust message filtering options like `Whitelist Users` or `Specific Channel IDs` to ensure your bot doesn't spam large servers or respond to unauthorized individuals.
