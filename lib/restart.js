'use strict';

/**
 * Cross-platform DSH restart script.
 * Spawned as a detached process by the host plugin; survives DSH exit.
 *
 * Usage: node lib/restart.js <workdir> <nodeBin> <dshBin> <port> <logFile>
 *   workdir  — DSH working directory
 *   nodeBin  — absolute path to node executable
 *   dshBin   — absolute path to dsh bin.js
 *   port     — port to kill (default 3080)
 *   logFile  — where to write startup logs
 */
const { spawn, execSync, exec } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const workdir = process.argv[2] || '/';
const nodeBin = process.argv[3] || process.execPath;
const dshBin = process.argv[4] || '';
const port = parseInt(process.argv[5] || '3080', 10);
const logFile = process.argv[6] || path.join(require('node:os').tmpdir(), 'dsh-restart.log');

const isWin = process.platform === 'win32';

function log(msg) {
  var line = '[' + new Date().toISOString() + '] ' + msg;
  try { fs.appendFileSync(logFile, line + '\n'); } catch (_e) {}
}

function sleep(ms) {
  // Synchronous sleep using execSync (cross-platform)
  if (isWin) {
    execSync('ping -n ' + Math.ceil(ms / 1000 + 1) + ' 127.0.0.1 > nul', { stdio: 'ignore' });
  } else {
    execSync('sleep ' + (ms / 1000), { stdio: 'ignore' });
  }
}

function killPort(port) {
  if (isWin) {
    try {
      var out = execSync(
        'for /f "tokens=5" %a in (\'netstat -aon ^| find ":' + port + '" ^| find "LISTENING"\') do taskkill /F /PID %a',
        { shell: 'cmd.exe', stdio: ['ignore', 'pipe', 'ignore'] }
      ).toString();
      log('Windows kill result: ' + out.trim());
    } catch (e) {
      log('Windows kill: no process or error: ' + (e.message || e));
    }
  } else {
    try {
      var out2 = execSync('lsof -ti tcp:' + port, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (out2) {
        var pids = out2.split('\n');
        log('Found PIDs on port ' + port + ': ' + pids.join(', '));
        pids.forEach(function(pid) {
          pid = pid.trim();
          if (!pid) return;
          try { process.kill(parseInt(pid, 10), 'SIGTERM'); } catch (_e) {}
        });
        sleep(3000);
        pids.forEach(function(pid) {
          pid = pid.trim();
          if (!pid) return;
          try { process.kill(parseInt(pid, 10), 'SIGKILL'); } catch (_e) {}
        });
        log('Killed PIDs: ' + pids.join(', '));
      } else {
        log('No process on port ' + port);
      }
    } catch (e2) {
      log('No process on port ' + port + ' (lsof returned nothing)');
    }
  }
}

function startDSH() {
  log('Starting DSH: ' + nodeBin + ' ' + dshBin + ' web');
  log('Workdir: ' + workdir);

  var out = fs.openSync(logFile, 'a');
  var err = fs.openSync(logFile, 'a');

  var child = spawn(nodeBin, [dshBin, 'web'], {
    cwd: workdir,
    detached: true,
    stdio: ['ignore', out, err]
  });

  child.on('error', function(e) {
    log('Failed to start: ' + (e.message || e));
  });

  // Unref so this script can exit without waiting for DSH
  child.unref();
  log('DSH started, PID: ' + child.pid);
}

// ── Main ────────────────────────────────────────────
log('=== DSH restart script started ===');
log('Platform: ' + process.platform);

// Step 1: wait for the current DSH to exit gracefully
log('Waiting 2 seconds for graceful shutdown...');
sleep(2000);

// Step 2: kill anything still on the port
log('Killing process on port ' + port + '...');
killPort(port);

// Step 3: small buffer
sleep(1000);

// Step 4: start new DSH
startDSH();

// Step 5: exit this script
log('Restart script done.');
process.exit(0);
