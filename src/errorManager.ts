import * as vscode from 'vscode';
import {RepoManager} from './repoManager';
import {WriteLogMgr} from './log';

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
    private _logMgr : WriteLogMgr;

    constructor(repoManager: RepoManager, logMgr : WriteLogMgr)
    {
        this._repoMgr = repoManager;
        this._logMgr = logMgr;
        this._errorLogs = new Map<string, IErrorContent>();
    }

    async pushLogs(log: string, errors: IErrorInfo[], version: string)
    {
        if (!this._errorLogs.has(log))
        {
            this._logMgr.logInfo('adding errors, file: ' + log);
            this._errorLogs.set(log, {version: version, errors: errors});
        }
        else
        {
            this._logMgr.logInfo('log already added, file: ' + log);
        }
    }

    async openSelectDoc(log: string, line: number)
    {
        vscode.window.showInformationMessage('Opening related code file...');
        this._logMgr.logInfo('openSelectDoc related code file ' + log);
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

                    this._logMgr.logInfo('found version info! version: ' + version + ' file: ' + selectFile + ' line: ' + selectLine);
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
                this._logMgr.logErr('Source file: ' + selectFile + ' not found.');
                vscode.window.showErrorMessage('Source file: ' + selectFile + ' not found.');
                return;
            }
            let fileInfo = await this._repoMgr.getLogRoot(fileName[0]);
            if (!fileInfo.file.length)
            {
                this._logMgr.logErr('Source file: ' + selectFile + ' not found.');
                vscode.window.showErrorMessage('Source file: ' + selectFile + ' not found.');
                return;
            }

            // reset code to related version
            if (!this._repoMgr.resetToSelectVersion(version? version: "", fileInfo.repo))
            {
                this._logMgr.logErr('Related commit not found, use the current code instead.');
                vscode.window.showWarningMessage('Related commit not found, use the current code instead.');
            }

            this._logMgr.logInfo('try to open source file...');
            // open & jump to related line
            let pos = new vscode.Position(selectLine? selectLine - 1 : 0, 0);
            const openPath = vscode.Uri.file(fileInfo.file);

            vscode.workspace.openTextDocument(openPath).then(doc => {
                let editor = vscode.window.activeTextEditor;
                this._logMgr.logInfo('openning source file...');
                vscode.window.showTextDocument(doc, {selection: new vscode.Range(pos, pos)});
            });
        }
        else
        {
            this._logMgr.logErr('Related code file was not found.');
            vscode.window.showErrorMessage('Related code file was not found.');
        }
    }

    async jumpToError(file: string, line: number, start: number)
    {
        if (file !== undefined && file.length && line !== -1)
        {
            this._logMgr.logInfo('jump to related error line ' + file);
            let pos = new vscode.Position(line, start !== -1 ? start : 0);
            const openPath = vscode.Uri.file(file);

            await vscode.workspace.openTextDocument(openPath).then(doc => {
                let editor = vscode.window.activeTextEditor;
                vscode.window.showTextDocument(doc, {selection: new vscode.Range(pos, pos)});
            });
        }
        else
        {
            this._logMgr.logErr('jumpToError fail! ' + file + ' not found!');
        }
    }
}