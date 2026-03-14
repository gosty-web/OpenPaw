# Frequently Asked Questions (FAQ)

## 1. Do I need an internet connection to run OpenPaw?

For the core engine and local dashboard, **no**, you do not need internet if you choose an local LLM via a provider like Ollama. However, if you are using hosted LLM providers (Anthropic, OpenAI, Groq), or features like Web Search and Channel bots, you will obviously require an internet connection to route API requests.

## 2. Is my data sent anywhere?

**Absolutely Not.** Unlike most SaaS alternatives, all agent configurations, chat histories (memories), and files reside securely within your computer's `~/.openpaw` directory. 
Only the necessary contextual snippets (prompts) are sent out to external providers for LLM completions.

## 3. Why did OpenPaw forget my conversation?

While an agent reads its previous messages via semantic compression memory, each active "Chat Session" is isolated to prevent cross-contamination. Ensure the agent has sufficient tokens set, or explicitly teach it long-term facts by updating its files or using MCP/skill capabilities. As the chat runs longer, older messages get summarized into `DYNAMIC_CONTEXT.md` naturally, but they are not dropped entirely.

## 4. Where is my `opk_` token generated?

If you lose or forget your token, or skipped the installer, simply open terminal and type:
```bash
openpaw token
```
This local CLI command accesses your system settings and prints out your token explicitly over a secure terminal instance.

## 5. Can I use multiple models per agent?

Currently, each agent has **one** default model configured (e.g. `claude-3-5-sonnet`). OpenPaw is modular enough that an orchestrator agent can span sub-agents to specific models or logic pathways.

## 6. How do I delete an agent or clear the database?

You can delete individuals via the web UI. If you want to wipe the local database (maybe for a fresh reinstall), use the nuclear CLI option:
```bash
openpaw reset
```
You will be asked to confirm. This forcefully unlinks the databases and clears the `.openpaw` hidden folder completely.

## 7. Is there a mobile app?
OpenPaw is fully responsive. Simply connect to your server remotely via a desktop or mobile browser. Better yet, hook an Agent to a Telegram or Slack Channel, and access your personal AI directly from your phone's native chat apps!
