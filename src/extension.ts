import * as vscode from 'vscode';
import {LogTextDocuments} from './logTextDocument';
import {LogPanelManager} from './logPanelManager';
import {ErrorManager} from './errorManager';
import {RepoManager} from './repoManager';
import {SemanticTokenManager} from './semanticTokenManager';

let logDoc : LogTextDocuments;
let logPanel : LogPanelManager;
let errorManager: ErrorManager;
let repoManager: RepoManager;
let semanticTokenManager : SemanticTokenManager;

export function activate(context: vscode.ExtensionContext) {
	repoManager = new RepoManager;
	errorManager = new ErrorManager(repoManager);
	semanticTokenManager = new SemanticTokenManager();
	logPanel = new LogPanelManager(context, errorManager, context.extensionUri);
	logDoc = new LogTextDocuments(context, errorManager, semanticTokenManager, logPanel);	

	vscode.commands.registerCommand('editor.action.clipboardCutAction', async (arg) => {
		let editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		
		let cursorPosition = editor.selection.start;
		let wordRange = editor.document.getWordRangeAtPosition(cursorPosition);
		if (wordRange !== undefined)
		{
			
			errorManager.openSelectDoc(editor.document.fileName.toString(), wordRange.start.line);
		}
		
	} );

	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'logextension' }, logDoc, semanticTokenManager.getSemanticTokensLegend()));

	context.subscriptions.push(vscode.window.registerWebviewViewProvider('log-analysis', logPanel));
}

export function deactivate() {}
