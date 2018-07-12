import * as assert from 'assert';
import * as vscode from "vscode";
import * as process from "process";
import mocha = require("mocha");

// Runs before all tests
suiteSetup(function (this: mocha.IHookCallbackContext): void {
    let workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders.length === 0) {
        throw new Error("No workspace is open.  Make sure the .testOutput folder exists (e.g. running 'npm test' on the command line will do this)");
    }
    if (workspaceFolders.length > 1) {
        throw new Error("There are unexpected multiple workspaces open");
    }

    // Don't want to accidentally delete a random folder
    if (workspaceFolders[0].name !== '.testoutput') {
        throw new Error("vscode is opened against the wrong folder for tests");
    }
});

// Runs after all tests
suiteTeardown(function (this: mocha.IHookCallbackContext): void {
});