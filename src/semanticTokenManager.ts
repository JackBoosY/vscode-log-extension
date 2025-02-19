import * as vscode from 'vscode';
import { workspace } from 'vscode';
import * as fs from 'fs';
import {WriteLogMgr} from './log';

export class SemanticTokenManager {
    private _extension;
    private _jsonRoot = 'editor';
    private _jsonSubRoot = 'semanticTokenColorCustomizations';

    private _userConfigPath: string;

    private themeMap = new Map<string, number>;

    private tokenTypes = new Map<string, number>();
    private tokenModifiers = new Map<string, number>();

    private _logMgr;

    constructor(extension: vscode.ExtensionContext, logMgr : WriteLogMgr)
    {
        this._extension = extension;
        this._logMgr = logMgr;
        this._userConfigPath = workspace.getConfiguration('loganalysis').get<string>('theme.path')!;

        if (this._userConfigPath === undefined)
        {
            vscode.window.showWarningMessage('Content style config file not found, color will not enabled.');
            return;
        }

        this.getConfiguration();
    }

    getSemanticTokensLegend()
    {
        let tokenTypesLegend = new Array<string>;
        for (let current of this.themeMap)
        {
            tokenTypesLegend.push(current[0]);
        }
        tokenTypesLegend.forEach((tokenType, index) => this.tokenTypes.set(tokenType, index));
    
        const tokenModifiersLegend = new Array<string>;
        tokenModifiersLegend.forEach((tokenModifier, index) => this.tokenModifiers.set(tokenModifier, index));
    
        return new vscode.SemanticTokensLegend(tokenTypesLegend, tokenModifiersLegend);
    }

    private getConfiguration()
    {
        let config;
        try {
            config = fs.readFileSync(this._userConfigPath, {'encoding': 'utf-8'});
        }
        catch (err) {
            this._logMgr.logInfo('Content style config file is empty, color will not enabled.');
            vscode.window.showWarningMessage('Content style config file is empty, color will not enabled.');
            return;
        }

        if (!config.length)
        {
            this._logMgr.logInfo('Content style config file is empty, color will not enabled.');
            vscode.window.showWarningMessage('Content style config file is empty, color will not enabled.');
            return;
        }

        let json = JSON.parse(config);

        // create index map
        let index = 0;
        for (let current in json)
        {
            this.themeMap.set(current, index);
            index++;
        }

        if (this.themeMap.size === 0)
        {
            // set is empty
            return;
        }

        let final = {rules: json as Array<object>};

        this._logMgr.logInfo('Content style config updated.');
        workspace.getConfiguration(this._jsonRoot).update(this._jsonSubRoot, final);
    }

    getTokenType(type: string): number
    {
        let index = this.themeMap.get(type);
        return index !== undefined ? index : 0;
    }

    getTokenModifier(type: string): number
    {
        return 0;
    }
}