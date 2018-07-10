/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as assertEx from './assertEx';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as process from 'process';
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
    let rootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const testFolderPath: string = path.join(rootFolder, `configureTests${randomness.getRandomHexString()}`);
    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    suiteSetup(async function (this: IHookCallbackContext): Promise<void> {
        console.log(`Test folder: ${testFolderPath}`);
        await fse.ensureDir(testFolderPath);
    });

    suiteTeardown(async () => {
        await fse.remove(testFolderPath);
    });

    let projectFolderPath: string;
    async function testInFolder(folderName: string, func: () => Promise<void>) {
        test(folderName, async () => {
            projectFolderPath = path.join(testFolderPath, folderName);
            await fse.ensureDir(projectFolderPath);
            await func();
        });
    }

    async function testConfigureDocker(folderPath: string, platform: Platform, ...inputs: (string | undefined)[]): Promise<void> {
        // Set up simulated user input
        inputs.unshift(platform);
        const ui: TestUserInput = new TestUserInput(inputs);
        ext.ui = ui;

        await fse.ensureDir(folderPath);
        await configure(folderPath);
        assert.equal(inputs.length, 0, 'Not all inputs were used.');
    }

    async function writeFile(fileName: string, text: string): Promise<void> {
        await fse.writeFile(path.join(projectFolderPath, 'package.json'), text);
    }

    function fileContains(fileName: string, text: string): boolean {
        let contents = fse.readFileSync(path.join(projectFolderPath, fileName)).toString();
        return contents.search(text) >= 0;
    }

    testInFolder("Node.js no package.json", async () => {
        await testConfigureDocker(projectFolderPath, 'Node.js', '1234');
        let files = await globAsync('**/*', { cwd: projectFolderPath });

        assertEx.unorderedArraysEqual(files, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml'], "The set of files in the project folder after configure was run is not correct.");

        assert(fileContains('Dockerfile', 'EXPOSE 1234'));
        assert(fileContains('Dockerfile', 'CMD npm start'));

        assert(fileContains('docker-compose.debug.yml', '1234:1234'));
        assert(fileContains('docker-compose.debug.yml', '9229:9229'));
        assert(fileContains('docker-compose.debug.yml', 'image: node.js no package.json'));
        assert(fileContains('docker-compose.debug.yml', 'NODE_ENV: development'));
        assert(fileContains('docker-compose.debug.yml', 'command: node --inspect index.js'));

        assert(fileContains('docker-compose.yml', '1234:1234'));
        assert(!fileContains('docker-compose.yml', '9229:9229'));
        assert(fileContains('docker-compose.yml', 'image: node.js no package.json'));
        assert(fileContains('docker-compose.yml', 'NODE_ENV: production'));
        assert(!fileContains('docker-compose.yml', 'command: node --inspect index.js'));

        assert(fileContains('.dockerignore', '.vscode'));
    });

    testInFolder("Node.js with start script", async () => {
        await writeFile('package.json',
            `{
                "name": "vscode-docker",
                "version": "0.0.28",
                "main": "./out/dockerExtension",
                "author": "Azure",
                "scripts": {
                  "vscode:prepublish": "tsc -p ./",
                  "start": "startMyUp.cmd",
                  "test": "npm run build && node ./node_modules/vscode/bin/test"
                },
                "dependencies": {
                  "azure-arm-containerregistry": "^1.0.0-preview"
                }
            }
            `);

        await testConfigureDocker(projectFolderPath, 'Node.js', '4321');
        let files = await globAsync('**/*', { cwd: projectFolderPath });

        assert(fileContains('Dockerfile', 'EXPOSE 4321'));
        assert(fileContains('Dockerfile', 'CMD npm start'));

        assert(fileContains('docker-compose.debug.yml', '4321:4321'));
        assert(fileContains('docker-compose.debug.yml', '9229:9229'));
        assert(fileContains('docker-compose.debug.yml', 'image: node.js with start script'));
        assert(fileContains('docker-compose.debug.yml', 'NODE_ENV: development'));
        assert(fileContains('docker-compose.debug.yml', 'command: node --inspect index.js'));

        assert(fileContains('docker-compose.yml', '4321:4321'));
        assert(!fileContains('docker-compose.yml', '9229:9229'));
        assert(fileContains('docker-compose.yml', 'image: node.js with start script'));
        assert(fileContains('docker-compose.yml', 'NODE_ENV: production'));
        assert(!fileContains('docker-compose.yml', 'command: node --inspect index.js'));

        assert(fileContains('.dockerignore', '.vscode'));
    });

    testInFolder("Node.js without start script", async () => {
        await writeFile('package.json',
            `{
                "name": "vscode-docker",
                "version": "0.0.28",
                "main": "./out/dockerExtension",
                "author": "Azure",
                "scripts": {
                  "vscode:prepublish": "tsc -p ./",
                  "test": "npm run build && node ./node_modules/vscode/bin/test"
                },
                "dependencies": {
                  "azure-arm-containerregistry": "^1.0.0-preview"
                }
            }
            `);

        await testConfigureDocker(projectFolderPath, 'Node.js', '4321');
        let files = await globAsync('**/*', { cwd: projectFolderPath });

        assert(fileContains('Dockerfile', 'EXPOSE 4321'));
        assert(fileContains('Dockerfile', 'CMD node ./out/dockerExtension'));
    });
});
