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
    srcFile : string;
    workDir : string;
    previewFile : string | undefined;
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

async function getPreviewChoice(files: string[]) : Promise<string | undefined> {
    let images = files.filter( i => path.parse(i).ext != ".log");
    const result = await vscode.window.showQuickPick(
        images,
        {
            placeHolder: "Select a figure to use in the preview.",
        }
    );
    return result;
}

async function updatePreview(p: Previewer) : Promise<string | undefined> {

    // do the build
    if (p.panel) {

        logChannel.appendLine("Updating preview:");

        const buildOut : compiler.BuildOutput = await compiler.buildFigureFile(p.workDir, p.srcFile);
        
        if (! buildOut.err) {
            logChannel.appendLine(` - messaging new image to webview.`);

            if (! p.previewFile) {

                const fileChoice = await getPreviewChoice(buildOut.outputFiles);

                if (! fileChoice) {

                    updateErrorLog(p.panel, "Bad file choice for preview. Close this tab and try again.");
                    return undefined;

                } else {
                    p.previewFile = fileChoice;
                }
            }

            updateImageUri(p.panel, path.join(p.workDir, p.previewFile));

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

    const srcDoc = vscode.window.activeTextEditor?.document; 
    const cwd = srcDoc ? path.parse(srcDoc.fileName).dir : undefined;

    if (cwd) {

        logChannel.appendLine(`Working directory: ${cwd.toString()}.`);

        // create panel
        const panel = vscode.window.createWebviewPanel(
            'metapostPreview',
            'Metapost Preview',
            vscode.ViewColumn.Two,
            {
                enableScripts: true
            }
        );


        panel.webview.html = getWebviewContent();

        let srcFileName = srcDoc ? path.parse(srcDoc.fileName).base : "";

        let previewer : Previewer = {
            panel: panel, 
            srcFile: srcFileName,
            workDir: cwd,
            previewFile: undefined
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