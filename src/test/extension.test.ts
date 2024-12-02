import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
//import { fixDictionary } from "../extension";

suite("Fix Fields Viewer Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Should activate the extension", async () => {
    const extension = vscode.extensions.getExtension("Bigous.fix-fields-viewer");
    assert.ok(extension);
    await extension.activate();
    assert.strictEqual(extension.isActive, true);
  });

  test("Should register commands", async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("fix-fields-viewer.showTable"));
    assert.ok(commands.includes("fix-fields-viewer.stopAutoDetect"));
    assert.ok(commands.includes("fix-fields-viewer.startAutoDetect"));
  });

  // test("Should load fix-dictionary.json", async () => {
  //   const extension = vscode.extensions.getExtension("Bigous.fix-fields-viewer");
  //   assert.ok(extension);
  //   await extension.activate();
  //   assert.ok(extension.exports.fixDictionary['1']);
  // });

  // test("Should start and stop auto-detect", async () => {
  //   const extension = vscode.extensions.getExtension("Bigous.fix-fields-viewer");
  //   assert.ok(extension);
  //   await extension.activate();
  //   await vscode.commands.executeCommand("fix-fields-viewer.startAutoDetect");
  //   assert.ok(extension.exports.autoDetectDisposable);
  //   await vscode.commands.executeCommand("fix-fields-viewer.stopAutoDetect");
  //   assert.strictEqual(extension.exports.autoDetectDisposable, undefined);
  // });

  // test("Should show FIX table", async () => {
  //   const extension = vscode.extensions.getExtension("Bigous.fix-fields-viewer");
  //   assert.ok(extension);
  //   await extension.activate();
  //   const editor = await vscode.workspace.openTextDocument({ content: "8=FIX.4.4\u000135=D\u000110=123\u0001" });
  //   await vscode.window.showTextDocument(editor);
  //   await vscode.commands.executeCommand("fix-fields-viewer.showTable");
  //   assert.ok(extension.exports.fixTablePanel);
  // });

  test("Should show FIX table on cursor position after startAutoDetect", async () => {
    const extension = vscode.extensions.getExtension("Bigous.fix-fields-viewer");
    assert.ok(extension);
    await extension.activate();
    await vscode.commands.executeCommand("fix-fields-viewer.startAutoDetect");

    const editor = await vscode.workspace.openTextDocument({ content: "8=FIX.4.4\u000135=D\u000110=123\u0001" });
    const textEditor = await vscode.window.showTextDocument(editor);
    textEditor.selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(0, 0));

    // await vscode.commands.executeCommand("fix-fields-viewer.showTable");
    assert.ok(extension.exports.fixTablePanel);

    await vscode.commands.executeCommand("fix-fields-viewer.stopAutoDetect");
  });
});
