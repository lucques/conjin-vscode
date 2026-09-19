const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { validatePageName } = require('../page-name');
const manifest = require('../package.json');

test('Page names accept lowercase words, numbers, and single hyphens', () => {
    for (const name of ['home', 'my-page', 'lesson-1', '123']) {
        assert.equal(validatePageName(name), undefined, `Accept ${name}`);
    }
});

test('Page names reject paths, invalid formatting, and reserved names', () => {
    for (const name of ['', '.', '..', '../outside', '/outside', 'one/two', 'one\\two', 'Has Spaces', 'my--page', 'con']) {
        assert.ok(validatePageName(name), `Reject ${name}`);
    }
});

test('cjpage is registered as a PHP file template', () => {
    const contribution = manifest.contributes.snippets.find(item => item.language === 'php');
    assert.ok(contribution, 'PHP snippets are registered');
    const snippets = require(path.resolve(__dirname, '..', contribution.path));
    const template = Object.values(snippets).find(item => item.prefix === 'cjpage');
    assert.ok(template, 'cjpage is available in the registered snippets');
    assert.equal(template.isFileTemplate, true);
});
