# ScriptOUT
An after effects script that helps organize and find all your scripts.


# ScriptOut

> **One panel for all your After Effects scripts.** Add your favorites, arrange them your way, and run any of them with a single click.

---

## Features

* **One panel for any script:** Add `.jsx`, `.jsxbin`, or `.js` files from anywhere on your computer.
* **Sections:** Group scripts under your own headings, like *Animation* or *Cleanup*.
* **3 layouts:** Switch between layouts **1**, **2**, and **3**, each with its own sections and scripts.
* **Search:** Type in the search box to find a script fast.
* **Edit mode:** Add, rename, reorder, and remove scripts and sections.
* **Auto-saved:** Your layouts are remembered between sessions.
* **Safe to click:** If a script fails, you see a message and the panel keeps working.

---

## Install

1. Copy `ScriptOut.jsx` into the `Scripts/ScriptUI Panels` folder inside your After Effects directory.
2. Restart After Effects.
3. Go to **Edit > Preferences > Scripting & Expressions** and enable **Allow Scripts to Write Files and Access Network** *(this lets ScriptOut save your layouts)*.
4. Open **Window > ScriptOut.jsx** and dock the panel wherever you like.

---

## How to Use

* **Run a script:** Click its tile.
* **Add scripts:**
  1. Tick **Edit**.
  2. Click **`+`** on a section and choose one or more script files.
  3. Untick **Edit** when you're done.
* **Change a script:** With **Edit** on, click its tile to rename it, change its file, reorder it, or remove it.
* **Run as:**
  * *Run once* runs the script as a single undo step. Use this for scripts that execute an immediate action.
  * *Open window / panel script* is for scripts that launch their own UI window.
* **Sections:** With **Edit** on, use the small buttons on a section header to add scripts, rename, move up or down, or delete it. Click **`+ Section`** at the bottom to create a new one.
* **Layouts:** Pick **1**, **2**, or **3** at the top. Each layout maintains its own independent set of scripts.

---

## Good to Know

* ScriptOut only stores shortcuts—your original script files are never moved, modified, or deleted.
* If you move or delete a script file, its tile will display `(missing)`. Turn on **Edit** and click the tile to relink it.
* Scripts with their own UI open as floating windows rather than embedding inside the panel.
* Your layouts are saved inside a `ScriptOut` folder in your user data directory under `config.json`.

---

## Troubleshooting

* **Layouts don't save:** Enable **Allow Scripts to Write Files and Access Network** in After Effects Preferences.
* **Panel isn't in the Window menu:** Make sure `ScriptOut.jsx` is placed inside the `ScriptUI Panels` folder and restart After Effects.
* **A script doesn't work from ScriptOut:** Try running it directly via **File > Scripts > Run Script File** to verify whether the script itself has an issue.

---

<sub>**Version 0.1** • © 2026 Shihab Masrur (masboedits). Free to use. Not for resale or redistribution.</sub>
