import * as vscode from 'vscode';
import * as fs from 'fs'; 

export class WriteLogMgr
{
    private outputChannel;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel("vscode-log-extension");
        this.outputChannel.show();
    }

    logInfo(content: string)
    {
        this.outputChannel.appendLine("[vscode-log-extension][Info] " + content);
    }

    logErr(content: string)
    {
        this.outputChannel.appendLine("[vscode-log-extension][Error] " + content);
    }
}