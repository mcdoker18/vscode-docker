/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';
import * as assertEx from './assertEx';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import * as path from 'path';
import { Platform } from "../configureWorkspace/config-utils";
import { ext } from '../extensionVariables';
import { ITestCallbackContext } from 'mocha';
import { configure } from '../configureWorkspace/configure';
import { TestUserInput } from 'vscode-azureextensionui';
import { globAsync } from '../helpers/async';

suite("configure (Add Docker files to Workspace)", function (this: ITestCallbackContext) {
    this.timeout(60 * 1000);
    let rootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
    // asdf const testFolderPath: string = path.join(rootFolder, `configureTests${randomness.getRandomHexString()}`);
    const outputChannel: vscode.OutputChannel = vscode.window.createOutputChannel('Docker extension tests');
    ext.outputChannel = outputChannel;

    async function testConfigureDocker(platform: Platform, ...inputs: (string | undefined)[]): Promise<void> {
        // Set up simulated user input
        inputs.unshift(platform);
        const ui: TestUserInput = new TestUserInput(inputs);
        ext.ui = ui;

        await configure(rootFolder);
        assert.equal(inputs.length, 0, 'Not all inputs were used.');
    }

    async function writeFile(subfolderName: string, fileName: string, text: string): Promise<void> {
        await fse.ensureDir(path.join(rootFolder, subfolderName));
        await fse.writeFile(path.join(rootFolder, subfolderName, fileName), text);
    }

    function fileContains(fileName: string, text: string): boolean {
        let contents = fse.readFileSync(path.join(rootFolder, fileName)).toString();
        return contents.search(text) >= 0;
    }

    async function getProjectFiles(): Promise<string[]> {
        return await globAsync('**/*', {
            cwd: rootFolder,
            dot: true, // include files beginning with dot
            nodir: true
        });
    }

    function testInEmptyFolder(name: string, func: () => Promise<void>): void {
        test(name, async () => {
            // Delete everything in the root testing folder
            await fse.emptyDir(rootFolder);
            await func();
        });
    }

    suite("Node.js", () => {
        testInEmptyFolder("No package.json", async () => {
            await testConfigureDocker('Node.js', '1234');

            let projectFiles = await getProjectFiles();
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assert(fileContains('Dockerfile', 'EXPOSE 1234'));
            assert(fileContains('Dockerfile', 'CMD npm start'));

            assert(fileContains('docker-compose.debug.yml', '1234:1234'));
            assert(fileContains('docker-compose.debug.yml', '9229:9229'));
            assert(fileContains('docker-compose.debug.yml', 'image: .testoutput'));
            assert(fileContains('docker-compose.debug.yml', 'NODE_ENV: development'));
            assert(fileContains('docker-compose.debug.yml', 'command: node --inspect index.js'));

            assert(fileContains('docker-compose.yml', '1234:1234'));
            assert(!fileContains('docker-compose.yml', '9229:9229'));
            assert(fileContains('docker-compose.yml', 'image: .testoutput'));
            assert(fileContains('docker-compose.yml', 'NODE_ENV: production'));
            assert(!fileContains('docker-compose.yml', 'command: node --inspect index.js'));

            assert(fileContains('.dockerignore', '.vscode'));
        });

        testInEmptyFolder("With start script", async () => {
            await writeFile('', 'package.json',
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

            await testConfigureDocker('Node.js', '4321');

            let projectFiles = await getProjectFiles();
            assertEx.unorderedArraysEqual(projectFiles, ['package.json', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assert(fileContains('Dockerfile', 'EXPOSE 4321'));
            assert(fileContains('Dockerfile', 'CMD npm start'));

            assert(fileContains('docker-compose.debug.yml', '4321:4321'));
            assert(fileContains('docker-compose.debug.yml', '9229:9229'));
            assert(fileContains('docker-compose.debug.yml', 'image: .testoutput'));
            assert(fileContains('docker-compose.debug.yml', 'NODE_ENV: development'));
            assert(fileContains('docker-compose.debug.yml', 'command: node --inspect index.js'));

            assert(fileContains('docker-compose.yml', '4321:4321'));
            assert(!fileContains('docker-compose.yml', '9229:9229'));
            assert(fileContains('docker-compose.yml', 'image: .testoutput'));
            assert(fileContains('docker-compose.yml', 'NODE_ENV: production'));
            assert(!fileContains('docker-compose.yml', 'command: node --inspect index.js'));

            assert(fileContains('.dockerignore', '.vscode'));
        });

        testInEmptyFolder("Without start script", async () => {
            await writeFile('', 'package.json',
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

            await testConfigureDocker('Node.js', '4321');

            let projectFiles = await getProjectFiles();
            assertEx.unorderedArraysEqual(projectFiles, ['package.json', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assert(fileContains('Dockerfile', 'EXPOSE 4321'));
            assert(fileContains('Dockerfile', 'CMD node ./out/dockerExtension'));
        });
    });

    suite("ASP.NET Core", () => {
        // https://github.com/Microsoft/vscode-docker/issues/295
        // testInEmptyFolder("ASP.NET Core no project file", async () => {
        //     await assertEx.throwsOrRejectsAsync(async () => testConfigureDocker('ASP.NET Core', 'Windows', '1234'),
        //         { message: "No .csproj file could be found." }
        //     );
        // });

        testInEmptyFolder("ASP.NET Core with project file, Windows", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder', 'aspnetapp.csproj', `
                <Project Sdk="Microsoft.NET.Sdk.Web">

                <PropertyGroup>
                    <TargetFramework>netcoreapp2.1</TargetFramework>
                    <UserSecretsId>31051026529000467138</UserSecretsId>
                </PropertyGroup>

                <ItemGroup>
                    <PackageReference Include="Microsoft.AspNetCore.App" />
                </ItemGroup>

                </Project>
            `);

            await testConfigureDocker('ASP.NET Core', 'Windows', '1234');

            let projectFiles = await getProjectFiles();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assert(fileContains('Dockerfile', 'EXPOSE 1234'));
            assert(fileContains('DockerFile', 'RUN dotnet build projectFolder/aspnetapp.csproj -c Release -o /app'));
            assert(fileContains('Dockerfile', 'ENTRYPOINT \\["dotnet", "projectFolder/aspnetapp.dll"\\]'));
            assert(fileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:2.0-nanoserver-1709 AS build'));
        });

        testInEmptyFolder("ASP.NET Core with project file, Linux", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder2', 'aspnetapp2.csproj', `
                <Project Sdk="Microsoft.NET.Sdk.Web">

                <PropertyGroup>
                    <TargetFramework>netcoreapp2.1</TargetFramework>
                    <UserSecretsId>31051026529000467138</UserSecretsId>
                </PropertyGroup>

                <ItemGroup>
                    <PackageReference Include="Microsoft.AspNetCore.App" />
                </ItemGroup>

                </Project>
            `);

            await testConfigureDocker('ASP.NET Core', 'Linux', '1234');

            let projectFiles = await getProjectFiles();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder2/aspnetapp2.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assert(fileContains('Dockerfile', 'EXPOSE 1234'));
            assert(fileContains('DockerFile', 'RUN dotnet build projectFolder2/aspnetapp2.csproj -c Release -o /app'));
            assert(fileContains('Dockerfile', 'ENTRYPOINT \\["dotnet", "projectFolder2/aspnetapp2.dll"\\]'));
            assert(fileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:2.0 AS build'));
        });
    });
});
