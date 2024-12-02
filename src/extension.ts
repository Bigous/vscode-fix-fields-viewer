// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

export let extensionContext: vscode.ExtensionContext;
export let autoDetectDisposable: vscode.Disposable | undefined;
export let fixTablePanel: vscode.WebviewPanel | undefined;

export let fixDictionary: {
  [key: string]: {
    name: string;
    type: string;
    values?: { [key: string]: string };
  };
} = {};
let currentFilters: string[] = [];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) : Promise<void> {
	return new Promise<void>((resolve, reject) => {
		extensionContext = context;
		// Carregar o arquivo fix-dictionary.json
		console.log("Activating fix-fields-viewer...");
		const fixDictionaryPath = context.asAbsolutePath("fix-dictionary.json");
		vscode.workspace.fs.readFile(vscode.Uri.file(fixDictionaryPath)).then(
			(data) => {
				fixDictionary = JSON.parse(data.toString());
				console.log("fix-dictionary.json loaded");
				if (fixTablePanel) {
					// Show again to update the dictionary data on screen.
					verifyAndShowFixTable(vscode.window.activeTextEditor);
				}
				resolve();
			},
			(error) => {
				vscode.window.showErrorMessage(
					`Failed to load ${fixDictionaryPath}: ${error}`
				);
				resolve();
			}
		);

		const disposable = vscode.commands.registerCommand(
			"fix-fields-viewer.showTable",
			() => verifyAndShowFixTable(vscode.window.activeTextEditor)
		);

		const stopAutoDetectDisposable = vscode.commands.registerCommand(
			"fix-fields-viewer.stopAutoDetect",
			() => {
				stopAutoDetect();
				vscode.window.showInformationMessage("Auto-detect for FIX messages has been stopped.");
			}
		);

		const startAutoDetectDisposable = vscode.commands.registerCommand(
			"fix-fields-viewer.startAutoDetect",
			() => {
				if (!autoDetectDisposable) {
					startAutoDetect(context);
				}
			}
		);

		context.subscriptions.push(disposable, stopAutoDetectDisposable, startAutoDetectDisposable);

		// Verificar configuração para detecção automática
		const config = vscode.workspace.getConfiguration("fix-fields-viewer");
		const autoDetect = config.get<boolean>("autoDetect", true);

		if (autoDetect) {
			startAutoDetect(context);
		}

		context.subscriptions.push({
			dispose: () => {
				autoDetectDisposable = undefined;
				fixTablePanel = undefined;
			}
		});
	});
}

const keepFilters = vscode.workspace.getConfiguration("fix-fields-viewer").get<boolean>("keepFilters", true);

function startAutoDetect(context: vscode.ExtensionContext) {
	stopAutoDetect();
	autoDetectDisposable = vscode.window.onDidChangeTextEditorSelection(
		(event) => verifyAndShowFixTable(event.textEditor),
		null,
		context.subscriptions
	);
	vscode.window.showInformationMessage("Auto-detect for FIX messages has been started.");
}

function stopAutoDetect() {
	if (autoDetectDisposable) {
		autoDetectDisposable.dispose();
		autoDetectDisposable = undefined;
	}
}

function verifyAndShowFixTable(editor: vscode.TextEditor | undefined) {
  if (!editor) {
    vscode.window.showErrorMessage("No active editor found!");
    return;
  }

  const selection = editor.selection;
  const lineText = editor.document.lineAt(selection.active.line).text;

  if (isFixMessage(lineText)) {
    const fields = parseFixMessage(lineText);
    showFixTable(fields, keepFilters);
  }
}

const fixPattern = /8=FIX\.\d+\.\d+\u0001(.*)\u000110=\d+[\|\u0001]/;

// This method is called when your extension is deactivated
export function deactivate() {
	if (fixTablePanel) {
		fixTablePanel.dispose();
		fixTablePanel = undefined;
	}
	if (autoDetectDisposable) {
		autoDetectDisposable.dispose();
		autoDetectDisposable = undefined;
	}
}

// Função que valida se o texto é uma mensagem FIX
function isFixMessage(text: string): boolean {
  // Mensagens FIX geralmente têm o formato "8=FIX.4.4|..."
  return fixPattern.test(text);
}

// Função para parsear a mensagem FIX
function parseFixMessage(
  fixMessage: string
): Array<{ tag: string; value: string }> {
  const match = fixPattern.exec(fixMessage);
  if (!match) {
    return [];
  }

  const messageBody = match[1];
  return messageBody
    .split("\u0001")
    .map((part) => {
      const [tag, value] = part.split("=");
      return { tag, value };
    })
    .filter((field) => field.tag);
}

// Exibir os campos em uma tabela
function showFixTable(
  fields: Array<{ tag: string; value: string }>,
  keepFilters: boolean = true
) {
  const previousFilters = keepFilters ? currentFilters : [];

  if (fixTablePanel) {
		fixTablePanel.reveal(vscode.ViewColumn.Beside, true);
  } else {
    fixTablePanel = vscode.window.createWebviewPanel(
      "fixTable",
      "FIX Message",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true, // Allow scripts to be executed
      }
    );

    fixTablePanel.webview.onDidReceiveMessage(
      (message) => {
        if (message.command === "updateFilters") {
          currentFilters = message.filters;
        }
      },
      undefined,
      []
    );

    fixTablePanel.onDidDispose(
      () => {
        fixTablePanel = undefined;
      },
      null,
      []
    );
  }

  const rows = fields
    .map((field) => {
      const dictionaryEntry = fixDictionary[field.tag] || {};
      const name = dictionaryEntry ? dictionaryEntry.name || "" : "";
      const type = dictionaryEntry ? dictionaryEntry.type || "" : "";
      const description = dictionaryEntry
        ? dictionaryEntry.values
          ? dictionaryEntry.values[field.value] || ""
          : ""
        : "";
      return `<tr>
				<td>${field.tag}</td>
				<td>${name}</td>
				<td>${type}</td>
				<td>${field.value}</td>
				<td>${description}</td>
			</tr>`;
    })
    .join("");

  fixTablePanel.webview.html = `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<style>
				table { border-collapse: collapse; width: 100%; }
				th, td { border: 1px solid black; padding: 8px; text-align: left; }
				th { background-color: #f2f2f2; color: #202020; }
				input { width: 100%; box-sizing: border-box; }
			</style>
			<script>
				const vscode = acquireVsCodeApi();
				function filterTable() {
					const input = document.querySelectorAll('input');
					const filter = Array.from(input).map(i => new RegExp(i.value, 'i'));
					const rows = document.querySelectorAll('tbody tr');
					rows.forEach(row => {
						const cells = row.querySelectorAll('td');
						const matches = filter.every((regex, index) => regex.test(cells[index].innerText));
						row.style.display = matches ? '' : 'none';
						updateFilters();
					});
				}
				function setFilters(filters) {
					const inputs = document.querySelectorAll('input');
					filters.forEach((filter, index) => {
						inputs[index].value = filter;
					});
					filterTable();
				}
				function updateFilters() {
					const inputs = document.querySelectorAll('input');
					const filters = Array.from(inputs).map(input => input.value);
					vscode.postMessage({ command: 'updateFilters', filters });
				}
				document.querySelectorAll('input').forEach(input => {
					input.addEventListener('input', filterTable);
				});
				document.addEventListener('DOMContentLoaded', function() {
					setFilters(${JSON.stringify(previousFilters)});
				});
			</script>
		</head>
		<body>
			<h1>FIX Message</h1>
			<table>
				<thead>
					<tr>
						<th>Tag</th>
						<th>Name</th>
						<th>Type</th>
						<th>Value</th>
						<th>Description</th>
					</tr>
					<tr>
						<th><input type="text" placeholder="Filter(Regex)..." oninput="filterTable()"></th>
						<th><input type="text" placeholder="Filter(Regex)..." oninput="filterTable()"></th>
						<th><input type="text" placeholder="Filter(Regex)..." oninput="filterTable()"></th>
						<th><input type="text" placeholder="Filter(Regex)..." oninput="filterTable()"></th>
						<th><input type="text" placeholder="Filter(Regex)..." oninput="filterTable()"></th>
					</tr>
				</thead>
				<tbody id="fixTableBody">
					${rows}
				</tbody>
			</table>
		</body>
		</html>`;
}
