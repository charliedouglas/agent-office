# @agent-office/agent-run

CLI wrapper for Claude Code sessions that tracks agent state for the Agent Office visualization.

## Installation

From the monorepo root:

```bash
npm install
npm run build --workspace=packages/agent-run
```

## Usage

```bash
npx --workspace=packages/agent-run agent-run \
  --name ember-otter \
  --team frontend \
  --task 'Fix task board rendering' \
  -- claude --dangerously-skip-permissions -p 'your prompt here'
```

## How it works

1. Creates `.agent/` directory in project root
2. Creates `.agent/<name>.json` with initial agent state
3. Injects instructions into the Claude Code prompt telling it to maintain its state
4. Spawns the wrapped command as a child process
5. Pipes stdio through transparently
6. Updates state to `idle` when process exits

## State File Format

The agent state file (`.agent/<name>.json`) has this structure:

```json
{
  "id": "unique-uuid",
  "name": "agent-name",
  "team": "team-name",
  "task": "task description",
  "state": "typing" | "idle",
  "plan": [
    {"text": "Step description", "status": "todo"},
    {"text": "In progress step", "status": "in_progress"},
    {"text": "Completed step", "status": "done"}
  ],
  "currentFile": "path/to/current/file.ts",
  "updatedAt": "2026-02-12T22:00:00.000Z"
}
```

The Claude Code agent is instructed to update this file as it works, allowing the office visualization to show real-time progress.
