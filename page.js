const vscode = require('vscode');
const { validatePageName } = require('./page-name');
const template = require('./snippets/conjin.json')['Conjin content page'];

async function createPage(parentUri, name) {
    const validationError = validatePageName(name);
    if (validationError) {
        throw new Error(validationError);
    }

    const parent = await vscode.workspace.fs.stat(parentUri);
    if (!(parent.type & vscode.FileType.Directory)) {
        throw new Error('Select a parent folder for the new page.');
    }

    const pageUri = vscode.Uri.joinPath(parentUri, name);
    const fileUri = vscode.Uri.joinPath(pageUri, 'index.php');
    let exists = false;
    try {
        await vscode.workspace.fs.stat(fileUri);
        exists = true;
    } catch (error) {
        if (error.code !== 'FileNotFound') {
            throw error;
        }
    }
    if (exists || vscode.workspace.textDocuments.some(document => document.uri.toString() === fileUri.toString() && document.isDirty)) {
        throw new Error(`A page already exists at ${fileUri.path}.`);
    }

    await vscode.workspace.fs.createDirectory(pageUri);
    const edit = new vscode.WorkspaceEdit();
    // The edit also refuses an existing file if another process created it after the check.
    edit.createFile(fileUri, { overwrite: false, ignoreIfExists: false });
    if (!await vscode.workspace.applyEdit(edit)) {
        throw new Error(`Could not create ${fileUri.path}. It may already exist.`);
    }

    const document = await vscode.workspace.openTextDocument(fileUri);
    if (document.isDirty || document.getText().length !== 0) {
        throw new Error(`The new file was modified before the template could be inserted: ${fileUri.path}.`);
    }
    const editor = await vscode.window.showTextDocument(document, { preview: false });
    if (!await editor.insertSnippet(new vscode.SnippetString(template.body.join('\n')), new vscode.Position(0, 0))) {
        throw new Error('The file was created, but the template could not be inserted. Use Insert Snippet to fill it.');
    }
    if (!await document.save()) {
        throw new Error('The page is open, but could not be saved. Save it manually to keep your changes.');
    }
    return fileUri;
}

module.exports = { createPage };
