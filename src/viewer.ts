import * as vscode from 'vscode';
import * as path from 'path';

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
        logChannel.appendLine("INFO: save hook called: reloading preview");
        const stdErr = await updatePreview(p);
    });
    
    // push subscriber
    context.subscriptions.push(
        listener
    );

    return listener;
}

async function getPreviewChoice(files: string[]) : Promise<string | undefined> {
    let images = files.filter( i => path.parse(i).ext !== ".log");
    logChannel.appendLine(`INFO: asking for selection for "${images}"`);
    return vscode.window.showQuickPick(
        images,
        {
            placeHolder: "Select a figure to use in the preview.",
        }
    );
}

async function updatePreview(p: Previewer) : Promise<string | undefined> {
    if (!p.panel) {
        logChannel.appendLine("ERROR: making temporary figure file / bad panel");
        return undefined;
    }

    logChannel.appendLine(`INFO: updating preview for "${p.srcFile}"`);
    const buildOut : compiler.BuildOutput = await compiler.buildFigureFile(p.workDir, p.srcFile);

    if (buildOut.err) {
        logChannel.appendLine(`ERROR: build error: log in webview`);
        updateErrorLog(p.panel, buildOut.stdout);
    }
    
    logChannel.appendLine(`INFO: build success: updating webview`);

    if (! p.previewFile) {
        const fileChoice = await getPreviewChoice(buildOut.outputFiles);
        logChannel.appendLine(`INFO: selected "${fileChoice}"`);

        if (! fileChoice) {
            updateErrorLog(p.panel, "Bad file choice for preview. Close this tab and try again.");
            return undefined;
        } else {
            p.previewFile = fileChoice;
        }
    }
    updateImageUri(p.panel, path.join(p.workDir, p.previewFile));
}

function newPreviewer(context : vscode.ExtensionContext ) : Previewer | undefined {
    const srcDoc = vscode.window.activeTextEditor?.document; 
    const cwd = srcDoc ? path.parse(srcDoc.fileName).dir : undefined;

    if (!cwd) {
        logChannel.appendLine("WARN: no working directory assigned");
        return undefined;
    }

    logChannel.appendLine(`INFO: working directory: ${cwd.toString()}`);

    // create panel
    const panel = vscode.window.createWebviewPanel(
        'metapostPreview',
        'Metapost Preview',
        // enable to the right of current panel
        vscode.ViewColumn.Two,
        {
            enableScripts: true
        }
    );

    panel.webview.html = getWebviewContent();

    let srcFileName = srcDoc ? path.parse(srcDoc.fileName).base : "";
    logChannel.append(`DEBUG: srcFileName: "${srcFileName}"`);

    let previewer : Previewer = {
        panel: panel, 
        srcFile: srcFileName,
        workDir: cwd,
        previewFile: undefined
    };
    // configure callback hooks so we update on save etc.
    let onSave = configureHooks(previewer, context);

    // disposer
    panel.onDidDispose(() => {
        logChannel.appendLine("INFO: panel disposed");
        onSave.dispose();
    });
    logChannel.appendLine("INFO: Preview panel configured.");

    return previewer;

}

export { Previewer, newPreviewer, configureHooks, updatePreview };