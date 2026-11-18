/*
    ScriptOut  v0.1 (prototype)
    One dockable panel that holds shortcuts to your own scripts.

    INSTALL
      1. Copy this file to:  [After Effects folder]/Scripts/ScriptUI Panels/
      2. Restart After Effects, then open it from the Window menu > ScriptOut.jsx
      3. Preferences > Scripting & Expressions > tick
         "Allow Scripts to Write Files and Access Network"  (needed to save your layouts)

    USE
      - Click a tile to run that script.
      - Tick "Edit" to add scripts (+), rename/move/delete sections, or click a tile to
        change its name, file, run mode or order.
      - Three layout slots (1, 2, 3). Settings are stored in:
        [user data folder]/ScriptOut/config.json
*/
(function (thisObj) {

    var NAME = "ScriptOut";
    var TILE_H = 30, HEAD_H = 24, GAP = 4, SEC_GAP = 10, SB_W = 16, MIN_TILE_W = 96;

    // ---------------------------------------------------------------- storage
    var cfgFolder = new Folder(Folder.userData.fsName + "/ScriptOut");
    var cfgFile = new File(cfgFolder.fsName + "/config.json");

    function quote(s) {
        return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"')
            .replace(/\r/g, "\\r").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + '"';
    }

    function ser(v) {
        var t = typeof v, i, out;
        if (v === null || v === undefined) return "null";
        if (t === "string") return quote(v);
        if (t === "number" || t === "boolean") return String(v);
        if (v instanceof Array) {
            out = [];
            for (i = 0; i < v.length; i++) out.push(ser(v[i]));
            return "[" + out.join(",") + "]";
        }
        out = [];
        for (var k in v) if (v.hasOwnProperty(k)) out.push(quote(k) + ":" + ser(v[k]));
        return "{" + out.join(",") + "}";
    }

    function defaultConfig() {
        var c = { active: 0, layouts: [] };
        for (var i = 0; i < 3; i++) c.layouts.push({ sections: [{ name: "Scripts", items: [] }] });
        return c;
    }

    function loadConfig() {
        try {
            if (cfgFile.exists) {
                cfgFile.encoding = "UTF-8";
                cfgFile.open("r");
                var text = cfgFile.read();
                cfgFile.close();
                var c = eval("(" + text + ")");
                if (c && c.layouts && c.layouts.length === 3) {
                    if (typeof c.active !== "number" || c.active < 0 || c.active > 2) c.active = 0;
                    return c;
                }
            }
        } catch (e) { }
        return defaultConfig();
    }

    var cfg = loadConfig();

    function saveConfig() {
        try {
            if (!cfgFolder.exists) cfgFolder.create();
            cfgFile.encoding = "UTF-8";
            if (cfgFile.open("w")) {
                cfgFile.write(ser(cfg));
                cfgFile.close();
                return true;
            }
        } catch (e) { }
        setStatus("Could not save. Allow scripts to write files in Preferences.");
        return false;
    }

    // ---------------------------------------------------------------- state
    var editMode = false, query = "";
    var pal, rbs = [], editCb, search, vp, content, sb, statusTxt;

    function curLayout() { return cfg.layouts[cfg.active]; }

    function setStatus(msg) {
        try { if (statusTxt) statusTxt.text = msg; } catch (e) { }
    }

    function fuzzy(text, q) {
        text = text.toLowerCase();
        q = q.toLowerCase();
        var j = 0;
        for (var i = 0; i < text.length && j < q.length; i++) {
            if (text.charAt(i) === q.charAt(j)) j++;
        }
        return j === q.length;
    }

    // ---------------------------------------------------------------- actions
    function runItem(it) {
        var f = new File(it.path);
        if (!f.exists) {
            setStatus("Missing file: " + it.name);
            alert("Can't find this script:\n" + it.path + "\n\nTurn on Edit and click its tile to relink it.", NAME);
            return;
        }
        var grouped = false;
        try {
            if (it.mode === "once") { app.beginUndoGroup(it.name); grouped = true; }
            $.evalFile(f);
            setStatus("Ran " + it.name);
        } catch (e) {
            setStatus("Error in " + it.name);
            alert(it.name + " failed:\n" + e.toString() + (e.line ? "\n(line " + e.line + ")" : ""), NAME);
        }
        if (grouped) { try { app.endUndoGroup(); } catch (e2) { } }
    }

    function pickScripts(multi) {
        var filter = ($.os.indexOf("Win") !== -1)
            ? "Scripts:*.jsx;*.jsxbin;*.js"
            : function (f) { return f instanceof Folder || /\.(jsx|jsxbin|js)$/i.test(f.name); };
        var r = File.openDialog("Choose script" + (multi ? "(s)" : ""), filter, !!multi);
        if (!r) return null;
        return (r instanceof Array) ? r : [r];
    }

    function addScripts(si) {
        var files = pickScripts(true);
        if (!files) return;
        var sec = curLayout().sections[si];
        for (var i = 0; i < files.length; i++) {
            var nm = decodeURI(files[i].name).replace(/\.[^.]*$/, "");
            sec.items.push({ name: nm, path: files[i].fsName, mode: "once", type: "launch" });
        }
        saveConfig();
        render();
    }

    function addSection() {
        var n = prompt("Section name:", "New section", NAME);
        if (!n) return;
        curLayout().sections.push({ name: n, items: [] });
        saveConfig();
        render();
    }

    function renameSection(si) {
        var sec = curLayout().sections[si];
        var n = prompt("Section name:", sec.name, NAME);
        if (!n) return;
        sec.name = n;
        saveConfig();
        render();
    }

    function moveSection(si, dir) {
        var s = curLayout().sections, j = si + dir;
        if (j < 0 || j >= s.length) return;
        var t = s[si]; s[si] = s[j]; s[j] = t;
        saveConfig();
        render();
    }

    function deleteSection(si) {
        var s = curLayout().sections;
        if (!confirm("Delete section \"" + s[si].name + "\" and its " + s[si].items.length +
            " shortcut(s)?\nYour script files are not deleted.", true, NAME)) return;
        s.splice(si, 1);
        if (s.length === 0) s.push({ name: "Scripts", items: [] });
        saveConfig();
        render();
    }

    function editItem(si, ii) {
        var sec = curLayout().sections[si], it = sec.items[ii], action = "none";
        var d = new Window("dialog", "Edit script");
        d.orientation = "column";
        d.alignChildren = ["fill", "top"];

        var g1 = d.add("group");
        g1.add("statictext", undefined, "Name:").preferredSize.width = 56;
        var nameEt = g1.add("edittext", undefined, it.name);
        nameEt.preferredSize.width = 260;

        var g2 = d.add("group");
        g2.add("statictext", undefined, "File:").preferredSize.width = 56;
        var pathEt = g2.add("edittext", undefined, it.path);
        pathEt.preferredSize.width = 180;
        var br = g2.add("button", undefined, "Browse...");
        br.onClick = function () {
            var f = pickScripts(false);
            if (f) pathEt.text = f[0].fsName;
        };

        var g3 = d.add("group");
        g3.add("statictext", undefined, "Run as:").preferredSize.width = 56;
        var modeDd = g3.add("dropdownlist", undefined, ["Run once (one undo step)", "Open window / panel script"]);
        modeDd.selection = (it.mode === "window") ? 1 : 0;
        modeDd.preferredSize.width = 260;

        var g4 = d.add("group");
        g4.alignment = "left";
        var earlier = g4.add("button", undefined, "Move earlier");
        var later = g4.add("button", undefined, "Move later");
        var rem = g4.add("button", undefined, "Remove");
        earlier.enabled = ii > 0;
        later.enabled = ii < sec.items.length - 1;
        earlier.onClick = function () { action = "earlier"; d.close(); };
        later.onClick = function () { action = "later"; d.close(); };
        rem.onClick = function () { action = "remove"; d.close(); };

        var g5 = d.add("group");
        g5.alignment = "right";
        var ok = g5.add("button", undefined, "OK", { name: "ok" });
        g5.add("button", undefined, "Cancel", { name: "cancel" });
        ok.onClick = function () { action = "ok"; d.close(); };

        d.show();

        if (action === "ok") {
            var p = pathEt.text;
            var n = nameEt.text.replace(/^\s+|\s+$/g, "");
            if (!n) n = decodeURI(new File(p).name).replace(/\.[^.]*$/, "");
            it.name = n;
            it.path = p;
            it.mode = (modeDd.selection && modeDd.selection.index === 1) ? "window" : "once";
        } else if (action === "earlier" && ii > 0) {
            sec.items[ii] = sec.items[ii - 1];
            sec.items[ii - 1] = it;
        } else if (action === "later" && ii < sec.items.length - 1) {
            sec.items[ii] = sec.items[ii + 1];
            sec.items[ii + 1] = it;
        } else if (action === "remove") {
            sec.items.splice(ii, 1);
        } else {
            return;
        }
        saveConfig();
        render();
    }

    // ---------------------------------------------------------------- handlers (closures)
    function tileHandler(si, ii) {
        return function () {
            if (editMode) editItem(si, ii);
            else runItem(curLayout().sections[si].items[ii]);
        };
    }
    function layoutHandler(i) {
        return function () {
            cfg.active = i;
            saveConfig();
            sb.value = 0;
            render();
        };
    }
    function sectionHandler(fn, si, arg) {
        return function () { fn(si, arg); };
    }

    // ---------------------------------------------------------------- UI
    function viewportSize() {
        var w = 0, h = 0;
        try { w = vp.size.width; h = vp.size.height; } catch (e) { }
        if (!w || w < 60) { try { w = pal.size.width - 16; } catch (e2) { } }
        if (!w || w < 60) w = 300;
        if (!h || h < 60) h = 300;
        return [w, h];
    }

    function render() {
        if (!pal || !content) return;
        var vs = viewportSize();
        var availW = vs[0] - SB_W - 2;
        var cols = Math.max(1, Math.floor((availW + GAP) / (MIN_TILE_W + GAP)));
        var tileW = Math.floor((availW - (cols - 1) * GAP) / cols);
        var layout = curLayout(), y = 0, totalItems = 0, si, ii, r, c;

        while (content.children.length > 0) content.remove(content.children[0]);

        for (si = 0; si < layout.sections.length; si++) {
            var sec = layout.sections[si], idx = [];
            for (ii = 0; ii < sec.items.length; ii++) {
                totalItems++;
                if (!query || fuzzy(sec.items[ii].name, query)) idx.push(ii);
            }
            if (query && idx.length === 0) continue;

            // section header
            var hg = content.add("group");
            hg.orientation = "row";
            hg.spacing = 2;
            hg.margins = 0;
            hg.alignChildren = ["left", "center"];
            var reserve = editMode ? 5 * 26 : 0;
            var st = hg.add("statictext", undefined, sec.name.toUpperCase(), { truncate: "end" });
            st.preferredSize = [Math.max(40, availW - reserve - 4), 20];
            if (editMode) {
                var specs = [
                    ["+", "Add script(s) to this section", addScripts, null],
                    ["Aa", "Rename section", renameSection, null],
                    ["\u25B2", "Move section up", moveSection, -1],
                    ["\u25BC", "Move section down", moveSection, 1],
                    ["\u00D7", "Delete section", deleteSection, null]
                ];
                for (var k = 0; k < specs.length; k++) {
                    var b = hg.add("button", undefined, specs[k][0]);
                    b.preferredSize = [24, 20];
                    b.helpTip = specs[k][1];
                    b.onClick = sectionHandler(specs[k][2], si, specs[k][3]);
                }
            }
            y += HEAD_H;
            hg.preferredSize.height = HEAD_H;

            // tiles
            for (r = 0; r < idx.length; r += cols) {
                var row = content.add("group");
                row.orientation = "row";
                row.spacing = GAP;
                row.margins = [0, 0, 0, GAP];
                for (c = r; c < Math.min(r + cols, idx.length); c++) {
                    var item = sec.items[idx[c]];
                    var label = new File(item.path).exists ? item.name : "(missing) " + item.name;
                    var btn = row.add("button", undefined, label);
                    btn.preferredSize = [tileW, TILE_H];
                    btn.helpTip = item.path;
                    btn.onClick = tileHandler(si, idx[c]);
                }
                y += TILE_H + GAP;
            }

            var spacer = content.add("group");
            spacer.preferredSize = [1, SEC_GAP];
            y += SEC_GAP;
        }

        if (totalItems === 0 && !query) {
            var hint = content.add("statictext", undefined,
                "No scripts yet. Tick Edit, then press + on a section to add your scripts.",
                { multiline: true });
            hint.preferredSize = [availW, 44];
            y += 44;
        }

        if (editMode && !query) {
            var addSec = content.add("button", undefined, "+ Section");
            addSec.preferredSize = [availW, TILE_H];
            addSec.onClick = addSection;
            y += TILE_H;
        }

        var totalH = y + 8;
        content.size = [availW, totalH];
        content.layout.layout(true);

        var maxScroll = Math.max(0, totalH - vs[1]);
        sb.minvalue = 0;
        sb.maxvalue = maxScroll;
        if (sb.value > maxScroll) sb.value = maxScroll;
        sb.enabled = maxScroll > 0;
        sb.stepdelta = TILE_H;
        sb.jumpdelta = Math.max(TILE_H, Math.floor(vs[1] * 0.8));
        content.location = [0, -Math.round(sb.value)];
    }

    function buildUI() {
        pal = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", NAME, undefined, { resizeable: true });
        pal.orientation = "column";
        pal.alignChildren = ["fill", "top"];
        pal.margins = 8;
        pal.spacing = 6;

        var top = pal.add("group");
        top.orientation = "row";
        top.alignChildren = ["left", "center"];
        top.add("statictext", undefined, "Layout");
        for (var i = 0; i < 3; i++) {
            rbs[i] = top.add("radiobutton", undefined, String(i + 1));
            rbs[i].value = (i === cfg.active);
            rbs[i].onClick = layoutHandler(i);
        }
        editCb = top.add("checkbox", undefined, "Edit");
        editCb.onClick = function () { editMode = this.value; render(); };

        search = pal.add("edittext", undefined, "");
        search.helpTip = "Search your scripts";
        search.onChanging = function () { query = this.text; render(); };

        vp = pal.add("group");
        vp.orientation = "row";
        vp.alignment = ["fill", "fill"];
        vp.alignChildren = ["left", "top"];
        vp.spacing = 0;
        vp.margins = 0;
        vp.preferredSize = [300, 320];

        content = vp.add("group");
        content.orientation = "column";
        content.alignChildren = ["left", "top"];
        content.spacing = 0;
        content.margins = 0;

        sb = vp.add("scrollbar", undefined, 0, 0, 0);
        sb.alignment = ["right", "fill"];
        sb.preferredSize.width = SB_W;
        sb.onChanging = sb.onChange = function () {
            content.location = [0, -Math.round(this.value)];
        };

        statusTxt = pal.add("statictext", undefined, "Ready", { truncate: "end" });
        statusTxt.alignment = ["fill", "bottom"];

        pal.onResizing = pal.onResize = function () {
            this.layout.resize();
            render();
        };
        return pal;
    }

    var ui = buildUI();
    ui.layout.layout(true);
    render();
    if (ui instanceof Window) {
        ui.center();
        ui.show();
    }

})(this);
