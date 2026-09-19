# conjin-vscode

A Visual Studio Code extension for [Conjin](https://github.com/lucques/conjin/) content page templates and syntax highlighting for embedded CSS and Markdown:

- **CSS** between `<? css_start(); ?>` and `<? css_end(); ?>`.
- **Markdown** between `<? md_start(); ?>` and `<? md_end(); ?>`.

These blocks use PHP short tags (`<? ... ?>`) and are highlighted using VS Code's CSS and Markdown grammars.

## Conjin content pages

The extension includes one shared template for Conjin's `src/content/<page>/index.php` files. Its `$preprocess` closure activates `role-info` and sets the page title through the `title` macro. Its `$process` closure contains a paragraph for the page content. The title and content are editable placeholders.

- **Completion:** Create an empty `index.php`, type `cjpage`, and select the **cjpage** suggestion (Ctrl+Space). For direct Tab expansion, enable `"editor.tabCompletion": "onlySnippets"` in your VS Code settings.
- **File template:** Open an empty PHP file, run **Snippets: Fill File with Snippet** (called **Snippets: Populate File from Snippet** in older VS Code versions), and select **cjpage — Conjin content page**. This command replaces the file's contents.
- **New page:** Right-click a parent folder under `src/content` in the Explorer and choose **New Conjin Page**. Enter a directory name such as `my-page`; the extension creates and saves `my-page/index.php`, then leaves it open with editable placeholders. Existing pages are never overwritten. You can also run **Conjin: New Conjin Page** from the Command Palette and select the parent folder.

Press Tab to move from the title to the content and then to the final cursor position. Save after editing the placeholders. After creating a new page, follow your project's usual navigation registration and preprocessing workflow.

All three entry points use `snippets/conjin.json` as the template source.

## Development

Use Node.js 24 for development. The VS Code API types stay on 1.93 to match the minimum supported editor version.

Run `npm test` to run all checks: lint, unit tests, and integration tests, in that order.

Run `npm ci` to install dependencies, then `npm run test:unit` for lint and fast Node tests of page-name validation and the PHP file-template declaration. The unit tests do not launch or require VS Code. Use `npm run lint` for lint alone.

Run `npm run test:integration` after changes to page creation, snippets, or extension registration and before a release. This separately runs the editor integration tests in an isolated VS Code instance. VS Code's `code` launcher must be on your PATH; alternatively, set `VSCODE_EXECUTABLE_PATH` to its executable. On Linux, the runner requires `xvfb` and `xauth` and automatically uses a virtual display, so no window appears on your desktop. It fails if the virtual display is unavailable. For a visible window when debugging, use `npm run test:integration -- --show-window`. On other platforms, integration tests open a VS Code window.

Press F5 to try the extension in an Extension Development Host. The suite checks the file-template declaration without automating VS Code's snippet picker. When changing that declaration or before a release, manually verify that **Snippets: Fill File with Snippet** offers **cjpage**, replaces the file's contents, and leaves the title and content placeholders editable.
