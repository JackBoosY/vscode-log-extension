import * as vscode from 'vscode';
import { workspace } from 'vscode';
import * as fs from 'fs';
import {ErrorManager, IErrorInfo} from './errorManager';
import {SemanticTokenManager} from './semanticTokenManager';
import {LogPanelManager} from './logPanelManager';

interface IParsedToken {
	line: number;
	startCharacter: number;
	length: number;
	tokenType: number;
	tokenModifiers: number;
}

interface ParsedResult {
	token: IParsedToken[]
}

interface RegexUnit {
	regex: RegExp,
	char: string,
	offset: number,
	tilEnd: boolean,
	theme: string
}

export class LogTextDocuments implements vscode.DocumentSemanticTokensProvider {
    private _userConfigPath: string;

	private regexHighlightMap = new Map<string, RegexUnit>;
	private regexPanelMap = new Array<string>;
	private regexJumpMap = new Array<string>;

	private _hightLight = 'highlight';
	private _panel = 'panel';
	private _jump = 'jump';

	private version : string;

    private _showTip: string[] = [];

    private _errorLogs: IErrorInfo[] = [];
    private _errMgr;
	private _sematicMgr;
	private _panelMgr;

    constructor(private readonly context: vscode.ExtensionContext, errMgr: ErrorManager, sematicMgr: SemanticTokenManager, panelMgr: LogPanelManager)
    {
        this._errMgr = errMgr;
		this._sematicMgr = sematicMgr;
		this._panelMgr = panelMgr;

		this.version = "0.0.0"; // change default verion here.

        this._userConfigPath = workspace.getConfiguration('loganalysis').get<string>('regex.path')!;
		if (this._userConfigPath === undefined || !this._userConfigPath.length)
		{
			vscode.window.showErrorMessage('Regex config file not set, disable analysis config');
			return;
		}
		this.loadConfiguration();
    }

    private regexContent(content: string, regex: RegExp, regexChar: string, offset: number = 0) : string
    {
        let matchedLine = content.match(regex);
        if (matchedLine !== null)
        {
			if (regexChar.length)
			{
				return matchedLine[0].substring(regexChar.length, matchedLine[0].length - offset);
			}
			else
			{
				return matchedLine[0];
			}
        }
        else{
            return "";
        }
    }


	async provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): Promise<vscode.SemanticTokens> {
		const result = this._parseText(document.getText());
		const builder = new vscode.SemanticTokensBuilder();
		result.token.forEach((token) => {
			builder.push(token.line, token.startCharacter, token.length, token.tokenType, token.tokenModifiers);
		});
        
		// one single log may parse twice, don't know why.
		if (this._showTip.indexOf(document.fileName) === -1)
		{
			this._showTip.push(document.fileName);

			this._errMgr.pushLogs(document.fileName, this._errorLogs, this.version);

			this._panelMgr.showData(document.fileName, this._errorLogs);
		}

		return builder.build();
	}

	private _encodeTokenType(tokenType: string): number {
		return this._sematicMgr.getTokenType(tokenType)!;
	}

	private loadConfiguration()
	{
        let config;
		
		try {
			config = fs.readFileSync(this._userConfigPath, {'encoding': 'utf-8'});
		}
		catch (err) {
			vscode.window.showErrorMessage('Regex config file not found, disable analysis config');
			return;
		}
        if (!config.length)
        {
            vscode.window.showWarningMessage('Content style config file is empty, color will not enabled.');
            return;
        }

        let json = JSON.parse(config);

        // create index map
        for (let current in json)
        {
			if (current === this._hightLight)
			{
				for (let unit in json[current])
				{
					let regex: string;
					let char: string;
					let offset: number;
					let tilEnd: boolean;
					let theme: string;
	
					if (json[current][unit].regex !== undefined)
					{
						regex = json[current][unit].regex;
					}
					if (json[current][unit].char !== undefined)
					{
						char = json[current][unit].char;
					}
					if (json[current][unit].offset !== undefined)
					{
						offset = json[current][unit].offset;
					}
					if (json[current][unit].tilEnd !== undefined)
					{
						tilEnd = json[current][unit].tilEnd;
					}
					if (json[current][unit].theme !== undefined)
					{
						theme = json[current][unit].theme;
					}

					if ((regex! === undefined || theme! === undefined))
					{
						vscode.window.showErrorMessage('Unrecognized regex config: missing regex or theme! Please check!');
						continue;
					}

					this.regexHighlightMap.set(unit,
						{regex: RegExp(regex), char: char!, offset: offset!, tilEnd: tilEnd!, theme: theme});
				}
	
			}
        }

        if (this.regexHighlightMap.size === 0)
        {
            // set is empty
            return;
        }

		// match panel items
		if (json[this._panel] !== undefined)
		{
			for (let current in json[this._panel])
			{
				if (this.regexHighlightMap.has(json[this._panel][current]))
				{
					this.regexPanelMap.push(json[this._panel][current]);
				}
			}
		}

		// match jump code items
		if (json[this._jump] !== undefined)
		{
			for (let current in json[this._jump])
			{
				if (this.regexHighlightMap.has(json[this._jump][current]))
				{
					this.regexJumpMap.push(json[this._jump][current]);
				}
			}
		}
	}

	private _parseText(text: string): ParsedResult
	{
		const r: IParsedToken[] = [];
		const lines = text.split(/\r\n|\r|\n/);

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			let matched;

			for (let willMatch of this.regexHighlightMap)
			{
				matched = this.regexContent(line, willMatch[1].regex, (willMatch[1].char !== undefined ? willMatch[1].char: ''), willMatch[1].offset);
				if (matched.length)
				{
					let start = line.indexOf(matched);
					let showLength;
					if (willMatch[1].tilEnd)
					{
						showLength = line.length;
					}
					else
					{
						showLength = matched.length;
					}

					// You may need to save version here
					this.version;
					
					r.push({
						line: i,
						startCharacter: start,
						length: showLength,
						tokenType: this._encodeTokenType(willMatch[1].theme),
						tokenModifiers: 0
					});

					// !!!You may need to modify the match logic here!!!
					// first, match the general error line 
					if (this.regexPanelMap.findIndex(value => (willMatch[0] === value)) !== -1)
					{
						if (this.regexJumpMap.findIndex(value => (willMatch[0] === value)) !== -1)
						{
							// second, determine if it is refer to source file
							let matchedFileLine = this.regexContent(line, willMatch[1].regex, '');
							if (matchedFileLine)
							{
								// third, match the corresponding source code file line number 
								let machedLine = this.regexContent(matchedFileLine, /:\d{1,}/, ':');
								let lineNum : number = 0;
								if (machedLine)
								{
									matchedFileLine = matchedFileLine.substring(0, matchedFileLine.length - 1 - machedLine.length);
									lineNum = parseInt(machedLine);

									this._errorLogs.push({
										line: i,
										start: start,
										content: line.substring(start, line.length),
										code: {file: matchedFileLine, line: lineNum}
									});
								}
							}
						}
						else
						{
							// source file text not found, it's a general error printed by somewhere
							this._errorLogs.push({
								line: i,
								start: start,
								content: line.substring(start, line.length)
							});
						}
					}
				}
			}
		}

		return {token: r};
	}
}