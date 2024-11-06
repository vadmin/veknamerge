import * as vscode from 'vscode';
import { format as formatSQL } from 'sql-formatter';
import fetch from 'node-fetch';
import { GitHubRelease } from './models';

const GITHUB_REPO = 'vadmin/veknamerge';

async function checkForUpdates() {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    const latestRelease = await response.json() as GitHubRelease;
    const latestVersion = latestRelease.tag_name;
    console.log('Latest version on github:', latestVersion);
    const extensionId = 'igorhrustic.veknamerge';
    const currentVersion = vscode.extensions.getExtension(extensionId)?.packageJSON.version;

    if (latestVersion !== currentVersion) {
        const update = await vscode.window.showInformationMessage(
            `A new version (${latestVersion}) of Vekna Merge is available. Do you want to update?`,
            'Yes', 'No'
        );

        if (update === 'Yes') {
            await downloadAndInstallUpdate(latestRelease.assets[0].browser_download_url);
        }
    }
}

async function downloadAndInstallUpdate(downloadUrl: string) {
    const response = await fetch(downloadUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extensionId = 'igorhrustic.veknamerge';
    const currentVersion = vscode.extensions.getExtension(extensionId)?.packageJSON.version;
    console.log('Current veknaMerge version:', currentVersion);
    const extension = vscode.extensions.getExtension(extensionId);
    if (!extension) {
        console.error(`Extension with ID '${extensionId}' not found.`);
        return;
    }

    const extensionPath = vscode.extensions.getExtension(extensionId)?.extensionPath;

    if (extensionPath) {
        const fs = require('fs');
        const path = require('path');
        const updatePath = path.join(extensionPath, 'update.vsix');

        fs.writeFileSync(updatePath, buffer);

        await vscode.commands.executeCommand('workbench.extensions.installExtension', vscode.Uri.file(updatePath));
        vscode.window.showInformationMessage('Vekna Merge has been updated. Please restart VSCode to apply the update.');
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "convertInsertToMerge" is now active!');

    console.log('Checking for updates...');
    checkForUpdates();
    console.log('Checking for updates... Done!');
    const config = vscode.workspace.getConfiguration('veknamerge');
    const targetTableAlias = config.get<string>('targetTableAlias', 't');
    const sourceTableAlias = config.get<string>('sourceTableAlias', 's');
    const commitEvery = config.get<number>('commitEvery', 100);

    let disposable = vscode.commands.registerCommand('extension.convertInsertToMerge', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const text = editor.document.getText(selection);

            console.log('Selected text:', text);

            const { mergeStatement, success } = await convertInsertToMerge(text, targetTableAlias, sourceTableAlias, commitEvery);

            console.log('Generated merge statement:', mergeStatement);

            editor.edit(editBuilder => {
                editBuilder.replace(selection, mergeStatement);
            }).then(success => {
                if (success) {
                    console.log('Text replaced successfully');
                } else {
                    console.error('Failed to replace text');
                }
            });
        } else {
            console.error('No active editor found');
        }
    });

    context.subscriptions.push(disposable);

    // Register the reset settings command
    let resetDisposable = vscode.commands.registerCommand('extension.resetSettings', async () => {
        await config.update('targetTableAlias', 't', vscode.ConfigurationTarget.Global);
        await config.update('sourceTableAlias', 's', vscode.ConfigurationTarget.Global);
        await config.update('commitEvery', 100, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('Vekna Merge settings have been reset to default values.');
    });

    context.subscriptions.push(resetDisposable);
}

async function convertInsertToMerge(inputText: string, targetTableAlias: string, sourceTableAlias: string, commitEvery: number): Promise<{ mergeStatement: string, success: boolean }> {

    console.log("convertInsertToMerge called with:", inputText);

    const insertRegex = /INSERT\s+INTO\s+([\w.\-]+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\);/gi;
    let match;
    const mergeStatements: string[] = [];
    let statementCount = 0;

    let applyToAll = false;
    let sharedKeyColumns: string[] = [];

    while ((match = insertRegex.exec(inputText)) !== null) {
        const tableName = match[1].trim();

        // Extract columns
        const columnsText = match[2];
        const columns = columnsText
            .split(',')
            .map(col => col.replace(/[\r\n]+/g, '').trim());

        // Extract values using the custom parser
        const valuesText = match[3];
        const values = parseValues(valuesText);

        if (columns.length !== values.length) {
            vscode.window.showErrorMessage('Number of columns and values do not match.');
            console.error('Number of columns and values do not match.');
            continue;
        }

        console.log('Parsed table name:', tableName);
        console.log('Parsed columns:', columns);
        console.log('Parsed values:', values);

        let keyColumns: string[] = [];

        if (applyToAll && sharedKeyColumns.length > 0) {
            // Use the shared key columns
            keyColumns = sharedKeyColumns;
        } else {
            // Prompt the user to select key columns
            const quickPick = vscode.window.createQuickPick();
            quickPick.items = columns.map(col => ({ label: col }));
            quickPick.canSelectMany = true;
            quickPick.title = `Click to Apply To All Inserts (circle to the right) >>`;
            quickPick.placeholder = 'Select columns to use as keys for the ON condition';
            quickPick.buttons = [ {
                iconPath: new vscode.ThemeIcon('circle-outline'),
                tooltip: 'Apply to All',
              } ];

            let applyToAllThisTime = false;

            const selections = await new Promise<{ selectedItems: readonly vscode.QuickPickItem[] | undefined, applyToAll: boolean }>((resolve) => {
                quickPick.onDidAccept(() => {
                    resolve({ selectedItems: quickPick.selectedItems, applyToAll: applyToAllThisTime });
                    quickPick.hide();
                });
                quickPick.onDidTriggerButton(() => {
                    applyToAllThisTime = !applyToAllThisTime; // toggle the state
                  
                    if (applyToAllThisTime) {
                      quickPick.title = `Applying To All Inserts (Enabled)`;
                      quickPick.buttons = [
                        {
                          iconPath: new vscode.ThemeIcon('circle-filled'),
                          tooltip: 'Applying To All Inserts (Enabled)'
                        }
                      ];
                    } else {
                      quickPick.title = `Click to Apply To All Inserts (circle to the right) >>`;
                      quickPick.buttons = [
                        {
                          iconPath: new vscode.ThemeIcon('circle-outline'),
                          tooltip: 'Apply to All'
                        }
                      ];
                    }
                  });
                quickPick.onDidHide(() => {
                    resolve({ selectedItems: undefined, applyToAll: applyToAllThisTime });
                });
                quickPick.show();
            });

        
            if (!selections.selectedItems || selections.selectedItems.length === 0) {
                vscode.window.showErrorMessage('No key columns selected for the ON condition.');
                console.error('No key columns selected for the ON condition.');
                continue;
            }

            keyColumns = selections.selectedItems.map(item => item.label);

            if (selections.applyToAll) {
                applyToAll = true;
                sharedKeyColumns = keyColumns;
            }
        }
        // Convert keyColumns to a Set for efficient lookup
        const keyColumnsSet = new Set(keyColumns);
        // Build the SELECT statement for the USING clause
        const selectStatements = columns.map((col, i) => `${values[i]} AS ${col}`).join(',\n    ');
        const usingClause = `(
            SELECT
                ${selectStatements}
            FROM dual
        ) ${sourceTableAlias}`;

        // Build the ON condition using selected key columns
        const onConditions = keyColumns.map(col => `${sourceTableAlias}.${col} = ${targetTableAlias}.${col}`).join('\n    AND ');

        // Build the UPDATE SET clause
        // Filter out key columns for the UPDATE SET clause
        const updateColumns = columns.filter(col => !keyColumnsSet.has(col));
        const updateSet = updateColumns.map(col => `${targetTableAlias}.${col} = ${sourceTableAlias}.${col}`).join(',\n    ');

        // Build the INSERT columns and values
        const insertColumns = columns.join(',\n    ');
        const insertValues = columns.map(col => `${sourceTableAlias}.${col}`).join(',\n    ');

        // Construct the full MERGE statement
        const mergeStatement = `
MERGE INTO ${tableName} ${targetTableAlias}
USING ${usingClause}
ON (
    ${onConditions}
)
WHEN MATCHED THEN
    UPDATE SET
        ${updateSet}
WHEN NOT MATCHED THEN
    INSERT (
        ${insertColumns}
    )
    VALUES (
        ${insertValues}
    );
`.trim();

        console.log('Generated merge statement before formatting:', mergeStatement);

        try {
            const formattedCode = formatCode(mergeStatement);
            console.log('Formatted merge statement:', formattedCode);
            mergeStatements.push(formattedCode);
        } catch (error) {
            console.error('Error formatting code:', error);
            mergeStatements.push(mergeStatement);
        }
        // Increment the statement count, and add a commit statement every 'commitEvery' statements
        statementCount++;
        if (statementCount % commitEvery === 0) {
            mergeStatements.push('COMMIT;');
        }
    }

    if (mergeStatements.length === 0) {
        vscode.window.showErrorMessage('No valid INSERT statements found.');
        console.error('No valid INSERT statements found.');
        return { mergeStatement: '', success: false };
    }
    // If we finished on a non-commit statement, add a commit
    if (statementCount % commitEvery !== 0) {
        mergeStatements.push('COMMIT;');
    }
    // Combine all MERGE statements
    const combinedMergeStatements = mergeStatements.join('\n\n');
    return { mergeStatement: combinedMergeStatements, success: true };
}

// Function to parse the values considering commas within strings and parentheses
function parseValues(valuesText: string): string[] {
    const values: string[] = [];
    let currentToken = '';
    let inSingleQuote = false;
    let parenDepth = 0;

    for (let i = 0; i < valuesText.length; i++) {
        const char = valuesText[i];

        if (char === "'") {
            currentToken += char;
            if (valuesText[i - 1] !== '\\') {
                inSingleQuote = !inSingleQuote;
            }
        } else if (!inSingleQuote) {
            if (char === '(') {
                parenDepth++;
                currentToken += char;
            } else if (char === ')') {
                parenDepth--;
                currentToken += char;
            } else if (char === ',' && parenDepth === 0) {
                values.push(currentToken.trim());
                currentToken = '';
            } else {
                currentToken += char;
            }
        } else {
            currentToken += char;
        }
    }

    if (currentToken.length > 0) {
        values.push(currentToken.trim());
    }

    return values;
}

function formatCode(code: string): string {
    try {
        return formatSQL(code);
    } catch (error) {
        console.error('SQL Formatter error:', error);
        throw error;
    }
}

export function deactivate() {
    console.log('Extension "convertInsertToMerge" is now deactivated!');
}