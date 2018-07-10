/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as glob from 'glob';
import * as randomness from "../helpers/randomness";
import { Platform } from "../configureWorkspace/config-utils";
import { ext } from '../extensionVariables';
import { ITestCallbackContext, IHookCallbackContext } from 'mocha';
import { configure } from '../configureWorkspace/configure';
import { TestUserInput } from 'vscode-azureextensionui';
import { resolve } from 'dns';
import { globAsync } from '../helpers/async';

suite("configure (Add Docker files to Workspace)", function (this: ITestCallbackContext) {
    this.timeout(60 * 1000);

    const testFolderPath: string = path.join(os.tmpdir(), `azure-docker.configureTests${randomness.getRandomHexString()}`);
    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    suiteSetup(async function (this: IHookCallbackContext): Promise<void> {
        await fse.ensureDir(testFolderPath);
    });

    suiteTeardown(async () => {
        await fse.remove(testFolderPath);
    });

    async function testConfigureDocker(folderPath: string, platform: Platform, ...inputs: (string | undefined)[]): Promise<void> {
        // Set up simulated user input
        inputs.unshift(platform);
        const ui: TestUserInput = new TestUserInput(inputs);
        ext.ui = ui;

        await fse.ensureDir(folderPath);
        await configure(folderPath);
        assert.equal(inputs.length, 0, 'Not all inputs were used.');
    }

    const nodeJsProject: string = 'nodeJsProject';
    test(nodeJsProject + " no package.json", async function (this: ITestCallbackContext) {
        const projectFolderPath: string = path.join(testFolderPath, nodeJsProject);
        await testConfigureDocker(projectFolderPath, 'Node.js', '1234');
        let files = await globAsync('**/*', { cwd: projectFolderPath });
        assert.equal(files, ['package.json'], "The set of files in the project folder after configure was run is not correct.");
    });
});
