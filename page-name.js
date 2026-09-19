function validatePageName(name) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
        return 'Use lowercase letters, numbers, and single hyphens (for example, my-page).';
    }
    if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(name)) {
        return 'This directory name is reserved. Choose another name.';
    }
    return undefined;
}

module.exports = { validatePageName };
