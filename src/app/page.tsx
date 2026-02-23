'use client';

import { useState, useEffect } from "react";

const TABS = ["List Projects", "Create Project", "Redeploy"];

interface EnvVar { key: string; value: string; }
interface Project {
  id: string;
  name: string;
  latestDeployments?: { url: string; readyState: string }[];
}

const c = {
  brand:              "var(--sap-brand)",
  shellBg:            "var(--sap-shell-bg)",
  shellText:          "var(--sap-shell-text)",
  pageBg:             "var(--sap-page-bg)",
  panelBg:            "var(--sap-panel-bg)",
  border:             "var(--sap-border)",
  textPrimary:        "var(--sap-text-primary)",
  textSecondary:      "var(--sap-text-secondary)",
  textPlaceholder:    "var(--sap-text-placeholder)",
  error:              "var(--sap-error)",
  errorBg:            "var(--sap-error-bg)",
  success:            "var(--sap-success)",
  successBg:          "var(--sap-success-bg)",
  hoverBg:            "var(--sap-hover-bg)",
  statusReadyBg:      "var(--sap-status-ready-bg)",
  statusReadyText:    "var(--sap-status-ready-text)",
  statusErrorBg:      "var(--sap-status-error-bg)",
  statusErrorText:    "var(--sap-status-error-text)",
  statusBuildingBg:   "var(--sap-status-building-bg)",
  statusBuildingText: "var(--sap-status-building-text)",
  statusDefaultBg:    "var(--sap-status-default-bg)",
  statusDefaultText:  "var(--sap-status-default-text)",
};

const font = "'72', '72full', Arial, Helvetica, sans-serif";

const statusStyle = (state?: string): React.CSSProperties => ({
  READY:    { backgroundColor: c.statusReadyBg,    color: c.statusReadyText },
  ERROR:    { backgroundColor: c.statusErrorBg,    color: c.statusErrorText },
  BUILDING: { backgroundColor: c.statusBuildingBg, color: c.statusBuildingText },
}[state ?? ""] ?? { backgroundColor: c.statusDefaultBg, color: c.statusDefaultText });

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 480,
  border: `1px solid ${c.border}`,
  borderRadius: 4,
  padding: "8px 12px",
  fontSize: 14,
  fontFamily: font,
  outline: "none",
  backgroundColor: c.panelBg,
  color: c.textPrimary,
  boxSizing: "border-box",
};

const btnPrimary = (disabled = false): React.CSSProperties => ({
  width: "100%",
  backgroundColor: c.brand,
  color: c.shellText,
  border: "none",
  borderRadius: 4,
  padding: "9px 16px",
  fontSize: 14,
  fontFamily: font,
  fontWeight: 500,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

function EnvVarEditor({ envVars, setEnvVars }: { envVars: EnvVar[]; setEnvVars: (v: EnvVar[]) => void }) {
  const add = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const remove = (i: number) => setEnvVars(envVars.filter((_, j) => j !== i));
  const update = (i: number, field: string, val: string) =>
    setEnvVars(envVars.map((e, j) => j === i ? { ...e, [field]: val } : e));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 14, fontWeight: 500, color: c.textPrimary }}>Environment Variables</label>
      {envVars.map((e, i) => (
        <div key={i} style={{ display: "flex", gap: 8 }}>
          <input style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} placeholder="KEY" value={e.key} onChange={ev => update(i, "key", ev.target.value)} />
          <input style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} placeholder="VALUE" type={e.key === "AIRTABLE_API_KEY" ? "password" : "text"} value={e.value} onChange={ev => update(i, "value", ev.target.value)} />
          <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: c.error, fontSize: 20, cursor: "pointer", padding: "0 8px" }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{ background: "none", border: "none", color: c.brand, fontSize: 14, cursor: "pointer", textAlign: "left", padding: 0 }}>+ Add variable</button>
    </div>
  );
}

function ListProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
        else setError(data.error || "Unexpected response");
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const filtered = projects.filter(p => p.name.includes(search));

  if (loading) return <p style={{ color: c.textSecondary, fontSize: 14, textAlign: "center", padding: "32px 0" }}>Loading projects...</p>;
  if (error) return <p style={{ color: c.error, fontSize: 14, textAlign: "center", padding: "32px 0" }}>{error}</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <input style={inputStyle} placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(p => (
          <a
            key={p.id}
            href={p.latestDeployments?.[0]?.url ? `https://${p.latestDeployments[0].url}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setHoveredId(p.id)}
            onMouseLeave={() => setHoveredId(null)}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, border: `1px solid ${c.border}`, borderRadius: 6, backgroundColor: hoveredId === p.id ? c.hoverBg : c.panelBg, textDecoration: "none", cursor: "pointer", transition: "background-color 0.15s" }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: c.brand }}>{p.name}</div>
              <div style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>{p.latestDeployments?.[0]?.url}</div>
            </div>
            <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 999, fontWeight: 500, ...statusStyle(p.latestDeployments?.[0]?.readyState) }}>
              {p.latestDeployments?.[0]?.readyState ?? "NO DEPLOY"}
            </span>
          </a>
        ))}
        {filtered.length === 0 && <p style={{ color: c.textSecondary, fontSize: 14, textAlign: "center", padding: "32px 0" }}>No projects found</p>}
      </div>
    </div>
  );
}

function CreateProject() {
  const [name, setName] = useState("");
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { key: "AIRTABLE_BASE_ID", value: "" },
    { key: "AIRTABLE_TABLE_NAME", value: "" },
  ]);
  const [status, setStatus] = useState<{ type: string; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name) return setStatus({ type: "error", msg: "Project name is required." });
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, envVars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: "success", msg: `Project "${data.name}" created successfully!` });
      setName("");
      setEnvVars([{ key: "AIRTABLE_BASE_ID", value: "" }, { key: "AIRTABLE_TABLE_NAME", value: "" }]);
    } catch (e) {
      setStatus({ type: "error", msg: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: c.textPrimary, marginBottom: 4 }}>Project Name</label>
        <input style={inputStyle} placeholder="my-new-project" value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
        <p style={{ fontSize: 12, color: c.textPlaceholder, marginTop: 4 }}>Lowercase letters, numbers, and hyphens only</p>
      </div>
      <EnvVarEditor envVars={envVars} setEnvVars={setEnvVars} />
      {status && (
        <div style={{ fontSize: 14, padding: "8px 12px", borderRadius: 4, backgroundColor: status.type === "error" ? c.errorBg : c.successBg, color: status.type === "error" ? c.error : c.success }}>
          {status.msg}
        </div>
      )}
      <button onClick={handleSubmit} disabled={loading} style={btnPrimary(loading)}>
        {loading ? "Creating..." : "Create Project"}
      </button>
    </div>
  );
}

function Redeploy() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState<{ type: string; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProjects(data); setFetching(false); })
      .catch(() => setFetching(false));
  }, []);

  const handleRedeploy = async () => {
    if (!selected) return setStatus({ type: "error", msg: "Select a project first." });
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/redeploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: "success", msg: `Redeployment triggered! URL: ${data.url}` });
    } catch (e) {
      setStatus({ type: "error", msg: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: c.textPrimary, marginBottom: 4 }}>Select Project</label>
        <select style={{ ...inputStyle, cursor: "pointer", appearance: "auto" }} value={selected} onChange={e => setSelected(e.target.value)} disabled={fetching}>
          <option value="">{fetching ? "Loading..." : "-- Choose a project --"}</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      {status && (
        <div style={{ fontSize: 14, padding: "8px 12px", borderRadius: 4, backgroundColor: status.type === "error" ? c.errorBg : c.successBg, color: status.type === "error" ? c.error : c.success }}>
          {status.msg}
        </div>
      )}
      <button onClick={handleRedeploy} disabled={loading || fetching} style={btnPrimary(loading || fetching)}>
        {loading ? "Triggering..." : "Trigger Redeploy"}
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("List Projects");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: c.pageBg, fontFamily: font }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, color: c.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>DXR Issue Tracker Manager</h2>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: c.textPrimary, marginBottom: 24 }}>Manage your DXR issue tracker deployments</h1>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${c.border}` }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "12px 20px",
                fontSize: 14,
                fontWeight: 500,
                fontFamily: font,
                border: "none",
                borderBottom: tab === t ? `2px solid ${c.brand}` : "2px solid transparent",
                backgroundColor: "transparent",
                color: tab === t ? c.brand : c.textSecondary,
                cursor: "pointer",
                marginBottom: -1,
                transition: "color 0.15s",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div style={{ backgroundColor: c.panelBg, border: `1px solid ${c.border}`, borderTop: "none", borderRadius: "0 0 6px 6px", padding: 24, boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
          {tab === "List Projects" && <ListProjects />}
          {tab === "Create Project" && <CreateProject />}
          {tab === "Redeploy" && <Redeploy />}
        </div>
      </div>
    </div>
  );
}