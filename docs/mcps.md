# Model Context Protocol (MCP)

OpenPaw supports connecting agents with the **Model Context Protocol (MCP)** standard. MCPs provide a uniform way to expose external tools, datasets, and infrastructure natively to Large Language Models.

Instead of hardcoding every possible integration (GitHub, Slack, Jira, Postgres), MCP servers act as standard interfaces that expose 'resources' and 'tools' for your OpenPaw agents to discover dynamically.

## Supported Transports

OpenPaw supports both primary MCP connection types:
- **STDIO (Standard Input/Output)**: The MCP server runs as a background process locally via a command (e.g. `npx`, `python`, `go run`). OpenPaw spawns the process and communicates via its stdin/stdout streams over JSON-RPC.
- **SSE (Server-Sent Events) / HTTP**: The MCP server is hosted remotely. OpenPaw connects over a standard HTTP connection and uses SSE for persistent bidirectional streaming.

## Adding an MCP Server

From the main **Settings** page:
1. Navigate to the **MCPs** tab.
2. Click **Connect MCP Server**.
3. Choose the connection type.
   - For an **STDIO** server, define the `command` (e.g., `npx`) and the `args` (e.g., `["-y", "@modelcontextprotocol/server-postgres", "postgresql://user:pass@localhost/db"]`).
   - For an **SSE** server, simply provide the `endpoint URL` and any custom request headers if authentication is required.
4. Name the server (e.g. "Development Database").
5. Click **Add Server**.

## Linking MCPs to Agents

Adding an MCP server to OpenPaw makes it available platform-wide, but an agent cannot access it until you specifically authorize and connect it.
1. Go to an **Agent's Profile**.
2. Click the **MCPs** pill underneath their information.
3. Click **Add MCP**. Select the server you just created.
4. OpenPaw automatically reads the available schema and tools from the server and dynamically updates the agent's `CAPABILITIES.md` file.

*The next time you chat with this agent, it will automatically know it has access to Postgres tables and schema analysis tools.*
