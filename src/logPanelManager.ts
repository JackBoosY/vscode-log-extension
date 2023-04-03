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
  _uri: vscode.Uri;
  _errMgr: ErrorManager;

  errors = new Map<string, AnalysisResult>;

  constructor(private readonly context: vscode.ExtensionContext, errMgr: ErrorManager, extensionUri: vscode.Uri) {
    this._context = context;
    this._uri = extensionUri;
    this._errMgr = errMgr;
  }

  public registerTextDocument(doc: LogTextDocuments)
  {
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
      }
    }
    return content;
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

  public showData(document: string, errorArray: IErrorInfo[])
  {
    if (!this.errors.has(document))
    {
      this.errors.set(document, { info: errorArray });
    }
    this.resolveWebviewView(this._webview!);
  }

  private setWebViewMessageListener(webviewview: WebviewView)
  {
    webviewview.webview.onDidReceiveMessage((message) => {
      this._errMgr.jumpToError(message.file, parseInt(message.line));
    });
  }
}