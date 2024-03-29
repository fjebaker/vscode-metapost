import * as vscode from 'vscode';

function updateImageUri(panel : vscode.WebviewPanel, imagePath : string ) : void {
    
    const onDiskPath = vscode.Uri.file(
        imagePath
    );

    const staticImg = panel.webview.asWebviewUri(onDiskPath);

    panel.webview.postMessage({command: 'image', uri: staticImg.toString()});
}

function updateErrorLog(panel : vscode.WebviewPanel, errlog : string) : void {
    panel.webview.postMessage({command: 'error', content : errlog});
}

function getWebviewContent() : string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Metapost Preview</title>
</head>
<body>
    <div style="text-align: center; padding: 20px; background-color:#FFFFFF;">
        <img id="display" src="" width="800px"/>
    </div>
    <div id="filename"> </div>
    <pre style="width=100%;">
        <code style="width=100%;" id="errorlog"> </code>
    </pre>
    <script>
        // persistence
        const vscode = acquireVsCodeApi();
        const prev_state = vscode.getState();
        const display = document.getElementById('display');
        const filename = document.getElementById('filename');
        const errorLog = document.getElementById('errorlog');
        
        var current_uri = prev_state ? prev_state.current_uri : undefined;
        var current_log = prev_state ? prev_state.current_log : undefined;
        
        let updateImage = () => {
            const timestamp = new Date().getTime();
            display.src = current_uri + "?t=" + timestamp;
            filename.innerHTML = display.src;
        };
        
        let updateError = () => {
            errorLog.innerHTML = current_log;
        }

        let update = () => {
            updateImage();
            updateError();
        }
        
        if (current_uri) {
            updateImage();
        } 
        if (current_log) {
            updateError();
        }
        
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command == 'image') {
                current_log = "";
                current_uri = message.uri;
                update();
            } else if (message.command == 'refresh') {
                update();
            } else if (message.command == 'error') {
                current_log = message.content;
                updateError();
            }
        
            vscode.setState({current_uri, current_log});
        });
    </script>
</body>
</html>`;
}

export { getWebviewContent, updateErrorLog, updateImageUri };