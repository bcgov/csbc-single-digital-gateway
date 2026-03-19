/**
 * Generate SCHEMA.md from Drizzle ORM schema definitions.
 *
 * Usage: npx tsx scripts/document-schema.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as ts from "typescript";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_DIR = path.resolve(__dirname, "../src/schema");
const OUTPUT_PATH = path.resolve(__dirname, "../SCHEMA.md");

// ─── Types ───────────────────────────────────────────────────────

interface EnumInfo {
  pgName: string;
  values: readonly string[];
  _comments?: string;
}

interface ColInfo {
  name: string;
  sqlType: string;
  notNull: boolean;
  isPK: boolean;
  isUnique: boolean;
  hasDefault: boolean;
  defaultDesc: string;
  hasOnUpdate: boolean;
  enumValues?: readonly string[];
  fk?: { table: string; column: string; onDelete?: string };
  _comments?: string;
}

interface TableData {
  pgName: string;
  sourceFile: string;
  columns: ColInfo[];
  compositePK: string[];
  indexes: { name: string; columns: string[]; isUnique: boolean }[];
  _comments?: string;
}

interface SourceJSDoc {
  comments: Map<string, string>;
  columnComments: Map<string, Map<string, string>>;
}

// ─── JSDoc Extraction ────────────────────────────────────────────

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);
}

function getJSDocComment(node: ts.Node): string | undefined {
  const docs = (node as unknown as { jsDoc?: ts.JSDoc[] }).jsDoc;
  if (!docs || docs.length === 0) return undefined;
  const parts: string[] = [];
  for (const doc of docs) {
    if (typeof doc.comment === "string") {
      parts.push(doc.comment);
    } else if (Array.isArray(doc.comment)) {
      parts.push(doc.comment.map((p) => (typeof p === "string" ? p : p.text)).join(""));
    }
  }
  return parts.length > 0 ? parts.join("\n").trim() : undefined;
}

function extractJSDocFromFile(filePath: string): SourceJSDoc {
  const comments = new Map<string, string>();
  const columnComments = new Map<string, Map<string, string>>();

  const source = fs.readFileSync(filePath, "utf-8");
  const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);

  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;

    const topComment = getJSDocComment(stmt);
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name)) continue;
      const varName = decl.name.text;

      if (topComment) comments.set(varName, topComment);

      if (
        decl.initializer &&
        ts.isCallExpression(decl.initializer) &&
        decl.initializer.arguments.length >= 2
      ) {
        const arg = decl.initializer.arguments[1];
        if (ts.isObjectLiteralExpression(arg)) {
          const colMap = new Map<string, string>();
          for (const prop of arg.properties) {
            if (!ts.isPropertyAssignment(prop)) continue;
            const propComment = getJSDocComment(prop);
            if (propComment && ts.isIdentifier(prop.name)) {
              colMap.set(prop.name.text, propComment);
            }
          }
          if (colMap.size > 0) columnComments.set(varName, colMap);
        }
      }
    }
  }

  return { comments, columnComments };
}

// ─── Helpers ─────────────────────────────────────────────────────

function isEnumExport(
  v: unknown,
): v is { enumName: string; enumValues: readonly string[] } {
  return (
    typeof v === "function" &&
    "enumName" in (v as unknown as Record<string, unknown>) &&
    "enumValues" in (v as unknown as Record<string, unknown>)
  );
}

function getSqlType(col: Record<string, unknown>): string {
  if (typeof col.getSQLType === "function") {
    const t = col.getSQLType() as string;
    if (t === "timestamp with time zone") return "timestamptz";
    if (t === "timestamp without time zone") return "timestamp";
    return t;
  }
  if (col.enumValues && (col as Record<string, unknown>).enum) {
    return ((col as Record<string, unknown>).enum as { enumName: string })
      .enumName;
  }
  const map: Record<string, string> = {
    PgUUID: "uuid",
    PgText: "text",
    PgInteger: "integer",
    PgJsonb: "jsonb",
    PgTimestamp: "timestamptz",
    PgBoolean: "boolean",
    PgSerial: "serial",
    PgVarchar: "varchar",
  };
  return map[col.columnType as string] ?? String(col.columnType ?? "unknown");
}

function describeDefault(col: Record<string, unknown>): string {
  if (!col.hasDefault) return "";
  const t = getSqlType(col);
  if (t === "uuid") return "defaultRandom()";
  if (t === "timestamptz" || t === "timestamp") return "defaultNow()";
  const def = col.default;
  if (def === undefined || def === null) return "";
  if (typeof def === "string") return def;
  if (typeof def === "object") return JSON.stringify(def);
  return String(def);
}

// ─── Schema Loading ──────────────────────────────────────────────

async function loadSchema(): Promise<{
  enums: EnumInfo[];
  tables: TableData[];
}> {
  const indexContent = fs.readFileSync(
    path.join(SCHEMA_DIR, "index.ts"),
    "utf-8",
  );
  const re = /export \* from ["']\.\/(.+?)["']/g;

  const enums: EnumInfo[] = [];
  const tables: TableData[] = [];
  const enumsByValues = new Map<string, string>();

  let match;
  while ((match = re.exec(indexContent)) !== null) {
    const fileName = match[1];
    if (fileName.replace(/\.ts$/, "") === "relations") continue;

    const filePath = path.join(SCHEMA_DIR, fileName);
    const mod = await import(pathToFileURL(filePath).href);
    const displayFile = `schema/${fileName.replace(/\.ts$/, "")}.ts`;
    const jsdoc = extractJSDocFromFile(
      filePath.endsWith(".ts") ? filePath : `${filePath}.ts`,
    );

    for (const [key, value] of Object.entries(mod)) {
      if (isEnumExport(value)) {
        enums.push({
          pgName: value.enumName,
          values: value.enumValues,
          _comments: jsdoc.comments.get(key),
        });
        enumsByValues.set(JSON.stringify([...value.enumValues]), value.enumName);
      }
    }

    for (const [key, value] of Object.entries(mod)) {
      if (!value || typeof value !== "object") continue;

      let config;
      try {
        config = getTableConfig(value as PgTable);
      } catch {
        continue;
      }

      const fkMap = new Map<
        string,
        { table: string; column: string; onDelete?: string }
      >();
      for (const fk of config.foreignKeys) {
        try {
          const ref = fk.reference();
          const foreignName = getTableConfig(ref.foreignTable as PgTable).name;
          for (let i = 0; i < ref.columns.length; i++) {
            fkMap.set(ref.columns[i].name, {
              table: foreignName,
              column: ref.foreignColumns[i].name,
              onDelete: (fk as unknown as Record<string, unknown>).onDelete as
                | string
                | undefined,
            });
          }
        } catch {
          /* circular ref — skip */
        }
      }

      const compositePK: string[] = [];
      for (const pk of config.primaryKeys) {
        const cols = (pk as unknown as Record<string, unknown>).columns;
        if (Array.isArray(cols)) {
          for (const c of cols) compositePK.push(c.name);
        }
      }

      const colJSDoc = jsdoc.columnComments.get(key);
      const columns: ColInfo[] = [];
      for (const col of config.columns) {
        const c = col as unknown as Record<string, unknown>;
        const sqlType = getSqlType(c);
        const enumVals = c.enumValues as readonly string[] | undefined;

        let colComment: string | undefined;
        if (colJSDoc) {
          for (const [propName, comment] of colJSDoc) {
            if (camelToSnake(propName) === col.name || propName === col.name) {
              colComment = comment;
              break;
            }
          }
        }

        columns.push({
          name: col.name,
          sqlType,
          notNull: col.notNull,
          isPK:
            (col as unknown as Record<string, unknown>).primary === true ||
            compositePK.includes(col.name),
          isUnique:
            !!(c.isUnique ?? c.uniqueName),
          hasDefault: col.hasDefault,
          defaultDesc: describeDefault(c),
          hasOnUpdate: typeof c.onUpdateFn === "function",
          enumValues: enumVals,
          fk: fkMap.get(col.name),
          _comments: colComment,
        });
      }

      const indexes: TableData["indexes"] = [];
      for (const idx of config.indexes ?? []) {
        try {
          const ic = (idx as unknown as Record<string, unknown>).config as Record<
            string,
            unknown
          >;
          if (ic) {
            indexes.push({
              name: String(ic.name ?? ""),
              columns: (ic.columns as { name: string }[]).map((x) => x.name),
              isUnique: (ic.unique as boolean) ?? false,
            });
          }
        } catch {
          /* skip unparseable index */
        }
      }

      tables.push({
        pgName: config.name,
        sourceFile: displayFile,
        columns,
        compositePK,
        indexes,
        _comments: jsdoc.comments.get(key),
      });
    }
  }

  return { enums, tables };
}

// ─── Markdown Generation ─────────────────────────────────────────

function mdOverview(tables: TableData[]): string {
  let md = "## Overview\n\n| Table | Source File |\n| --- | --- |\n";
  for (const t of tables) md += `| \`${t.pgName}\` | \`${t.sourceFile}\` |\n`;
  return md;
}

function mdEnums(enums: EnumInfo[]): string {
  let md = "## Enums\n\n";
  for (const e of enums) {
    md += `### ${e.pgName}\n`;
    if (e._comments) md += `\n${e._comments}\n\n`;
    md += `**Values:** ${e.values.map((v) => `\`${v}\``).join(", ")}\n\n`;
  }
  return md;
}

function mdTable(t: TableData): string {
  let md = `### ${t.pgName}\n\n`;
  if (t._comments) md += `${t._comments}\n\n`;
  md += "| Column | Type | Nullable | Default | Notes | Comments |\n| --- | --- | --- | --- | --- | --- |\n";

  for (const col of t.columns) {
    const notes: string[] = [];
    if (col.isPK) notes.push("PK");
    if (col.fk) notes.push("FK");
    if (col.isUnique) notes.push("unique");
    if (col.hasOnUpdate) notes.push("auto-updated");
    if (col.enumValues)
      notes.push(`enum(${[...col.enumValues].join(",")})`);

    const def = col.defaultDesc ? `\`${col.defaultDesc}\`` : "";
    const desc = (col._comments ?? "").replace(/\n/g, " ");
    md += `| \`${col.name}\` | ${col.sqlType} | ${col.notNull ? "NO" : "YES"} | ${def} | ${notes.join(", ")} | ${desc} |\n`;
  }

  md += "\n";
  const pkCols = t.columns.filter((c) => c.isPK);
  if (pkCols.length > 1) {
    md += `**Primary Key:** (${pkCols.map((c) => `\`${c.name}\``).join(", ")}) — composite\n`;
  } else if (pkCols.length === 1) {
    md += `**Primary Key:** \`${pkCols[0].name}\`\n`;
  }

  const fkCols = t.columns.filter((c) => c.fk);
  if (fkCols.length > 0) {
    md += "**Foreign Keys:**\n";
    for (const col of fkCols) {
      const cascade = col.fk!.onDelete
        ? ` (on delete: ${col.fk!.onDelete})`
        : "";
      md += `- \`${col.name}\` → \`${col.fk!.table}.${col.fk!.column}\`${cascade}\n`;
    }
  }

  if (t.indexes.length > 0) {
    md += "\n**Indexes:**\n";
    for (const idx of t.indexes) {
      const label = idx.isUnique ? "unique" : "index";
      md += `- \`${idx.name}\` — ${label} on (${idx.columns.map((c) => `\`${c}\``).join(", ")})\n`;
    }
  }

  md += "\n---\n\n";
  return md;
}

function mdRelationshipSummary(tables: TableData[]): string {
  const hasMany = new Map<string, Set<string>>();
  const belongsTo = new Map<string, Set<string>>();

  for (const t of tables) {
    if (!hasMany.has(t.pgName)) hasMany.set(t.pgName, new Set());
    if (!belongsTo.has(t.pgName)) belongsTo.set(t.pgName, new Set());
    for (const col of t.columns) {
      if (col.fk) {
        belongsTo.get(t.pgName)!.add(col.fk.table);
        if (!hasMany.has(col.fk.table)) hasMany.set(col.fk.table, new Set());
        hasMany.get(col.fk.table)!.add(t.pgName);
      }
    }
  }

  let md =
    "### Entity Relationship Summary\n\n| Table | Has Many | Belongs To |\n| --- | --- | --- |\n";
  for (const t of tables) {
    const hm = Array.from(hasMany.get(t.pgName) ?? []).join(", ") || "\u2014";
    const bt = Array.from(belongsTo.get(t.pgName) ?? []).join(", ") || "\u2014";
    md += `| \`${t.pgName}\` | ${hm} | ${bt} |\n`;
  }
  return md;
}

function mermaidComment(col: ColInfo): string {
  if (col.isPK && !col.fk && col.hasDefault) return col.defaultDesc;
  if (col.isPK && !col.fk && !col.hasDefault) return "no default - caller supplied";

  const parts: string[] = [col.notNull ? "not null" : "nullable"];

  if (col.fk) {
    if (col.isUnique) parts.push("unique");
    const cascade = col.fk.onDelete ? ` (${col.fk.onDelete})` : "";
    parts.push(`→ ${col.fk.table}.${col.fk.column}${cascade}`);
  } else {
    if (col.defaultDesc) parts.push(col.defaultDesc);
    if (col.isUnique) parts.push("unique");
    if (col.enumValues) parts.push(`enum(${[...col.enumValues].join(",")})`);
    if (col.hasOnUpdate) parts.push("auto-updated");
  }

  return parts.join(", ");
}

function mdMermaid(tables: TableData[]): string {
  let md = "### Relationship Diagram (Mermaid)\n\n```mermaid\nerDiagram\n";

  for (const t of tables) {
    md += `    ${t.pgName} {\n`;
    for (const col of t.columns) {
      const markers: string[] = [];
      if (col.isPK && col.fk) markers.push("PK,FK");
      else if (col.isPK) markers.push("PK");
      else if (col.fk) markers.push("FK");

      const m = markers.length > 0 ? ` ${markers.join(",")}` : "";
      const comment = mermaidComment(col);
      md += `        ${col.sqlType} ${col.name}${m} "${comment}"\n`;
    }
    md += "    }\n\n";
  }

  const seen = new Set<string>();
  for (const t of tables) {
    for (const col of t.columns) {
      if (col.fk) {
        const key = `${col.fk.table}->>${t.pgName}`;
        if (!seen.has(key)) {
          seen.add(key);
          md += `    ${col.fk.table} ||--o{ ${t.pgName} : "has many"\n`;
        }
      }
    }
  }

  md += "```\n";
  return md;
}

// ─── Main ────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("Generating SCHEMA.md...");

  const { enums, tables } = await loadSchema();
  console.log(`Found ${enums.length} enums, ${tables.length} tables`);

  let md = "# Database Schema\n\n";
  md +=
    "> Auto-generated from `packages/db/src/schema/`. Do not edit manually — run `npm run db:generate-docs` to regenerate.\n\n";
  md += mdMermaid(tables) + "\n";
  md += mdOverview(tables) + "\n";
  md += mdEnums(enums);
  md += "## Tables\n\n";
  for (const t of tables) md += mdTable(t);
  md += "## Relationships\n\n";
  md += mdRelationshipSummary(tables) + "\n";
  md += "---\n\n";
  md += `*Generated on ${new Date().toISOString().split("T")[0]}*\n`;

  fs.writeFileSync(OUTPUT_PATH, md);
  console.log(`Written to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Failed to generate schema docs:", err);
  process.exit(1);
});
