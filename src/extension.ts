// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { registerViewJsonCommand } from './jsonViewer';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Register the viewJson command
	registerViewJsonCommand(context);
}

// This method is called when your extension is deactivated
export function deactivate() { }
