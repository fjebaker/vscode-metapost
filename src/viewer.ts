import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import * as compiler from './compiler';
import { getWebviewContent, updateErrorLog, updateImageUri } from './webview';
import { processContent } from './mpfiles';
import { logChannel } from './extension';

interface FigureInfo {
    wd: string;
    srcFileName: string;
    outPath: string | undefined;
    figNumber : number;
}

interface Previewer {
    panel: vscode.WebviewPanel | undefined;
    srcFile : string | undefined;
    workDir : string;
};

/**
 * Configure event listeners for `on-save` and `on-close`.
 * 
 * @param context 
 */
function configureHooks(p: Previewer, context: vscode.ExtensionContext) : vscode.Disposable {
    const listener : vscode.Disposable = vscode.workspace.onDidSaveTextDocument(async (doc) => {
        logChannel.appendLine("Save detected; reloading preview.");
        const stdErr = await updatePreview(p);
    });
    
    // push subscriber
    context.subscriptions.push(
        listener
    );

    return listener;
}

function makeTempFigureFile(workDir : string) : FigureInfo | undefined {
    const document = vscode.window.activeTextEditor?.document;
    if (document) {

        let content = document.getText();

        content = processContent(content);

        const fileName = path.join(workDir, "preview.mp");
        fs.writeFileSync(
            fileName,
            content
        );

        return {
            wd: workDir,
            srcFileName: "preview.mp",
            outPath: undefined,
            figNumber: 0
        }

    } else {

        logChannel.appendLine("No document open.");

        return undefined;
    }
}

async function updatePreview(p: Previewer) : Promise<string | undefined> {

    // do the build
    const fileInfo : FigureInfo | undefined = makeTempFigureFile(p.workDir);
    if (fileInfo && p.panel) {

        logChannel.appendLine("Updating preview:");

        const buildOut : compiler.BuildOutput = await compiler.buildFigureFile(fileInfo.wd, fileInfo.srcFileName);

        if (! buildOut.err) {
            logChannel.appendLine(` - messaging new image to webview.`);
            updateImageUri(p.panel, path.join(fileInfo.wd, "tmp_fig_0.svg"));
        } else {
            logChannel.appendLine(` - messaging error to webview.`);
            updateErrorLog(p.panel, buildOut.stdout);
        }

    } else {

        logChannel.appendLine("Error making temporary figure file / bad panel!");

        return undefined;
    }
}

function newPreviewer(context : vscode.ExtensionContext ) : Previewer | undefined {

    const workDir = context.storageUri;

    if (workDir) {

        logChannel.appendLine(`Working directory: ${workDir.toString()}.`);

        // create panel
        const panel = vscode.window.createWebviewPanel(
            'metapostPreview',
            'Metapost Preview',
            vscode.ViewColumn.Two,
            {
                // allow loading from temporary directory
                localResourceRoots: [
                    workDir
                ],
                enableScripts: true
            }
        );

        fs.mkdirSync(workDir.fsPath, {recursive: true});

        panel.webview.html = getWebviewContent();

        let previewer : Previewer = {
            panel: panel, 
            srcFile: vscode.window.activeTextEditor?.document.fileName,
            workDir: workDir.fsPath
        };

        let onSave = configureHooks(previewer, context);

        // disposer
        panel.onDidDispose(() => {
            logChannel.appendLine("PANEL DISPOSED");
            onSave.dispose();
        })

        logChannel.appendLine("Preview panel configured.");

        return previewer;

    } else {

        logChannel.appendLine("No working directory assigned.");
        return undefined;
    }
}

export { Previewer, newPreviewer, configureHooks, updatePreview };