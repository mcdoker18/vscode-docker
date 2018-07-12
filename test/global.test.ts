import * as vscode from "vscode";
import * as path from "path";
import mocha = require("mocha");
import { pathExists } from '../node_modules/@types/fs-extra';

export namespace constants {
    export const testOutputName = 'testOutput';
}

// The root workspace folder that vscode is opened against for tests
let testRootFolder: string;

export function getTestRootFolder(): string {
    if (!testRootFolder) {
        let workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error("No workspace is open.  Make sure the .testOutput folder exists (e.g. running 'npm test' on the command line will do this)");
        }
        if (workspaceFolders.length > 1) {
            throw new Error("There are unexpected multiple workspaces open");
        }

        testRootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
        if (path.basename(testRootFolder) !== constants.testOutputName) {
            throw new Error("vscode is opened against the wrong folder for tests");
        }
    }

    return testRootFolder;
}

// Runs before all tests
suiteSetup(function (this: mocha.IHookCallbackContext): void {
});

// Runs after all tests
suiteTeardown(function (this: mocha.IHookCallbackContext): void {
});
