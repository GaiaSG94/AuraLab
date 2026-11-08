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
  const sec = el("section", "notebook");

  if (config.notebook.prompts.length > 0) {
    const ul = el("ul", "prompts");
    config.notebook.prompts.forEach((p) => {
      ul.appendChild(el("li", "", escapeHtml(p)));
    });
    sec.appendChild(ul);
  }

  const noteInput = el("textarea", "note-area");
  noteInput.placeholder = "Write what you see…";
  noteInput.setAttribute("aria-label", "Notebook note");
  const noteBtn = el("button", "btn ink", "Note");
  noteBtn.type = "button";
  noteBtn.addEventListener("click", () => {
    const text = noteInput.value.trim();
    if (!text) return;
    data.notes.push({ t: getState().t, text });
    noteInput.value = "";
    save(config.lab.id, data);
    renderNotes();
  });
  noteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) noteBtn.click();
  });
  const snapBtn = el("button", "btn", "● Record measures");
  snapBtn.type = "button";
  snapBtn.title = "Record measures at this instant";
  const actions = el("div", "note-actions");
  actions.appendChild(noteBtn);
  actions.appendChild(snapBtn);
  sec.appendChild(noteInput);
  sec.appendChild(actions);

  const notesList = el("ul", "notes");
  sec.appendChild(notesList);
  const snapsTitle = el("h3", "sub", "Snapshots");
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
  sec.appendChild(snapsTitle);
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
      const li = el("li", "", `<span class="t">${fmtT(n.t)}</span><span class="txt">${escapeHtml(n.text)}</span>`);
      const del = el("button", "btn mini", "×");
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
    snapsTitle.hidden = data.snapshots.length === 0;
    data.snapshots.forEach((s, i) => {
      const summary = Object.keys(s.metrics)
        .slice(0, 4)
        .map((k) => `${k}=${Math.round(s.metrics[k] * 100) / 100}`)
        .join(", ");
      const li = el("li", "", `<span class="t">${fmtT(s.t)}</span><span class="txt">${escapeHtml(summary)}</span>`);
      const back = el("button", "btn mini", "Restore");
      back.addEventListener("click", () => onRestore(JSON.parse(JSON.stringify(s.params))));
      li.appendChild(back);
      const del = el("button", "btn mini", "×");
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
