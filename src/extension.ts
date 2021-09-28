import * as vscode from 'vscode';
import * as compiler from './compiler';
import * as viewer from './viewer';

export const logChannel = vscode.window.createOutputChannel('Metapost');

export function activate(context: vscode.ExtensionContext) {


	context.subscriptions.push(
		logChannel,
		vscode.commands.registerCommand('metapost.run', async () => {
			logChannel.appendLine("> Run");
			await compiler.compileFile();
		}),
		vscode.commands.registerCommand('metapost.cleanDir', () => {
			logChannel.appendLine("> CleanDir");
			compiler.cleanDirectory();
		}),
		vscode.commands.registerCommand('metapost.previewSide', async () => {
			logChannel.appendLine("> PreviewSide");
			let previewer : viewer.Previewer | undefined = viewer.newPreviewer(context);
			if (previewer) {
				await viewer.updatePreview(previewer);
			}
		})
	);

	// logChannel.show();
}

export function deactivate() {

}
