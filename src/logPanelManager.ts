import * as vscode from "vscode";
import { WebviewView } from "vscode";
import {ErrorManager, IErrorInfo} from './errorManager';
import {LogTextDocuments} from './logTextDocument';

interface AnalysisResult {
  info: IErrorInfo[]
}

export class LogPanelManager implements vscode.WebviewViewProvider
{
  private _context;
  _webview?: vscode.WebviewView;
  _doc?: LogTextDocuments;

  errors = new Map<string, AnalysisResult>;

  constructor(private readonly context: vscode.ExtensionContext, errMgr: ErrorManager) {
    this._context = context;
  }

  public registerTextDocument(doc: LogTextDocuments)
  {
    this._doc = doc;
  }

  private geterateErrors(): string
  {
    let content = "";
    if (this.errors !== undefined)
    {
      for (let document of this.errors)
      {
        // Add panel content here
      }
    }
    return content;
  }

  private gotoLog()
  {

  }

  public resolveWebviewView(webviewView: WebviewView)
  {
    this._webview = webviewView;
     webviewView.webview.options = {
         enableScripts: true,
         localResourceRoots : [this._context.extensionUri]
    };

    const errorInfo = this.geterateErrors();

    // Modify base html here
    webviewView.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>Log Result</title>
      </head>
      <body>
        ${errorInfo}
      </body>
    </html>
    `;
  }

  public showData(document: string, errorArray: IErrorInfo[])
  {
    this.errors.set(document, { info: errorArray });
    this.resolveWebviewView(this._webview!);
  }
}