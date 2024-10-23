import * as vscode from 'vscode';
import { format as formatSQL } from 'sql-formatter';

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "convertInsertToMerge" is now active!');

    let disposable = vscode.commands.registerCommand('extension.convertInsertToMerge', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const text = editor.document.getText(selection);

            console.log('Selected text:', text);

            const mergeStatement = await convertInsertToMerge(text);

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
}

async function convertInsertToMerge(insertStatement: string): Promise<string> {
    console.log('convertInsertToMerge called with:', insertStatement);

    const insertRegex = /INSERT INTO (\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/i;
    const match = insertStatement.match(insertRegex);

    if (!match) {
        vscode.window.showErrorMessage('Selected text is not a valid INSERT statement.');
        console.error('Selected text is not a valid INSERT statement.');
        return insertStatement;
    }

    const tableName = match[1];
    const columns = match[2].split(',').map(col => col.trim());
    const values = match[3].split(',').map(val => val.trim());

    console.log('Parsed table name:', tableName);
    console.log('Parsed columns:', columns);
    console.log('Parsed values:', values);

    const selectedKeys = await vscode.window.showQuickPick(
        columns.map(col => ({ label: col, picked: false })),
        {
            canPickMany: true,
            placeHolder: 'Select columns to use as keys for the condition'
        }
    );

    if (!selectedKeys) {
        console.error('No columns selected');
        return insertStatement;
    }

    const conditions = selectedKeys.map(key => `${key.label} = ${key.label}`).join(' AND ');

    const mergeStatement = `
MERGE INTO ${tableName} USING dual ON (${conditions})
WHEN MATCHED THEN
    UPDATE SET ${columns.map((col, i) => `${col} = ${values[i]}`).join(', ')}
WHEN NOT MATCHED THEN
    INSERT (${columns.join(', ')})
    VALUES (${values.join(', ')});
    `.trim();

    console.log('Generated merge statement before formatting:', mergeStatement);

    try {
        const formattedCode = formatCode(mergeStatement);
        console.log('Formatted merge statement:', formattedCode);
        return formattedCode;
    } catch (error) {
        console.error('Error formatting code:', error);
        return mergeStatement; // Return unformatted code if formatting fails
    }
}

function formatCode(code: string): string {
    console.log('Formatting code');
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