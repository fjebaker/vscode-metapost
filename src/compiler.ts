import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logChannel } from './extension';

interface BuildOutput {
    err: cp.ExecFileException | null,
    stdout: string
};

async function compileFile(): Promise<void> {

    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const srcDocument = editor.document;
        const srcPath = path.parse(srcDocument.fileName);
        const cwd = vscode.workspace.getWorkspaceFolder(srcDocument.uri)?.uri.fsPath;

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
            srcBase.dir + "/" + "ltx-" + srcBase.name  + ".mpx",
            srcBase.dir + "/" + "ltx-" + srcBase.name  + ".tmp",
        ];

        logChannel.appendLine("Removing files:");
        files.forEach(i => fs.unlink(i, (err) => {
            logChannel.appendLine(` - removed ${i}`);
        }));
    }
}

async function buildFigureFile(wd : string, srcPath : string) : Promise<BuildOutput> {
    return new Promise<BuildOutput>((resolve, reject) => {
        let childProcess = cp.execFile(
            "mpost", 
            ["-interaction", "nonstopmode", srcPath], 
            { cwd: wd }, 
            (err, stdout, stderr) => {
                resolve({
                    err: err,
                    stdout: stdout
                });
            }
        );

    });
}

export { compileFile, cleanDirectory, buildFigureFile, BuildOutput };

