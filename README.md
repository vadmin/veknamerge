### VeknaMerge

Initial release of the extension Vekna Merge.


## Description

Vekna Merge is a Visual Studio Code extension that converts SQL INSERT statements into MERGE statements for Oracle databases. 
This extension is particularly useful for developers who need to transform multiple INSERT statements into MERGE statements for data synchronization tasks.

## Features

- Converts selected SQL `INSERT` statements into `MERGE` statements.
- Automatically add key columns to the `ON` condition.
- Automatically add the same key columns to all subsequent `INSERT` statements.
- Automatically insert `COMMIT;` statements after a specified number of `MERGE` statements.

## Usage

1. Highlight the `INSERT` statement(s) you want to convert.
2. Right-click and select `Convert to MERGE` from the context menu.
3. Select the key columns for the `ON` condition.
4. Click `Apply to all INSERT` to apply the same key columns to all subsequent `INSERT` statements.
5. Click `Insert COMMIT` to insert a `COMMIT;` statement after a specified number of `MERGE` statements.

## Requirements

This extension requires Visual Studio Code 1.45.0 or later.

## Extension Settings

To install, get vsix file from releases link, download to your pc, open VSCode, go to extensions side bar, and click on the 3 dots on topright of extensions side-bar. 

From there select install from Vsix and find your download...

This extension contributes the following settings:

- `veknamerge.targetTableAlias`: Alias for the target table in the MERGE statement. Default is "t".
- `veknamerge.sourceTableAlias`: Alias for the source table in the MERGE statement. Default is "s".
- `veknamerge.commitEvery`: Number of statements after which to insert a COMMIT;. Default is 100.

## Known Issues

It completely disregards any other SQL statements except for INSERT.

## Release Notes

### 1.0.2
- Initial release of Vekna Merge.
- Added support for selecting key columns for the ON condition.
- Added option to apply the same key columns to all subsequent INSERT statements.
- Added automatic insertion of COMMIT; statements after a specified number of MERGE statements.

## License

This extension is licensed under the MIT License. See the LICENSE file for more information.

## Repository

For more information, visit the [GitHub repository](https://github.com/vadmin/veknamerge.git).
For more information, visit the GitHub repository.

