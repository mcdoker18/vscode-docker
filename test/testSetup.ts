import * as vscode from "vscode";
import * as assert from "assert";

export function testSetup(): void {
    let workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders.length === 0) {
        throw new Error("No workspace is open.  Make sure the .testOutput folder exists (e.g. running 'npm test' on the command line will do this)");
    }
    if (workspaceFolders.length > 1) {
        throw new Error("There are unexpected multiple workspaces open");
    }
}
