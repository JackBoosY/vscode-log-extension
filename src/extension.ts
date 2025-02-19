import * as vscode from 'vscode';
import {LogTextDocuments} from './logTextDocument';
import {LogPanelManager} from './logPanelManager';
import {ErrorManager} from './errorManager';
import {RepoManager} from './repoManager';
import {SemanticTokenManager} from './semanticTokenManager';
import {WriteLogMgr} from './log';

let writelogMgr : WriteLogMgr;
let logDoc : LogTextDocuments;
let logPanel : LogPanelManager;
let errorManager: ErrorManager;
let repoManager: RepoManager;
let semanticTokenManager : SemanticTokenManager;

export function activate(context: vscode.ExtensionContext) {
	writelogMgr = new WriteLogMgr();
	repoManager = new RepoManager(writelogMgr);
	errorManager = new ErrorManager(repoManager, writelogMgr);
	semanticTokenManager = new SemanticTokenManager(context, writelogMgr);
	logPanel = new LogPanelManager(context, errorManager, context.extensionUri, writelogMgr);
	logDoc = new LogTextDocuments(context, errorManager, semanticTokenManager, logPanel, writelogMgr);	

	context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider({ language: 'logextension' }, logDoc, semanticTokenManager.getSemanticTokensLegend()));

	context.subscriptions.push(vscode.window.registerWebviewViewProvider('log-analysis', logPanel));

	vscode.workspace.onDidCloseTextDocument(function(e) {
		logPanel.closeDocument(e.fileName);
		logDoc.removeDocument(e.fileName);
	});
	writelogMgr.logInfo('Register vscode-log-extension success.');
}

export function deactivate() {}
