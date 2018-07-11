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
import { Suite } from 'mocha';
import { configure } from '../configureWorkspace/configure';
import { TestUserInput } from 'vscode-azureextensionui';
import { globAsync } from '../helpers/async';

suite("configure (Add Docker files to Workspace)", function (this: Suite): void {
    this.timeout(60 * 1000);
    let rootFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
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
        return contents.indexOf(text) >= 0;
    }

    function assertFileContains(fileName: string, text: string): void {
        assert(fileContains(fileName, text), `Expected to find '${text}' in file ${fileName}`);
    }

    function assertNotFileContains(fileName: string, text: string): void {
        assert(!fileContains(fileName, text), `Unexpected found '${text}' in file ${fileName}`);
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

    // Node.js

    suite("Node.js", () => {
        testInEmptyFolder("No package.json", async () => {
            await testConfigureDocker('Node.js', '1234');

            let projectFiles = await getProjectFiles();
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('Dockerfile', 'CMD npm start');

            assertFileContains('docker-compose.debug.yml', '1234:1234');
            assertFileContains('docker-compose.debug.yml', '9229:9229');
            assertFileContains('docker-compose.debug.yml', 'image: .testoutput');
            assertFileContains('docker-compose.debug.yml', 'NODE_ENV: development');
            assertFileContains('docker-compose.debug.yml', 'command: node --inspect index.js');

            assertFileContains('docker-compose.yml', '1234:1234');
            assertNotFileContains('docker-compose.yml', '9229:9229');
            assertFileContains('docker-compose.yml', 'image: .testoutput');
            assertFileContains('docker-compose.yml', 'NODE_ENV: production');
            assertNotFileContains('docker-compose.yml', 'command: node --inspect index.js');

            assertFileContains('.dockerignore', '.vscode');
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

            assertFileContains('Dockerfile', 'EXPOSE 4321');
            assertFileContains('Dockerfile', 'CMD npm start');

            assertFileContains('docker-compose.debug.yml', '4321:4321');
            assertFileContains('docker-compose.debug.yml', '9229:9229');
            assertFileContains('docker-compose.debug.yml', 'image: .testoutput');
            assertFileContains('docker-compose.debug.yml', 'NODE_ENV: development');
            assertFileContains('docker-compose.debug.yml', 'command: node --inspect index.js');

            assertFileContains('docker-compose.yml', '4321:4321');
            assertNotFileContains('docker-compose.yml', '9229:9229');
            assertFileContains('docker-compose.yml', 'image: .testoutput');
            assertFileContains('docker-compose.yml', 'NODE_ENV: production');
            assertNotFileContains('docker-compose.yml', 'command: node --inspect index.js');

            assertFileContains('.dockerignore', '.vscode');
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

            assertFileContains('Dockerfile', 'EXPOSE 4321');
            assertFileContains('Dockerfile', 'CMD node ./out/dockerExtension');
        });
    });

    // .NET Core Console

    suite(".NET Core Console", () => {
        const projectFile = `
        <Project Sdk="Microsoft.NET.Sdk" ToolsVersion="15.0">

            <PropertyGroup>
            <OutputType>Exe</OutputType>
            <TargetFramework>netcoreapp2.1</TargetFramework>
            </PropertyGroup>

            <ItemGroup>
            <ProjectReference Include="..\\utils\\utils.csproj" />
            </ItemGroup>

        </Project>
        `;

        // https://github.com/Microsoft/vscode-docker/issues/295
        // testInEmptyFolder("No project file", async () => {
        //     await assertEx.throwsOrRejectsAsync(async () => testConfigureDocker('.NET Core Console', 'Windows', '1234'),
        //         { message: "No .csproj file could be found." }
        //     );
        // });

        testInEmptyFolder("Windows", async () => {
            await writeFile('projectFolder', 'aspnetapp.csproj', projectFile);

            await testConfigureDocker('.NET Core Console', 'Windows', '1234');

            let projectFiles = await getProjectFiles();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertNotFileContains('Dockerfile', 'EXPOSE');
            assertFileContains('DockerFile', 'RUN dotnet build projectFolder/aspnetapp.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder/aspnetapp.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-runtime-nanoserver-1709 AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-sdk-nanoserver-1709 AS build');
        });

        testInEmptyFolder("Linux", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder2', 'aspnetapp2.csproj', projectFile);

            await testConfigureDocker('.NET Core Console', 'Linux', '1234');

            let projectFiles = await getProjectFiles();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder2/aspnetapp2.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertNotFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('DockerFile', 'RUN dotnet build projectFolder2/aspnetapp2.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder2/aspnetapp2.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-runtime AS base');
            assertFileContains('Dockerfile', 'FROM microsoft/dotnet:2.0-sdk AS build');
        });
    });

    // ASP.NET Core

    suite("ASP.NET Core", () => {
        const projectFile = `
        <Project Sdk="Microsoft.NET.Sdk.Web">

        <PropertyGroup>
            <TargetFramework>netcoreapp2.1</TargetFramework>
        </PropertyGroup>

        <ItemGroup>
            <PackageReference Include="Microsoft.AspNetCore.App" />
        </ItemGroup>

        </Project>
        `;

        // https://github.com/Microsoft/vscode-docker/issues/295
        // testInEmptyFolder("ASP.NET Core no project file", async () => {
        //     await assertEx.throwsOrRejectsAsync(async () => testConfigureDocker('ASP.NET Core', 'Windows', '1234'),
        //         { message: "No .csproj file could be found." }
        //     );
        // });

        testInEmptyFolder("Windows", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder', 'aspnetapp.csproj', projectFile);

            await testConfigureDocker('ASP.NET Core', 'Windows', undefined /*use default port*/);

            let projectFiles = await getProjectFiles();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder/aspnetapp.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 80');
            assertFileContains('DockerFile', 'RUN dotnet build projectFolder/aspnetapp.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder/aspnetapp.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:2.0-nanoserver-1709 AS build');
        });

        testInEmptyFolder("Linux", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('projectFolder2', 'aspnetapp2.csproj', projectFile);

            await testConfigureDocker('ASP.NET Core', 'Linux', '1234');

            let projectFiles = await getProjectFiles();

            // No docker-compose files
            assertEx.unorderedArraysEqual(projectFiles, ['Dockerfile', '.dockerignore', 'projectFolder2/aspnetapp2.csproj'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 1234');
            assertFileContains('DockerFile', 'RUN dotnet build projectFolder2/aspnetapp2.csproj -c Release -o /app');
            assertFileContains('Dockerfile', 'ENTRYPOINT ["dotnet", "projectFolder2/aspnetapp2.dll"]');
            assertFileContains('Dockerfile', 'FROM microsoft/aspnetcore-build:2.0 AS build');
        });

    });

    // Java

    suite("Java", () => {
        // https://github.com/Microsoft/vscode-docker/issues/295
        // testInEmptyFolder("No pom file", async () => {
        //     await assertEx.throwsOrRejectsAsync(async () => testConfigureDocker('Java', '1234'),
        //         { message: "No .csproj file could be found." }
        //     );
        // });

        testInEmptyFolder("Pom file", async () => {
            // https://github.com/dotnet/dotnet-docker/tree/master/samples/aspnetapp
            await writeFile('', 'pom.xml', `
                <?xml version = "1.0" encoding = "UTF-8"?>
                    <project xmlns="http://maven.apache.org/POM/4.0.0"
                        xmlns:xsi = "http://www.w3.org/2001/XMLSchema-instance"
                        xsi:schemaLocation = "http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
                    <modelVersion>4.0.0</modelVersion>

                    <groupId>com.microsoft.azure</groupId>
                    <artifactId>app-artifact-id</artifactId>
                    <version>1.0-BETA</version>
                    <packaging>jar</packaging>

                    <name>app-on-azure</name>
                    <description>Test</description>
                    </project>
                `);

            await testConfigureDocker('Java', undefined /*port*/);

            let projectFiles = await getProjectFiles();
            assertEx.unorderedArraysEqual(projectFiles, ['pom.xml', 'Dockerfile', 'docker-compose.debug.yml', 'docker-compose.yml', '.dockerignore'], "The set of files in the project folder after configure was run is not correct.");

            assertFileContains('Dockerfile', 'EXPOSE 3000');
            assertFileContains('DockerFile', 'ARG JAVA_OPTS');
            assertFileContains('Dockerfile', 'ADD target/app-artifact-id-1.0-BETA.jar .testoutput.jar');
            assertFileContains('Dockerfile', 'ENTRYPOINT exec java $JAVA_OPTS -jar .testoutput.jar');
        });

    });
});
