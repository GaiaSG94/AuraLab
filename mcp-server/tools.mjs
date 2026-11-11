// LabKit MCP tools: what the agent can ask about the kit.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { builtinInstruments } from "../core/catalog.js";
import { buildLawSource, registerLaw } from "../scripts/add-element.mjs";
import {
  packs,
  root,
  listLabs as listLabFolders,
  knownForLab,
  readConfig,
  packOf,
  validateConfig,
} from "../scripts/lab-registry.mjs";

export const TOOLS = [
  {
    name: "list_catalog",
    description:
      "List the LabKit catalog with the notices of every entry (rule, sources, limits). Filter by category.",
    inputSchema: {
      type: "object",
      properties: { category: { type: "string", enum: ["laws", "apparatus", "instruments"] } },
      additionalProperties: false,
    },
  },
  {
    name: "list_labs",
    description:
      "List the labs shipped in this repo with their title, pack, laws and measures. Use it before writing a new lab.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "validate_lab",
    description:
      "Validate one lab config or every lab against the catalog. Returns OK/FAIL with warnings and errors.",
    inputSchema: {
      type: "object",
      properties: { lab: { type: "string", enum: ["app-space", "app-eco", "app-chimie", "app-ponts", "all"] } },
      additionalProperties: false,
    },
  },
  {
    name: "headless_check",
    description:
      "Boot a lab without a browser and simulate it for N frames. Reports the measures and whether they stayed finite.",
    inputSchema: {
      type: "object",
      required: ["lab"],
      properties: {
        lab: { type: "string", enum: ["app-space", "app-eco", "app-chimie", "app-ponts"] },
        frames: { type: "number", description: "frames to simulate (default 600)" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "scaffold_law",
    description:
      "Create a new particle-law module from fields and register it in the pack. The file contains a TODO to finish before use.",
    inputSchema: {
      type: "object",
      required: ["id", "label", "formule", "sources", "limites"],
      properties: {
        id: { type: "string", description: "kebab-case id, e.g. vent-solaire" },
        label: { type: "string" },
        formule: { type: "string" },
        sources: { type: "string" },
        limites: { type: "string" },
        kind: { type: "string", enum: ["force", "steering", "interaction", "init"] },
        params: { type: "object", description: "default params, e.g. {\"k\": 1.5}" },
      },
      additionalProperties: false,
    },
  },
];

function listCatalog({ category }) {
  const out = {};
  if (!category || category === "laws") {
    out.laws = packs.flatMap((pack) =>
      Object.keys(pack.laws).map((id) => ({
        id,
        pack: pack.id,
        notice: pack.laws[id].notice,
        defaults: pack.laws[id].defaults || {},
      })),
    );
  }
  if (!category || category === "apparatus") {
    out.apparatus = packs.flatMap((pack) =>
      Object.keys(pack.apparatus).map((kind) => ({
        kind,
        pack: pack.id,
        notice: pack.apparatus[kind].notice,
        defaults: pack.apparatus[kind].defaults || {},
      })),
    );
  }
  if (!category || category === "instruments") {
    out.instruments = Object.keys(builtinInstruments).map((type) => ({
      type,
      notice: builtinInstruments[type].notice,
    }));
  }
  return out;
}

function listLabs() {
  return {
    labs: listLabFolders().map((lab) => {
      const config = readConfig(lab);
      return {
        id: lab,
        title: config.lab ? config.lab.title : "",
        page: config.lab ? config.lab.page : "",
        pack: packOf(config),
        laws: (config.laws || []).map((l) => l.law),
        metrics: (config.metrics || []).map((m) => ({ id: m.id, unit: m.unit, source: m.source })),
        notes: config.lab ? config.lab.note : "",
      };
    }),
  };
}

async function validateLab({ lab }) {
  const dirs = lab && lab !== "all" ? [lab] : listLabFolders();
  const results = [];
  for (const dir of dirs) {
    let raw;
    try {
      raw = readConfig(dir);
    } catch (err) {
      results.push({ lab: dir, ok: false, errors: [`invalid JSON: ${err.message}`], warnings: [] });
      continue;
    }
    const known = await knownForLab(dir);
    const { config, warnings, errors } = validateConfig(raw, known);
    results.push({ lab: dir, ok: !!config, errors, warnings });
  }
  return { ok: results.every((r) => r.ok), labs: results };
}

async function headlessCheck({ lab, frames }) {
  const steps = Math.max(1, Math.min(5000, Math.floor(frames || 600)));
  const { bootLab, runSteps, measuresAreFinite } = await import("../tests/labs.mjs");
  const booted = await bootLab(lab);
  const measures = runSteps(booted, steps);
  return {
    lab,
    frames: steps,
    finite: measuresAreFinite(measures),
    measures,
  };
}

function scaffoldLaw({ id, label, formule, sources, limites, kind, params }) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id || "")) {
    throw new Error('id must be kebab-case (e.g. "vent-solaire")');
  }
  const file = join(root, "engines/particles/laws", `${id}.js`);
  if (existsSync(file)) throw new Error(`${id}.js already exists`);
  const kinds = ["force", "steering", "interaction", "init"];
  const src = buildLawSource({
    id,
    label: label || id,
    formule: formule || "",
    sources: sources || "",
    limites: limites || "",
    kind: kinds.includes(kind) ? kind : "force",
    params: params && typeof params === "object" ? params : {},
  });
  writeFileSync(file, src);
  const indexFile = join(root, "engines/particles/index.js");
  writeFileSync(indexFile, registerLaw(readFileSync(indexFile, "utf8"), id));
  return {
    path: `engines/particles/laws/${id}.js`,
    registered: true,
    next: [
      "Finish the TODO in the generated file (see gravitation.js for a force example).",
      "Give the law a notice: rule, sources and limits (REQ-06 checks it).",
      "Run validate_lab to check the pack.",
      `Add { "law": "${id}" } to a lab config to use it.`,
      "Write the property test that guarantees its behaviour.",
    ],
  };
}

export async function callTool({ name, arguments: args }) {
  const a = args && typeof args === "object" ? args : {};
  if (name === "list_catalog") return answer(listCatalog(a));
  if (name === "list_labs") return answer(listLabs());
  if (name === "validate_lab") return answer(await validateLab(a));
  if (name === "headless_check") return answer(await headlessCheck(a));
  if (name === "scaffold_law") return answer(scaffoldLaw(a));
  throw coded(`Unknown tool: ${name}`, -32602);
}

function answer(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

export function coded(message, code) {
  return Object.assign(new Error(message), { code });
}
