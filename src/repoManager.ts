import * as vscode from 'vscode';
import { workspace, ProcessExecution } from "vscode";
import * as fs from 'fs';
import * as path from 'path';
import * as proc from 'child_process';
import {WriteLogMgr} from './log';

export interface IFoundFileInfo {
    file: string,
    repo: string
}

export class RepoManager{
    private _repoPath: Map<string, string>;

    private _logMgr : WriteLogMgr;
    
    constructor(logMgr : WriteLogMgr)
    {
        this._logMgr = logMgr;
        // Read repo path here
        this._repoPath = new Map<string, string>;
    }

    private static findFileOnRepo(filePath: string, matched: string): string {
        let fileList : string = "";
        const files = fs.readdirSync(filePath);
        for (let filename of files) 
        {
            if (filename === '.git')
            {
                continue;
            }
            const filepath = path.join(filePath, filename);
            const stats = fs.statSync(filepath);
            const isFile = stats.isFile();
            const isDir = stats.isDirectory();
            if (isFile && filename === matched) {
                return filepath;
            }
            else if (isDir) {
                fileList = RepoManager.findFileOnRepo(filepath, matched);
                if (fileList.length)
                {
                    break;
                }
            }
        };

        return fileList;
    }

    async resetToSelectVersion(version: string, repo: string) : Promise<boolean>
    {
        this._logMgr.logInfo('Trying to reset code: ' + repo + ' to version: ' + version);
        // pull code to the latest to get new tags and new branches
        const result = this.runCommand('git', 'pull ', repo);
        if ((await result).indexOf('up to date') === -1)
        {
            this._logMgr.logErr('cannot update repo to latest!');
            return false;
        }

        const commitId = this.getCommitId(repo, version);
        new vscode.ProcessExecution('git', ['tag'], {cwd: repo});

        if ((await commitId).length)
        {
            const result = this.runCommand('git', 'checkout ' + (await commitId).toString(), repo);
            if ((await result).indexOf('HEAD is now at ') === -1)
            {
                this._logMgr.logErr('tag is not found!');
                return false;
            }
            this._logMgr.logInfo('tag found!');
            return true;
        }
        else
        {
            return false;
        }
    }

    async getLogRoot(file: string): Promise<IFoundFileInfo>
    {
        this._logMgr.logInfo('Trying to get error related repo.');
        let fileInfo: IFoundFileInfo = {file: '', repo: ''};
        for (let repo of this._repoPath)
        {
            let currPath = repo[1];
            
            if (currPath)
            {
                if (file === null)
                {
                    break;
                }
                fileInfo.file = RepoManager.findFileOnRepo(currPath, file.toString());
                fileInfo.repo = repo[1];

                if (fileInfo.file.length)
                {
                    this._logMgr.logErr('Error related repo found.');
                    break;
                }
            }
        }

        return fileInfo;
    }

    private async runCommand(command: string, param: string, executeRoot: string): Promise<string>
    {
        try {
            this._logMgr.logInfo('Running command: ' + command + ' ' + param + ' on ' + executeRoot);
            return await proc.execSync(command + ' ' + param, {cwd: executeRoot, encoding: 'utf-8'});
        }
        catch (error) {
            this._logMgr.logInfo('Run command: ' + command + ' ' + param + ' on ' + executeRoot + ' failed!');
            return "";
        }
    }

    private async getCommitId(repoPath: string, version: string): Promise<string>
    {
        this._logMgr.logInfo('Getting version-product tag with repo: ' + repoPath);
        // try to find version-product
        let maybeTag = await this.runCommand('git', 'tag -l ' + version, repoPath);

        if (!maybeTag.length)
        {
            this._logMgr.logInfo('Tag not found, trying to version only tag');
            // try to find version
            maybeTag = await this.runCommand('git', 'tag -l ' + version, repoPath);
            if (!maybeTag.length)
            {
                this._logMgr.logErr('All tag not found.');
                return "";
            }
        }

        this._logMgr.logInfo('Tag found: ' + maybeTag);
        maybeTag = maybeTag.replace('\n', '');
        return maybeTag;
    }
}