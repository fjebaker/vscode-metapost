import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logChannel } from './extension';

interface BuildOutput {
    err: cp.ExecFileException | null,
    stdout: string,
    outputFiles: string[]
};

async function compileFile(): Promise<void> {

    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const srcDocument = editor.document;
        const srcPath = path.parse(srcDocument.fileName);
        const cwd = srcPath.dir;

        if (cwd) {
            await buildFigureFile(cwd, srcPath.base);
        } else {
            logChannel.appendLine("Could not determine local directory for build.");
        }
        
    } else {
        logChannel.appendLine("No text document.");
    }
}

function cleanDirectory(): void {
    const srcDocument = vscode.window.activeTextEditor?.document;
    if (srcDocument) {
        const srcBase = path.parse(srcDocument.fileName);
        // build list of files to delete
        let files: string[] = [
            srcBase.dir + "/" + srcBase.name + ".log", 
            srcBase.dir + "/" + srcBase.name  + ".mpx", 
            srcBase.dir + "/" + srcBase.name  + ".fls", 
            srcBase.dir + "/" + "ltx-" + srcBase.name  + ".mpx",
            srcBase.dir + "/" + "ltx-" + srcBase.name  + ".tmp",
        ];

        logChannel.appendLine("Removing files:");
        files.forEach(i => fs.unlink(i, (err) => {
            logChannel.appendLine(` - removed ${i}`);
        }));
    }
}

async function extractOutputFiles(wd : string, output: string) : Promise<string[]> {
    const content : string = fs.readFileSync(
        path.join(wd, path.parse(output).name + ".fls")
    ).toString();

    return new Promise<string[]>((resolve, reject) => {
        const flsPath = path.join(wd, path.parse(output).name + ".fls");
        logChannel.appendLine(`Reading file list from ${flsPath}.`);
        fs.readFile(flsPath, (err, data) => {
            const content = data.toString();
            const matches = content.match(/OUTPUT (\w+.\w+)/g);

            if (matches) {
                resolve(
                    matches.map(i => i.replace(/^OUTPUT /, ""))
                );
            } else {
                resolve([]);
            }
        });
    });
}

async function buildFigureFile(wd : string, srcName : string) : Promise<BuildOutput> {
    logChannel.appendLine(`INFO: building "${srcName}" in "${wd}""`);
    return new Promise<BuildOutput>((resolve, reject) => {
        let childProcess = cp.execFile(
            "mpost", 
            ["-recorder", "-interaction", "nonstopmode", srcName], 
            { cwd: wd }, 
            (err, stdout, stderr) => {
                extractOutputFiles(wd, srcName).then((files: string[]) => {
                    logChannel.appendLine(`INFO: output files read: ${files}`);
                    resolve({
                        err: err,
                        stdout: stdout,
                        outputFiles: files,
                    });
                });
            }
        );

    });
}

export { compileFile, cleanDirectory, buildFigureFile, extractOutputFiles, BuildOutput };

