# Agent Files

Every agent in OpenPaw is powered by an engine that reads its "soul" from a series of configuration markdown files. These files live inside `~/.openpaw/agents/[agent_id]/identity/`. OpenPaw concatenates these files together to create a massive system prompt context for every interaction.

## The 8 Identity Files

### 1. CORE_IDENTITY.md
**The Foundation**: This file defines the baseline identity and behavior of the agent. It describes who the agent is, its core role, and its primary purpose.

### 2. KNOWLEDGE_BASE.md
**What They Know**: This file gives the agent access to facts, domain-specific terminology, and specific structured information. This ensures the model pulls from a factual grounded context about its immediate domain.

### 3. TONE_AND_STYLE.md
**How They Speak**: This file controls the voice and formatting. Does the agent use formal phrasing, markdown tables, emojis, slang, or bullet points? Describe how every message should sound.

### 4. GOALS.md
**Their Objectives**: An agent without goals is just a chatbot. This file dictates short-term and long-term milestones. This impacts the agent's proactive behaviors, meaning the agent will take unprompted actions to further these goals.

### 5. CAPABILITIES.md
**What They Can Do**: OpenPaw injects abilities like `Web Search`, `Browser Command`, `Mail Sending`, etc., into this file. This instructs the model on which commands it can reliably execute.

### 6. RULES_AND_CONSTRAINTS.md
**What They CANNOT Do**: This acts as a security mechanism or guardrail. For example: "Never discuss politics", "Do not format code without comments", or "Never delete a file inside a workspace".

### 7. DYNAMIC_CONTEXT.md
**Their Short-Term Memory**: The system automatically mutates this file during conversations and background tasks. The agent gets injected with recent state changes (e.g. "Currently researching Quantum Computing").

### 8. SYSTEM_PROMPT.md
**The Master Directive**: This file dictates the absolute highest priority system instruction that glues the rest of the files together. It determines the flow and priority of all context provided in the previous 7 files.

## Best Practices

- Keep `CORE_IDENTITY.md` concise. Overloading it can confuse the model.
- Use `RULES_AND_CONSTRAINTS.md` specifically for negative constraints ("Do not...", "Never...").
- Rather than manually editing `DYNAMIC_CONTEXT.md`, rely on the agent's proactive routines and memory tiering to manage immediate state updates.
