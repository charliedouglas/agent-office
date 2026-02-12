import chokidar from 'chokidar';
import { bridgeEvents } from './events.js';
import { parseTeamState } from './parser.js';

export function startWatcher(teamsDir: string) {
  console.log(`[Watcher] Watching directory: ${teamsDir}`);

  const watcher = chokidar.watch(teamsDir, {
    persistent: true,
    ignoreInitial: false,
    depth: 2
  });

  watcher
    .on('add', (path) => {
      console.log(`[Watcher] File added: ${path}`);
      const state = parseTeamState(path);
      // Emit state changes through event emitter
    })
    .on('change', (path) => {
      console.log(`[Watcher] File changed: ${path}`);
      const state = parseTeamState(path);
      // Emit state changes through event emitter
    })
    .on('unlink', (path) => {
      console.log(`[Watcher] File removed: ${path}`);
    })
    .on('error', (error) => {
      console.error(`[Watcher] Error:`, error);
    });

  return watcher;
}
