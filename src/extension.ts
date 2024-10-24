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

    /**
     * Takes a string containing one or more SQL INSERT statements and attempts to
     * convert each one to a MERGE statement.
     *
     * The function will prompt the user to select key columns for the ON condition
     * of each MERGE statement. If the user selects no key columns, the function will
     * skip the current INSERT statement and continue with the next one.
     *
     * If the user selects the "Apply to All" option, the function will use the same
     * key columns for all subsequent INSERT statements.
     *
     * The function will return a string containing all the generated MERGE statements,
     * separated by empty lines. If no valid INSERT statements are found, the function
     * will return the original input string.
     *
     * @param inputText The string containing one or more SQL INSERT statements.
     * @returns A string containing all the generated MERGE statements, separated by
     * empty lines.
     */
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

export function deactivate() {
    console.log('Extension "convertInsertToMerge" is now deactivated!');
}