import * as vscode from "vscode";
import * as path from "path";

export function testSetup(): void {
    let workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders.length === 0) {
        throw new Error("No workspace is open.  Make sure the .testOutput folder exists (e.g. running 'npm test' on the command line will do this)");
    }
    if (workspaceFolders.length > 1) {
        throw new Error("There are unexpected multiple workspaces open");
    }

    if (path.dirname(workspaceFolders[0].uri.fsPath) !== '.testoutput') {
        throw new Error("vscode is opened against the wrong folder for tests");
    }
}
