# Skills

Skills are an incredibly powerful feature in OpenPaw that extends agents' internal capabilities without writing complex MCP servers or dealing with the entire system architecture. Instead, Skills allow you to inject raw javascript functionality as a simple file that an agent can invoke dynamically.

You can map any complex operation directly to an easy-to-use API that the large language model understands.

## Overview

A Skill in OpenPaw is conceptually a JavaScript module (or a JSON definition for remote calls) that the local LLM can use as a "function call". When an Agent needs to do something beyond chatting, like scraping a specific API, calling a smart contract, or executing local PowerShell scripts, it can invoke a Skill.

## Creating a Skill

In the **Skills** tab of the dashboard:
1. Click **Create Skill**.
2. Give it a descriptive name (e.g., `github_repo_analyzer`).
3. Add a detailed description. *The better the description, the easier the LLM understands when to use it.*
4. Write your Custom JavaScript function in the code editor. Examples:
   ```javascript
   function analyzeDependencies(repoUrl) {
       // Your logic to clone, scan, and return JSON structure
       return fetch('https://api.github.com/repos/' + repoUrl).then(r => r.json());
   }
   ```
5. Click **Save Skill**.

## Importing Skills

OpenPaw enables the community to share capabilities. If someone builds an incredible code auditor skill on GitHub:
1. Navigate to **Import Skill**.
2. Paste the URL (e.g., a GitHub raw URL, Gist, or specialized OpenPaw registry URL).
3. The platform validates the JavaScript for security purposes.
4. If approved, the Skill is saved and ready for attachment.

## Assigning to Agents

Just like MCPs, Skills must be assigned to an agent to be used.
1. Open the **Agent Profile**.
2. Click **Skills** -> **Add Skill**.
3. Enable the skill switch.
4. When the agent acts natively or via a Cron job, its context will mention: `You have access to the function analyzeDependencies(repoUrl)`.

*Because skills are arbitrary JavaScript, use caution when writing or importing untrusted scripts. As a local-first platform, your scripts run with the privileges of the Node.js process hosting the OpenPaw backend.*
