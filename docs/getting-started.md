# Getting Started

Welcome to OpenPaw! In this guide, you will learn how to install the OpenPaw platform on your local machine, run through the CLI onboarding experience, and create your very first intelligent agent.

## Prerequisites

Before installing OpenPaw, ensure you have the following installed on your machine:
- **Node.js**: Version 20.x or higher. You can download it from [nodejs.org](https://nodejs.org/).
- **Git**: For cloning the repository.
- **API Keys**: Make sure you have API keys for LLM providers (e.g., Anthropic, OpenAI, or Groq) if you want the agents to function.

## Installation

We've provided a simple, interactive installer using our CLI tool.

### 1. Download and Install
Open your terminal and run the following commands (or simply run the provided `install.sh` script):

```bash
git clone https://github.com/YOUR_USERNAME/openpaw.git ~/.openpaw-install
cd ~/.openpaw-install
./install.sh
```

The script will automatically check your Node.js version, install the necessary dependencies for the server, client, and CLI, and link the `openpaw` command globally on your system.

### 2. Enter Onboarding

Once installed, type the following command to begin the setup wizard:

```bash
openpaw
```

Because it's your first boot, the CLI will guide you through:
1. Setting your user name.
2. Providing an API Key (like an Anthropic API Key).
3. Generating a secure **Auth Token** to log into your dashboard.

> **Important**: The CLI will generate an auth token such as `opk_abc123...`. **Save this token securely**. You will need it to bypass the login screen when you launch the dashboard.

## Starting the Server

After running onboarding, you can start the platform anytime by running:

```bash
openpaw start
```

This starts both the backend API (port 7411) and the frontend dashboard (port 5173). Your default web browser will automatically open to `http://localhost:5173`. Wait for the local terminal logs to indicate the backend is running.

When prompted by the dashboard login screen, enter the `opk_` token generated during your first boot.

## Creating Your First Agent

1. Navigate to the **Agents** tab on the left sidebar.
2. Click **Create Agent**.
3. Fill in the agent details:
   - **Name**: e.g., "Research Assistant"
   - **Role**: Describe the core role, e.g., "Senior Researcher"
   - **Model**: Select `claude-3-5-sonnet` or any model available.
   - **System Prompt**: Set a behavior pattern: "You are an incredibly analytical researcher focused on clear and structured information."
4. Click **Create Agent**.

Congratulations! You have initialized an Agent instance. From the Agent's profile, you can now manage their underlying files, give them tasks, chat with them, or equip them with MCPs and Skills.
