import * as vscode from 'vscode';
import { format as formatSQL } from 'sql-formatter';

async function convertInsertToMerge(inputText: string): Promise<string> {
    console.log('convertInsertToMerge called with:', inputText);

    const insertRegex = /INSERT\s+INTO\s+([\w.\-]+)\s*\(([\s\S]*?)\)\s*VALUES\s*\(([\s\S]*?)\);/gi;
    let match;
    const mergeStatements: string[] = [];

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
            // Show the custom modal dialog
            const selectedKeys = await showCustomModal(columns);
            if (!selectedKeys || selectedKeys.keys.length === 0) { // Accessing length on keys array
                vscode.window.showErrorMessage('No key columns selected for the ON condition.');
                console.error('No key columns selected for the ON condition.');
                continue;
            }

            keyColumns = selectedKeys.keys;
            if (selectedKeys.applyToAll) {
                applyToAll = true;
                sharedKeyColumns = keyColumns;
            }
        }

        // Build the SELECT statement for the USING clause
        const selectStatements = columns.map((col, i) => `${values[i]} AS ${col}`).join(',\n    ');
        const usingClause = `(
            SELECT
                ${selectStatements}
            FROM dual
        ) s`;

        // Build the ON condition using selected key columns
        const onConditions = keyColumns.map(col => `s.${col} = t.${col}`).join('\n    AND ');

        // Build the UPDATE SET clause
        const updateSet = columns.map(col => `t.${col} = s.${col}`).join(',\n    ');

        // Build the INSERT columns and values
        const insertColumns = columns.join(',\n    ');
        const insertValues = columns.map(col => `s.${col}`).join(',\n    ');

        // Construct the full MERGE statement
        const mergeStatement = `
MERGE INTO ${tableName} t
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
    }

    if (mergeStatements.length === 0) {
        vscode.window.showErrorMessage('No valid INSERT statements found.');
        console.error('No valid INSERT statements found.');
        return inputText;
    }

    // Combine all MERGE statements
    const combinedMergeStatements = mergeStatements.join('\n\n');

    return combinedMergeStatements;
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

async function showCustomModal(columns: string[]): Promise<{ keys: string[], applyToAll: boolean } | undefined> {
    const panel = vscode.window.createWebviewPanel(
        'customModal', // Identifies the type of the webview. Used internally
        'Select Key Columns', // Title of the panel displayed to the user
        vscode.ViewColumn.One, // Editor column to show the new webview panel in
        {
            enableScripts: true // Enable scripts in the webview
        }
    );

    panel.webview.html = getWebviewContent(columns);

    return new Promise((resolve) => {
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'submit':
                        resolve({ keys: message.selectedKeys, applyToAll: message.applyToAll });
                        panel.dispose();
                        return;
                    case 'cancel':
                        resolve(undefined);
                        panel.dispose();
                        return;
                }
            },
            undefined,
            []
        );
    });
}

function getWebviewContent(columns: string[]): string {
    const columnCheckboxes = columns.map(col => `
        <div class="checkbox">
            <input type="checkbox" id="${col}" name="${col}" value="${col}">
            <label for="${col}">${col}</label>
        </div>
    `).join('\n');

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Select Key Columns</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 10px;
                }
                .container {
                    display: flex;
                    flex-direction: column;
                }
                .checkbox {
                    margin-bottom: 10px;
                }
                .button {
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Select Key Columns</h2>
                ${columnCheckboxes}
                <div class="checkbox">
                    <input type="checkbox" id="applyToAll" name="applyToAll">
                    <label for="applyToAll">Apply to All</label>
                </div>
                <button class="button" onclick="submitSelection()">Submit</button>
                <button class="button" onclick="cancelSelection()">Cancel</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                function submitSelection() {
                    const selectedKeys = [];
                    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
                        if (checkbox.id !== 'applyToAll') {
                            selectedKeys.push(checkbox.value);
                        }
                    });
                    const applyToAll = document.getElementById('applyToAll').checked;
                    vscode.postMessage({
                        command: 'submit',
                        selectedKeys: selectedKeys,
                        applyToAll: applyToAll
                    });
                }

                function cancelSelection() {
                    vscode.postMessage({
                        command: 'cancel'
                    });
                }
            </script>
        </body>
        </html>
    `;
}

export function deactivate() {
    console.log('Extension "convertInsertToMerge" is now deactivated!');
}