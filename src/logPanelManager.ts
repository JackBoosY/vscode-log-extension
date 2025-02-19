import * as vscode from "vscode";
import { CancellationToken, WebviewView, WebviewViewResolveContext } from "vscode";
import {ErrorManager, IErrorInfo} from './errorManager';
import {LogTextDocuments} from './logTextDocument';
import {WriteLogMgr} from './log';

interface AnalysisResult {
  info: IErrorInfo[]
}

export class LogPanelManager implements vscode.WebviewViewProvider
{
  private _context;
  private _webview?: vscode.WebviewView;
  private _doc?: LogTextDocuments;
  private _uri: vscode.Uri;
  private _errMgr: ErrorManager;
  private _logMgr : WriteLogMgr;

  private errors = new Map<string, AnalysisResult>;
  private hiddens = new Map<string, number>;

  constructor(private readonly context: vscode.ExtensionContext, errMgr: ErrorManager, extensionUri: vscode.Uri, logMgr: WriteLogMgr) {
    this._context = context;
    this._uri = extensionUri;
    this._errMgr = errMgr;
    this._logMgr = logMgr;
  }

  public registerTextDocument(doc: LogTextDocuments)
  {
    this._logMgr.logInfo('registerTextDocument.');
    this._doc = doc;
  }

  private htmlEncodeByRegExp(str: string): string
  {  
    var s = "";
    if(str.length === 0)
    {
      return "";
    }
    s = str.replace(/&/g,"&amp;");
    s = s.replace(/</g,"&lt;");
    s = s.replace(/>/g,"&gt;");
    s = s.replace(/ /g,"&nbsp;");
    s = s.replace(/\'/g,"&#39;");
    s = s.replace(/\"/g,"&quot;");
    return s;  
  }

  private geterateErrors(): string
  {
    let content = "";
    if (this.errors !== undefined)
    {
      for (let document of this.errors)
      {
        content += `<p><b><font color="yellow" size="4">`;
        content += document[0];
        content += `</font></b></p><p><b><font color="blue" size="4">`;
        content += " error:";
        content += `</font></b></p>`;
        
        for (let error of document[1].info)
        {
          let subContent = "";
          subContent += `<p><b><font color=\"red\" size=\"2\"><div onclick="referTo(this)" line="`;
          subContent += error.line.toString();
          subContent += `" log="`;
          subContent += document[0];
          subContent +=`">`;
          subContent += this.htmlEncodeByRegExp(error.content);
          subContent += `</div></font></b></p>`;

          content += subContent;
        }

        content += `</font></b></p><p><b><font color="blue" size="4">`;
        content += " Hidden error:";
        content += `</font></b></p>`;
        for (let hidden of this.hiddens) {
          let subContent = "";
          subContent += `<p><b><font color=\"red\" size=\"2\">`;
          subContent += hidden[0];
          subContent += `</b><br>`;
          subContent += `<b><font color=\"red\" size=\"2\">Count: `;
          subContent += hidden[1];
          subContent += `</b></p>`;
          content += subContent;
        }
        content += `<br>`;
      }
    }
    return content;
  }

  public resolveWebviewView(webviewView: WebviewView)
  {
    this._logMgr.logInfo('resolveWebviewView.');
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
      <script type="text/javascript">
      const vscode = acquireVsCodeApi();
      function referTo(obj) {
        vscode.postMessage({ file: obj.getAttribute("log"), line: obj.getAttribute("line")});
      }
      </script>
    </html>
    `;

    this.setWebViewMessageListener(this._webview);
  }

  public closeDocument(document: string)
  {
    if (this.errors.has(document))
    {
      this._logMgr.logInfo('close document: ' + document + ' and update panel');
      this.errors.delete(document);

      this.resolveWebviewView(this._webview!);
    }
  }

  public showData(document: string, errorArray: IErrorInfo[], hiddenArray: Map<string, number>)
  {
    this._logMgr.logInfo('update panel by adding error of: ' + document);
    if (!this.errors.has(document))
    {
      this._logMgr.logInfo('data is new, add now.');
      this.errors.set(document, { info: errorArray });
      this.hiddens = hiddenArray;
    }
    this.resolveWebviewView(this._webview!);
  }

  private setWebViewMessageListener(webviewview: WebviewView)
  {
    webviewview.webview.onDidReceiveMessage((message) => {
      this._logMgr.logInfo('Jump to related log ' + message.file + ' line: ' + message.line + ' start pos: ' + message.start);
      this._errMgr.jumpToError(message.file, parseInt(message.line), parseInt(message.start));
    });
  }
}