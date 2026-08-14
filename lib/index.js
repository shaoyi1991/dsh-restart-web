'use strict';

Object.defineProperty(module.exports, Symbol.toStringTag, { value: 'Module' });

const name = 'dsh-restart-web';
const inject = ['webServer'];

function apply(ctx) {
  const webServer = ctx.webServer;
  const nodePath = require('node:path');
  const nodeFs = require('node:fs');

  const dispose = webServer.register({
    kind: 'exact',
    path: '/api/dsh-restart',
    handler: async (req, res) => {
      try {
        const subprocess = ctx.get('subprocess');
        if (subprocess === undefined) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'subprocess service unavailable' }));
          return;
        }

        const sandboxPolicy = ctx.get('sandboxPolicy');
        const workdir = (sandboxPolicy && sandboxPolicy.workspaceRoot) || '/';

        // Resolve absolute paths for the restart script.
        // process.execPath → node binary (works on all platforms)
        // process.argv[1] → DSH's bin.js (the entry point that started us)
        var nodeBin = process.execPath;
        var dshBin = process.argv[1];
        if (!dshBin || !nodeFs.existsSync(dshBin)) {
          dshBin = nodePath.resolve(__dirname, '..', '..', '..', 'lib', 'bin.js');
        }

        // The standalone restart script (cross-platform, no bash dependency)
        var restartScript = nodePath.join(__dirname, 'restart.js');
        var os = require('node:os');
        var logFile = nodePath.join(os.tmpdir(), 'dsh-restart.log');

        if (process.platform === 'win32') {
          // Windows: spawn directly via node, detached
          // No process-group kill issue on Windows — DSH's subprocess
          // service uses taskkill which targets specific PIDs, not groups
          subprocess.spawn({
            argv: [nodeBin, restartScript, workdir, nodeBin, dshBin, '3080', logFile],
            cwd: workdir,
            stdio: {
              stdin: 'ignore',
              stdout: { maxBytes: 4096 },
              stderr: { maxBytes: 4096 }
            },
            graceMs: 100
          });
        } else {
          // POSIX (macOS/Linux): use bash with `set -m` so the restart
          // script escapes into its own process group and survives DSH's
          // terminateForHostExit → kill(-pid, SIGKILL) cleanup.
          var innerScript = [
            'set -m',
            '{',
            '  exec "' + nodeBin + '" "' + restartScript + '" ' +
              JSON.stringify(workdir) + ' ' +
              JSON.stringify(nodeBin) + ' ' +
              JSON.stringify(dshBin) + ' 3080 ' + JSON.stringify(logFile),
            '} &'
          ].join('\n');

          subprocess.spawn({
            argv: ['bash', '-c', innerScript],
            cwd: workdir,
            stdio: {
              stdin: 'ignore',
              stdout: { maxBytes: 4096 },
              stderr: { maxBytes: 4096 }
            },
            graceMs: 100
          });
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
      }
    }
  });

  ctx.effect(() => dispose, 'dsh-restart-web route');
}

module.exports.name = name;
module.exports.inject = inject;
module.exports.apply = apply;
