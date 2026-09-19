const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

async function main() {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'conjin-vscode-test-'));
    try {
        const workspace = path.join(temporaryDirectory, 'workspace');
        await fs.mkdir(path.join(workspace, '.vscode'), { recursive: true });
        await fs.writeFile(path.join(workspace, '.vscode', 'settings.json'), JSON.stringify({
            'php.validate.enable': false,
            'editor.tabCompletion': 'onlySnippets',
            'editor.formatOnSave': false,
            'files.autoSave': 'off',
        }));

        const executable = process.env.VSCODE_EXECUTABLE_PATH || 'code';
        const environment = { ...process.env };
        delete environment.ELECTRON_RUN_AS_NODE;
        delete environment.VSCODE_IPC_HOOK_CLI;

        const useVirtualDisplay = process.platform === 'linux' && !process.argv.includes('--show-window');
        const command = useVirtualDisplay ? 'xvfb-run' : executable;
        const launchArgs = [
            workspace,
            '--wait',
            '--disable-extensions',
            '--disable-workspace-trust',
            '--skip-welcome',
            '--skip-release-notes',
            '--disable-gpu',
            `--user-data-dir=${path.join(temporaryDirectory, 'user-data')}`,
            `--extensions-dir=${path.join(temporaryDirectory, 'extensions')}`,
            `--extensionDevelopmentPath=${path.resolve(__dirname, '..')}`,
            `--extensionTestsPath=${path.join(__dirname, 'suite.js')}`,
        ];
        const args = useVirtualDisplay ? ['-a', executable, ...launchArgs] : launchArgs;
        const launchHelp = 'Ensure VS Code is on PATH or set VSCODE_EXECUTABLE_PATH.'
            + (useVirtualDisplay ? ' Install xvfb and xauth for the virtual display.' : '');

        await new Promise((resolve, reject) => {
            const child = spawn(command, args, { env: environment, stdio: 'inherit', timeout: 120000 });
            child.on('error', error => reject(new Error(`Could not launch integration tests. ${launchHelp} ${error.message}`)));
            child.on('exit', (code, signal) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`VS Code tests failed (${signal || code}). ${launchHelp}`));
                }
            });
        });
        // A launcher can exit successfully even when the editor never starts.
        try {
            await fs.access(path.join(workspace, '.integration-tests-passed'));
        } catch {
            throw new Error('VS Code exited without completing the integration tests. Check that it can launch in this environment.');
        }
        console.log('VS Code integration tests passed.');
    } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
