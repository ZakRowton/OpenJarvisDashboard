<div align="center">
  <img src="LivingMemory.PNG" alt="Living AI Memory Dashboard" width="480" />
</div>

# Living AI Memory Dashboard

MemoryGraph is a lightweight all-in-one interface for connecting AI providers and models to a live execution framework with visual graph-based introspection.

## Quick install

One-command setup (installs or uses existing XAMPP/Apache+PHP, starts the server, and prepares the app):

```bash
curl -sSL https://raw.githubusercontent.com/ZakRowton/LivingAIMemoryDashboard/master/install.sh | bash
```

Or clone first, then run the script from the project root:

```bash
git clone https://github.com/ZakRowton/LivingAIMemoryDashboard.git MemoryGraph
cd MemoryGraph
bash install.sh
```

- **Linux:** Tries XAMPP at `/opt/lampp`, or installs Apache + PHP via `apt`/`dnf`/`yum` and starts the service.
- **macOS:** Uses XAMPP at `/Applications/XAMPP` if present, or Homebrew PHP and the built-in PHP server.
- **Windows (Git Bash / WSL):** Looks for XAMPP at `C:\xampp`. If not found, the script prints a link to download XAMPP; after installing, run the script again or copy the app into `C:\xampp\htdocs\MemoryGraph`.

After install, copy `.env.example` to `.env` (the script does this if missing), add your API keys, then open the URL the script prints (e.g. `http://localhost/MemoryGraph/` or `http://localhost:8080/`).

It combines:

- a beautiful interactive 3D memory graph
- multi-provider AI chat
- tool creation and execution
- memory file creation and editing
- MCP server connectivity and AI-managed MCP configuration
- parallel background job execution
- live UI feedback showing what the AI is thinking, using, and accessing

The goal is to give you a single control surface where an AI agent is not a black box. You can see its structure, inspect its tools, edit memory, manage MCP servers, run jobs in parallel, and watch activity animate across the graph in real time.

## Why This Project Exists

Most AI interfaces only show a chat box and a response. MemoryGraph is designed to expose the whole agent runtime:

- what provider and model are active
- what tools exist
- what memory files the agent can read
- what MCP servers are connected
- what jobs are running in the background
- what node the AI is currently accessing
- what parameters were sent into a tool or MCP action

That makes it useful both as a developer playground and as a serious agent operations dashboard.

## Core Features

### Multi-provider AI chat

The interface supports switching between multiple providers and models from the UI, while preserving access to the agent framework.

Current provider integrations include:

- Mercury
- Featherless
- Alibaba Cloud
- Gemini

### Interactive 3D memory graph

The app renders a draggable, zoomable Three.js graph with a central `Agent` node and connected runtime domains:

- `Memory`
- `Tools`
- `Instructions`
- `MCPs`
- `Jobs`

Each domain can expand into child nodes. Those nodes animate when being read, executed, or modified.

### Tool framework

The AI can:

- list available tools
- execute tools
- create new custom PHP tools
- edit tool files
- modify tool registry entries
- delete tools
- enable or disable tools from the UI

### Memory system

Markdown files in `memory/` become graph nodes the AI can work with.

The AI and the user can:

- list memory files
- read memory files
- create memory files
- update memory files
- delete memory files
- enable or disable memory files

### MCP connectivity

The app supports MCP server definitions stored locally and surfaced as child nodes under `MCPs`.

The AI can:

- list MCP servers
- inspect MCP server configuration
- create MCP servers
- partially configure MCP servers
- set or remove MCP env vars
- set or remove MCP headers
- enable or disable MCP servers
- delete MCP servers
- use tools exposed by active MCP servers

The UI lets you inspect and edit MCP server config directly from the graph panel as well.

### Parallel jobs

Jobs are markdown task lists stored in `jobs/`.

Jobs can be launched in parallel and are executed step-by-step in the background. While jobs are running, the UI shows:

- running job cards
- step progress
- stop controls
- cached final responses
- graph animation for active job nodes and any tools used by those jobs

### Rich response previews

When the AI returns HTML or JavaScript visual output, the response modal can preview it directly in-browser. That makes generated charts, graphs, and demos immediately visible.

## UI Design

MemoryGraph is designed to feel like a premium agent cockpit rather than a standard admin page.

Visual design highlights:

- dark carbon-fiber inspired background
- glowing orb-style graph nodes
- galaxy-like starfield and shooting star effects
- glassmorphism panels
- Cinzel display typography with Playfair Display for body text
- animated right-side context panels
- live status feedback tied directly to graph nodes

Important UI areas:

- Center/bottom: sticky AI chat bar
- Top/left: graph legend
- Top/right: node configuration and info panel
- Right/below panel: execution parameter viewer
- Bottom/left: running jobs widget
- Modal popup: formatted AI responses with code and previews

## What Makes It Different

MemoryGraph is not just a chatbot.

It is a lightweight agent framework with a visual runtime layer. The AI can extend its own environment by creating tools, modifying memory, adding MCP connections, and running parallel jobs while the user remains in control through the graph UI.

## Tech Stack

- PHP
- JavaScript
- jQuery
- Bootstrap 5
- Three.js
- CSS
- Markdown-backed memory, instruction, and job files

## Project Structure

Key files and folders:

- `index.php` - main interface and UI shell
- `api/chat.php` - multi-provider chat proxy and tool loop
- `api/chat_status.php` - live activity status polling
- `tools/` - custom PHP tools
- `memory/` - markdown memory files
- `instructions/` - markdown instruction files
- `jobs/` - markdown job files
- `api_mcps.php` - MCP server management API
- `mcp_store.php` - MCP config storage
- `mcp_client.php` - stdio MCP client bridge
- `tool_calls.json` - custom tool registry
- `mcp_servers.json` - local MCP server registry
- `.env` - local API key and secret storage

## Local Setup

### 0. Quick install (recommended)

Use the [Quick install](#quick-install) script above for automatic XAMPP/Apache+PHP detection, server start, and `.env` setup. Then continue from step 2 below to configure `.env`.

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd MemoryGraph
```

### 2. Create your local environment file

Copy the example file and fill in your real keys:

```bash
cp .env.example .env
```

If you are on Windows and using PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env` and set the provider keys you want to use.

### 3. Requirements

Make sure your local PHP environment has:

- PHP 8+
- `curl` enabled
- local file write access

If you are using XAMPP, Apache + PHP with `curl` enabled is enough for the current app.

### 4. Serve the project locally

If you are using XAMPP, place the project in `htdocs` and open:

- `http://localhost/MemoryGraph/`

You can also open:

- `http://localhost/MemoryGraph/test.php`

### 5. Start using the dashboard

Once the app loads, you can:

1. choose a provider and model
2. send a prompt through the sticky chat bar
3. click graph nodes to inspect tools, memory, MCPs, or jobs
4. create or modify runtime assets through the interface

## MCP Setup

MCP support is currently built around locally configured MCP server definitions.

To add an MCP server:

1. click the `MCPs` node
2. create a new MCP entry
3. set command, args, env, cwd, or headers as needed
4. save the config
5. refresh the MCP tool list from the panel

Active MCP servers expose their tools to the AI automatically.

## Tool Development

Custom tools live in `tools/` and are registered in `tool_calls.json`.

The system supports both:

- manually authored PHP tools
- AI-created or AI-edited tools through the built-in tool management layer

Example use cases:

- web search
- API wrappers
- local file workflows
- data formatting
- automation helpers

## Job Execution

Jobs are markdown files made of task lists. Each step is executed in order inside the job, while multiple jobs can run in parallel with independent status and response capture.

This makes it useful for:

- batch agent workflows
- content generation pipelines
- repeated graph/report generation
- autonomous multi-step tasks

## Security Notes

- `.env` is ignored by Git and should remain local
- `mcp_servers.json` is also ignored because it may contain local MCP credentials or env vars
- do not commit live API keys or private keys into repository code

## Recommended First Run

After cloning:

1. fill in `.env`
2. confirm the provider/model panel loads
3. test a simple chat prompt
4. inspect `Tools`, `Memory`, and `MCPs` nodes
5. create a small job in `jobs/`
6. run multiple jobs and watch the graph activity

## Vision

MemoryGraph is built to be a beautiful top-tier open-source interface for transparent AI operation:

- any provider
- any model
- live graph visibility
- extensible tools
- persistent memory
- MCP connectivity
- parallel jobs
- AI-manageable runtime infrastructure

If you want an agent UI where you can actually see what the AI is doing, this project is built for that.
