// Bridge HUD log panel: the suggested questions, the recorded entries and the
// note input. Kept out of hud.js so that file stays under the repo size limit.

export function buildLog({ journalEl, ctx, refresh }) {
  const prompts = document.createElement("ul");
  prompts.className = "ph-prompts";
  for (const p of ctx.config.notebook.prompts || []) {
    const li = document.createElement("li");
    li.textContent = p;
    prompts.appendChild(li);
  }
  journalEl.appendChild(prompts);

  const entries = document.createElement("ul");
  entries.className = "ph-entries";
  journalEl.appendChild(entries);

  const noteRow = document.createElement("div");
  noteRow.className = "ph-note";
  const noteInput = document.createElement("input");
  noteInput.placeholder = "Note an observation…";
  noteInput.setAttribute("aria-label", "Note an observation");
  const noteBtn = document.createElement("button");
  noteBtn.type = "button";
  noteBtn.textContent = "Note";
  const addNote = () => {
    const text = noteInput.value.trim();
    if (!text) return;
    ctx.journal(text);
    noteInput.value = "";
    refresh(true);
  };
  noteBtn.addEventListener("click", addNote);
  noteInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addNote();
  });
  noteRow.appendChild(noteInput);
  noteRow.appendChild(noteBtn);
  journalEl.appendChild(noteRow);

  return { entries };
}
