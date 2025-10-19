![unifig Banner](assets/banner.png)

# unifig - Unified Configuration Manager
unifig is a unified configuration file management platform designed for AI-assisted coding environments. It automatically discovers, synchronizes, and manages configuration and instruction files across popular developer tools—including Claude Code, Continue.dev, Cline CLI, OpenCode, GitHub Copilot, Crush CLI, and Cursor. By centralizing file management, unifig streamlines team collaboration, enforces coding standards, maintains consistent AI agent behavior, and simplifies the setup of Model Context Protocol (MCP) servers for modern codebases.

**Supported agents:**
- Claude Code - `claude`
- OpenCode - `opencode`
- OpenAI Codex - `codex`
- Gemini CLI - `gemini`
- GitHub Copilot - `copilot`
- Crush CLI - `crush`
- Cursor - `cursor`
- Continue.dev - `continue`
- Cline CLI - `cline`

Using `.unifig` directory and the files under it, the unifig CLI tool can help you manage configuration files for all supported agents in a unified way.
Unifig automatically scans your project for `.unifig/*` files and generates agent configurations in the same directory, respecting `.gitignore` rules.

# Install unifig
```bash
bun install -g @unifigio/cli
```

# Or run directly
```bash
bunx @unifigio/cli <command>
```

# Scan and automatically create configuration files
```bash
# Scan the current directory and nested directories and create configuration files for all supported agents
unifig apply --nested --agent all
# Scan the current directory and nested directories and create configuration files for Claude Code and GitHub Copilot only
unifig apply --nested --agent claude,copilot

# Scan only the current directory and create configuration files for all supported agents
unifig apply --agent all
# Scan only the current directory and create configuration files for OpenCode and Cursor only
unifig apply --agent opencode,cursor
```

# Initialize unifig in your project
```bash
# Initialize unifig in the current directory
unifig init
```

# Clean `.unifig` directories in your project
```bash
# Clean all `.unifig` directories in the current directory and nested directories
unifig clean --nested
# Clean the `.unifig` directory in the current directory only
unifig clean
```