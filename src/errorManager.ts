import * as vscode from 'vscode';
import {RepoManager} from './repoManager';


export interface IErrorFileInfo {
    file: string,
    line: number
}

export interface IErrorInfo {
	line: number,
	start: number,
	content: string,
    code?: IErrorFileInfo
}

interface IErrorContent {
    version: string,
    errors: IErrorInfo[]
}

export class ErrorManager{
    private _errorLogs: Map<string, IErrorContent>;

    private _repoMgr: RepoManager;

    constructor(repoManager: RepoManager)
    {
        this._repoMgr = repoManager;
        this._errorLogs = new Map<string, IErrorContent>();
    }

    async pushLogs(log: string, errors: IErrorInfo[], version: string)
    {
        if (!this._errorLogs.has(log))
        {
            this._errorLogs.set(log, {version: version, errors: errors});
        }
    }

    async openSelectDoc(log: string, line: number)
    {
        let selectFile;
        let selectLine;
        let version;
        let find = false;

        let selectError = this._errorLogs.get(log);
        if (selectError !== undefined)
        {
            for (let currError of selectError.errors)
            {
                if (currError.line === line && currError.code !== undefined)
                {
                    version = selectError.version;
                    selectFile = currError.code?.file;
                    selectLine = currError.code?.line;

                    find = true;
                    break;
                }
            }
        }

        if (find && selectFile)
        {
            // find source file first
            let fileName = selectFile.match(/[^\/]+$/);
            if (fileName === null)
            {
                vscode.window.showErrorMessage('Source file: ' + selectFile + ' not found.');
                return;
            }
            let fileInfo = await this._repoMgr.getLogRoot(fileName[0]);
            if (!fileInfo.file.length)
            {
                vscode.window.showErrorMessage('Source file: ' + selectFile + ' not found.');
                return;
            }

            // reset code to related version
            if (!this._repoMgr.resetToSelectVersion(version? version: "", fileInfo.repo))
            {
                vscode.window.showWarningMessage('Related commit not found, use the current code instead.');
            }

            // open & jump to related line
            let pos = new vscode.Position(selectLine? selectLine - 1 : 0, 0);
            const openPath = vscode.Uri.file(fileInfo.file);

            vscode.workspace.openTextDocument(openPath).then(doc => {
                let editor = vscode.window.activeTextEditor;
                vscode.window.showTextDocument(doc, {selection: new vscode.Range(pos, pos)});
            });
        }
    }

    async jumpToError(file: string, line: number)
    {
        if (file !== undefined && file.length && line !== -1)
        {
            let pos = new vscode.Position(line, 0);
            const openPath = vscode.Uri.file(file);

            await vscode.workspace.openTextDocument(openPath).then(doc => {
                let editor = vscode.window.activeTextEditor;
                vscode.window.showTextDocument(doc, {selection: new vscode.Range(pos, pos)});
            });
        }
    }
}