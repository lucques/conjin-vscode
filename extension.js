const vscode = require('vscode');
const { createPage } = require('./page');
const { validatePageName } = require('./page-name');

function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('conjin.newPage', async (parentUri) => {
        try {
            if (!parentUri) {
                const folders = await vscode.window.showOpenDialog({
                    title: 'Select the parent content folder',
                    openLabel: 'Select Folder',
                    canSelectFiles: false,
                    canSelectFolders: true,
                    canSelectMany: false,
                });
                parentUri = folders?.[0];
            }
            if (!parentUri) {
                return;
            }

            const name = await vscode.window.showInputBox({
                title: 'New Conjin Page',
                prompt: 'Page directory name',
                placeHolder: 'my-page',
                validateInput: validatePageName,
            });
            if (name === undefined) {
                return;
            }

            await createPage(parentUri, name);
        } catch (error) {
            vscode.window.showErrorMessage(`Could not create Conjin page: ${error.message}`);
        }
    }));
}

module.exports = { activate };
