// AuraLab core — notebook: timestamped notes + measure snapshots at instant t.
// Snapshots store metric values and tunable params; restoring re-applies params.
import { el, escapeHtml } from "./controls.js";

function storageKey(labId) {
  return `auralab.${labId}.notebook`;
}

function load(labId) {
  try {
    const raw = localStorage.getItem(storageKey(labId));
    if (!raw) return { notes: [], snapshots: [] };
    const data = JSON.parse(raw);
    if (!Array.isArray(data.notes)) data.notes = [];
    if (!Array.isArray(data.snapshots)) data.snapshots = [];
    return data;
  } catch {
    return { notes: [], snapshots: [] };
  }
}

function save(labId, data) {
  try {
    localStorage.setItem(storageKey(labId), JSON.stringify(data));
  } catch {
    /* private mode: notebook works for the session only */
  }
}

// getState: () => ({ t, metrics: {id: value}, params: clonable })
// onRestore(params): re-apply params + resync + redraw
export function buildNotebook(parent, config, getState, onRestore) {
  if (!config.notebook.enabled) return null;
  const data = load(config.lab.id);
  const sec = el("section", "notebook", "<h2>Notebook</h2>");

  if (config.notebook.prompts.length > 0) {
    const ul = el("ul", "prompts");
    config.notebook.prompts.forEach((p) => {
      ul.appendChild(el("li", "", escapeHtml(p)));
    });
    sec.appendChild(ul);
  }

  const noteRow = el("div", "note-row");
  const noteInput = el("input");
  noteInput.type = "text";
  noteInput.placeholder = "Note an observation…";
  noteInput.setAttribute("aria-label", "Notebook note");
  const noteBtn = el("button", "", "Note");
  noteBtn.addEventListener("click", () => {
    const text = noteInput.value.trim();
    if (!text) return;
    data.notes.push({ t: getState().t, text });
    noteInput.value = "";
    save(config.lab.id, data);
    renderNotes();
  });
  noteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") noteBtn.click();
  });
  noteRow.appendChild(noteInput);
  noteRow.appendChild(noteBtn);
  sec.appendChild(noteRow);

  const notesList = el("ul", "notes");
  sec.appendChild(notesList);

  const snapBtn = el("button", "wide", "Record measures at this instant");
  const snapsList = el("ul", "snapshots");
  snapBtn.addEventListener("click", () => {
    const s = getState();
    data.snapshots.push({
      t: s.t,
      metrics: s.metrics,
      params: JSON.parse(JSON.stringify(s.params)),
    });
    save(config.lab.id, data);
    renderSnaps();
  });
  sec.appendChild(snapBtn);
  sec.appendChild(snapsList);

  parent.appendChild(sec);

  function fmtT(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function renderNotes() {
    notesList.innerHTML = "";
    data.notes.forEach((n, i) => {
      const li = el("li", "", `<span class="t">${fmtT(n.t)}</span> ${escapeHtml(n.text)} `);
      const del = el("button", "mini", "×");
      del.setAttribute("aria-label", "Delete note");
      del.addEventListener("click", () => {
        data.notes.splice(i, 1);
        save(config.lab.id, data);
        renderNotes();
      });
      li.appendChild(del);
      notesList.appendChild(li);
    });
  }

  function renderSnaps() {
    snapsList.innerHTML = "";
    data.snapshots.forEach((s, i) => {
      const summary = Object.keys(s.metrics)
        .slice(0, 4)
        .map((k) => `${k}=${Math.round(s.metrics[k] * 100) / 100}`)
        .join(", ");
      const li = el("li", "", `<span class="t">${fmtT(s.t)}</span> ${escapeHtml(summary)} `);
      const back = el("button", "mini", "Restore");
      back.addEventListener("click", () => onRestore(JSON.parse(JSON.stringify(s.params))));
      li.appendChild(back);
      const del = el("button", "mini", "×");
      del.setAttribute("aria-label", "Delete snapshot");
      del.addEventListener("click", () => {
        data.snapshots.splice(i, 1);
        save(config.lab.id, data);
        renderSnaps();
      });
      li.appendChild(del);
      snapsList.appendChild(li);
    });
  }

  renderNotes();
  renderSnaps();
  return { element: sec };
}
