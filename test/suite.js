const assert = require('node:assert/strict');
const vscode = require('vscode');
const { createPage } = require('../page');

const expectedPage = `<?
    $preprocess = function (TargetPreprocessContext $c) {
        $c->activate_module('role-info');

        $c->run_macro('title', 'set', 'The title');
    };

    $process = function(Target $target) {
?>


<p>
    The content
</p>


<?
    };
?>
`;

async function openFile(uri, content) {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content));
    return vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri));
}

async function checkPlaceholders(editor) {
    assert.equal(editor.document.getText(editor.selection), 'The title');
    await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    assert.equal(editor.document.getText(editor.selection), 'The content');
    await vscode.commands.executeCommand('jumpToNextSnippetPlaceholder');
    assert.ok(editor.selection.isEmpty);
    assert.equal(editor.selection.active.line, 15);
}

async function withDialogs(replacements, action) {
    const originals = {};
    for (const [name, replacement] of Object.entries(replacements)) {
        originals[name] = vscode.window[name];
        vscode.window[name] = replacement;
    }
    try {
        await action();
    } finally {
        Object.assign(vscode.window, originals);
    }
}

async function run() {
    const workspace = vscode.workspace.workspaceFolders[0].uri;
    const content = vscode.Uri.joinPath(workspace, 'src', 'content');
    await vscode.workspace.fs.createDirectory(content);
    const extension = vscode.extensions.all.find(item => item.packageJSON.name === 'conjin-vscode');
    assert.ok(extension, 'Conjin extension is loaded');
    await extension.activate();

    const tests = [
        ['cjpage completion expands in an empty PHP file with working placeholders', async () => {
            const editor = await openFile(vscode.Uri.joinPath(content, 'completion.php'), '');
            await vscode.commands.executeCommand('type', { text: 'cjpage' });
            const completions = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', editor.document.uri, editor.selection.active);
            assert.ok(completions.items.some(item => (typeof item.label === 'string' ? item.label : item.label.label) === 'cjpage'), 'cjpage must appear in PHP completions');
            await vscode.commands.executeCommand('hideSuggestWidget');
            await vscode.commands.executeCommand('insertSnippet');
            assert.equal(editor.document.getText(), expectedPage);
            await checkPlaceholders(editor);
            await editor.document.save();
        }],
        ['New Conjin Page creates and saves the page with editable placeholders', async () => {
            await withDialogs({ showInputBox: async () => 'my-page' }, async () => {
                await vscode.commands.executeCommand('conjin.newPage', content);
            });
            const uri = vscode.Uri.joinPath(content, 'my-page', 'index.php');
            assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), expectedPage);
            const editor = vscode.window.activeTextEditor;
            assert.equal(editor.document.uri.toString(), uri.toString());
            assert.equal(editor.document.isDirty, false);
            assert.equal(editor.document.getText(editor.selection), 'The title');
        }],
        ['Command Palette invocation picks a parent folder', async () => {
            await withDialogs({
                showOpenDialog: async () => [content],
                showInputBox: async () => 'palette-page',
            }, async () => {
                await vscode.commands.executeCommand('conjin.newPage');
            });
            const page = await vscode.workspace.fs.stat(vscode.Uri.joinPath(content, 'palette-page', 'index.php'));
            assert.ok(page.type & vscode.FileType.File);
        }],
        ['Existing pages are preserved and reported to the user', async () => {
            const uri = vscode.Uri.joinPath(content, 'my-page', 'index.php');
            await vscode.workspace.fs.writeFile(uri, Buffer.from('Existing page content'));
            let message;
            await withDialogs({
                showInputBox: async () => 'my-page',
                showErrorMessage: async text => { message = text; },
            }, async () => {
                await vscode.commands.executeCommand('conjin.newPage', content);
            });
            assert.match(message, /already exists/);
            assert.equal(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString(), 'Existing page content');
        }],
        ['An existing directory can receive a page without changing its other files', async () => {
            const directory = vscode.Uri.joinPath(content, 'existing-folder');
            await vscode.workspace.fs.createDirectory(directory);
            const resource = vscode.Uri.joinPath(directory, 'resource.txt');
            await vscode.workspace.fs.writeFile(resource, Buffer.from('Keep me'));
            await createPage(content, 'existing-folder');
            const page = await vscode.workspace.fs.stat(vscode.Uri.joinPath(directory, 'index.php'));
            assert.ok(page.type & vscode.FileType.File);
            assert.ok(page.size > 0, 'The created page is not empty');
            assert.equal(Buffer.from(await vscode.workspace.fs.readFile(resource)).toString(), 'Keep me');
        }],
        ['Cancellation creates no files or directories', async () => {
            const before = await vscode.workspace.fs.readDirectory(content);
            await withDialogs({ showInputBox: async () => undefined }, async () => {
                await vscode.commands.executeCommand('conjin.newPage', content);
            });
            await withDialogs({ showOpenDialog: async () => undefined }, async () => {
                await vscode.commands.executeCommand('conjin.newPage');
            });
            assert.deepEqual(await vscode.workspace.fs.readDirectory(content), before);
        }],
        ['Page creation enforces name validation', async () => {
            await assert.rejects(createPage(content, '../outside'), /Use lowercase/);
        }],
    ];

    const failures = [];
    for (const [name, test] of tests) {
        let timeout;
        try {
            await Promise.race([
                test(),
                new Promise((resolve, reject) => {
                    timeout = setTimeout(() => reject(new Error(`Timed out: ${name}`)), 10000);
                }),
            ]);
            console.log(`PASS ${name}`);
        } catch (error) {
            console.error(`FAIL ${name}`, error);
            failures.push(error);
        } finally {
            clearTimeout(timeout);
        }
    }
    if (failures.length > 0) {
        throw new AggregateError(failures, `${failures.length} integration tests failed.`);
    }
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspace, '.integration-tests-passed'), Buffer.from('passed\n'));
    console.log(`${tests.length} Conjin integration tests passed.`);
}

module.exports = { run };
