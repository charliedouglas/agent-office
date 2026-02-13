#!/usr/bin/env node

import { Command } from 'commander';
import { spawn } from 'node:child_process';
import path from 'node:path';
import {
  ensureAgentDir,
  createInitialState,
  updateState,
  getInjectedInstructions,
} from './state.js';
import {
  registerAgent,
  unregisterAgent,
  updateAgentAPI,
} from './api-client.js';

const program = new Command();

program
  .name('agent-run')
  .description('Wrap Claude Code sessions with agent state tracking')
  .requiredOption('--name <name>', 'Agent name (e.g., ember-otter)')
  .requiredOption('--team <team>', 'Team name (e.g., frontend)')
  .requiredOption('--task <task>', 'Task description')
  .allowUnknownOption()
  .usage('--name <name> --team <team> --task <task> -- <command> [args...]');

program.parse(process.argv);

const options = program.opts();
const { name, team, task } = options;

// Find the separator '--' in the arguments
const separatorIndex = process.argv.indexOf('--');
if (separatorIndex === -1) {
  console.error('Error: Command separator "--" not found');
  console.error('Usage: agent-run --name <name> --team <team> --task <task> -- <command> [args...]');
  process.exit(1);
}

// Everything after '--' is the command to run
const commandArgs = process.argv.slice(separatorIndex + 1);
if (commandArgs.length === 0) {
  console.error('Error: No command specified after "--"');
  console.error('Usage: agent-run --name <name> --team <team> --task <task> -- <command> [args...]');
  process.exit(1);
}

const [command, ...args] = commandArgs;

async function main() {
  try {
    // Get project root (current working directory)
    const projectRoot = process.cwd();

    // Ensure .agent directory exists
    const agentDir = await ensureAgentDir(projectRoot);

    // Create initial agent state
    const initialState = await createInitialState(agentDir, name, team, task);

    // Register agent with REST API (in addition to file-based state)
    try {
      await registerAgent(name, team, task);
      console.log(`[agent-run] Registered agent with API`);
    } catch (error) {
      console.warn(`[agent-run] Warning: Failed to register with API:`, error instanceof Error ? error.message : String(error));
      console.warn(`[agent-run] Continuing with file-based state only...`);
    }

    // Get injected instructions
    const injectedInstructions = getInjectedInstructions(agentDir, name);

    // Find the -p or --prompt argument and inject our instructions
    const modifiedArgs = [...args];
    let promptIndex = modifiedArgs.findIndex(
      (arg) => arg === '-p' || arg === '--prompt'
    );

    if (promptIndex !== -1 && promptIndex + 1 < modifiedArgs.length) {
      // Inject instructions before the user's prompt
      const originalPrompt = modifiedArgs[promptIndex + 1];
      modifiedArgs[promptIndex + 1] = `${injectedInstructions}\n\n${originalPrompt}`;
    } else {
      // If no -p flag found, add it with just the instructions
      modifiedArgs.push('-p', injectedInstructions);
    }

    console.log(`[agent-run] Starting agent: ${name} (${team})`);
    console.log(`[agent-run] Task: ${task}`);
    console.log(`[agent-run] State file: ${path.join(agentDir, `${name}.json`)}`);
    console.log(`[agent-run] Running: ${command} ${modifiedArgs.join(' ')}`);
    console.log('---');

    // Update state to typing before spawning
    await updateState(agentDir, name, { state: 'typing' });

    // Also update API
    try {
      await updateAgentAPI(name, { state: 'typing' });
    } catch (error) {
      // Silently ignore API errors
    }

    // Spawn the child process
    const child = spawn(command, modifiedArgs, {
      stdio: 'inherit', // Pipe stdio through
      shell: false,
    });

    // Handle process exit
    child.on('exit', async (code, signal) => {
      console.log('---');
      console.log(`[agent-run] Process exited with code ${code}`);

      // Update final state
      await updateState(agentDir, name, {
        state: 'idle',
        // Note: We don't automatically mark incomplete items as done/failed
        // because the agent should be updating its own state during execution
      });

      // Unregister from API
      try {
        await unregisterAgent(name);
        console.log(`[agent-run] Unregistered agent from API`);
      } catch (error) {
        // Silently ignore API errors
      }

      console.log(`[agent-run] Agent ${name} state updated to idle`);
      process.exit(code ?? 0);
    });

    // Handle errors
    child.on('error', async (err) => {
      console.error(`[agent-run] Error spawning process: ${err.message}`);
      await updateState(agentDir, name, { state: 'idle' });

      // Unregister from API
      try {
        await unregisterAgent(name);
      } catch (error) {
        // Silently ignore API errors
      }

      process.exit(1);
    });
  } catch (error) {
    console.error('[agent-run] Fatal error:', error);
    process.exit(1);
  }
}

main();
