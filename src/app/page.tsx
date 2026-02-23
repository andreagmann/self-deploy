'use client';

import { useState, useEffect } from "react";

const TABS = ["List Projects", "Create Project", "Redeploy"];

interface EnvVar { key: string; value: string; }
interface Project {
  id: string;
  name: string;
  latestDeployments?: { url: string; readyState: string }[];
}

const statusColor = (state?: string): React.CSSProperties => ({
  READY:    { backgroundColor: "var(--sap-status-ready-bg)",    color: "var(--sap-status-ready-text)" },
  ERROR:    { backgroundColor: "var(--sap-status-error-bg)",    color: "var(--sap-status-error-text)" },
  BUILDING: { backgroundColor: "var(--sap-status-building-bg)", color: "var(--sap-status-building-text)" },
}[state ?? ""] ?? { backgroundColor: "var(--sap-status-default-bg)", color: "var(--sap-status-default-text)" });

function EnvVarEditor({ envVars, setEnvVars }: { envVars: EnvVar[]; setEnvVars: (v: EnvVar[]) => void }) {
  const add = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const remove = (i: number) => setEnvVars(envVars.filter((_, j) => j !== i));
  const update = (i: number, field: string, val: string) =>
    setEnvVars(envVars.map((e, j) => j === i ? { ...e, [field]: val } : e));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" style={{ color: "var(--sap-text-primary)" }}>Environment Variables</label>
      {envVars.map((e, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ borderColor: "var(--sap-border)" }}
            placeholder="KEY"
            value={e.key}
            onChange={ev => update(i, "key", ev.target.value)}
          />
          <input
            className="flex-1 border rounded px-3 py-2 text-sm font-mono focus:outline-none"
            style={{ borderColor: "var(--sap-border)" }}
            placeholder="VALUE"
            type={e.key === "AIRTABLE_API_KEY" ? "password" : "text"}
            value={e.value}
            onChange={ev => update(i, "value", ev.target.value)}
          />
          <button onClick={() => remove(i)} className="px-2 text-lg cursor-pointer" style={{ color: "var(--sap-error)" }}>×</button>
        </div>
      ))}
      <button onClick={add} className="text-sm cursor-pointer" style={{ color: "var(--sap-brand)" }}>+ Add variable</button>
    </div>
  );
}

function ListProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
        else setError(data.error || 'Unexpected response from API');
        setLoading(false);
      })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  const filtered = projects.filter(p => p.name.includes(search));

  if (loading) return <div className="text-sm text-center py-8" style={{ color: "var(--sap-text-secondary)" }}>Loading projects...</div>;
  if (error) return <div className="text-sm text-center py-8" style={{ color: "var(--sap-error)" }}>{error}</div>;

  return (
    <div className="space-y-4">
      <input
        className="w-full border rounded px-3 py-2 text-sm focus:outline-none"
        style={{ borderColor: "var(--sap-border)" }}
        placeholder="Search projects..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="space-y-2">
        {filtered.map(p => (
          <a
            key={p.id}
            href={p.latestDeployments?.[0]?.url ? `https://${p.latestDeployments[0].url}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="border rounded-lg p-4 flex items-center justify-between transition-colors cursor-pointer"
            style={{ backgroundColor: "var(--sap-panel-bg)", borderColor: "var(--sap-border)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--sap-hover-bg)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "var(--sap-panel-bg)")}
          >
            <div>
              <div className="font-medium text-sm" style={{ color: "var(--sap-brand)" }}>{p.name}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--sap-text-secondary)" }}>{p.latestDeployments?.[0]?.url}</div>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={statusColor(p.latestDeployments?.[0]?.readyState)}>
              {p.latestDeployments?.[0]?.readyState ?? "NO DEPLOY"}
            </span>
          </a>
        ))}
        {filtered.length === 0 && <div className="text-sm text-center py-8" style={{ color: "var(--sap-text-secondary)" }}>No projects found</div>}
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
      setEnvVars([
        { key: "AIRTABLE_BASE_ID", value: "" },
        { key: "AIRTABLE_TABLE_NAME", value: "" },
      ]);
    } catch (e) {
      setStatus({ type: "error", msg: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--sap-text-primary)" }}>Project Name</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none"
          style={{ borderColor: "var(--sap-border)" }}
          placeholder="my-new-project"
          value={name}
          onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
        />
        <p className="text-xs mt-1" style={{ color: "var(--sap-text-placeholder)" }}>Lowercase letters, numbers, and hyphens only</p>
      </div>
      <EnvVarEditor envVars={envVars} setEnvVars={setEnvVars} />
      {status && (
        <div className="text-sm px-3 py-2 rounded" style={{
          backgroundColor: status.type === "error" ? "var(--sap-error-bg)" : "var(--sap-success-bg)",
          color: status.type === "error" ? "var(--sap-error)" : "var(--sap-success)"
        }}>
          {status.msg}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
        style={{ backgroundColor: "var(--sap-brand)" }}
      >
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
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
        setFetching(false);
      })
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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1" style={{ color: "var(--sap-text-primary)" }}>Select Project</label>
        <select
          className="w-full border rounded px-3 py-2 text-sm focus:outline-none cursor-pointer"
          style={{ borderColor: "var(--sap-border)" }}
          value={selected}
          onChange={e => setSelected(e.target.value)}
          disabled={fetching}
        >
          <option value="">{fetching ? "Loading..." : "-- Choose a project --"}</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      {status && (
        <div className="text-sm px-3 py-2 rounded" style={{
          backgroundColor: status.type === "error" ? "var(--sap-error-bg)" : "var(--sap-success-bg)",
          color: status.type === "error" ? "var(--sap-error)" : "var(--sap-success)"
        }}>
          {status.msg}
        </div>
      )}
      <button
        onClick={handleRedeploy}
        disabled={loading || fetching}
        className="w-full text-white rounded px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed transition-colors"
        style={{ backgroundColor: "var(--sap-brand)" }}
      >
        {loading ? "Triggering..." : "Trigger Redeploy"}
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("List Projects");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--sap-page-bg)" }}>
      {/* SAP Shell Header */}
      <div className="w-full flex items-center px-6 h-12 shadow-sm" style={{ backgroundColor: "var(--sap-shell-bg)" }}>
        <span className="font-bold text-base tracking-wide mr-4" style={{ color: "var(--sap-shell-text)" }}>SAP</span>
        <span className="text-sm font-medium opacity-90" style={{ color: "var(--sap-shell-text)" }}>DXR Issue Tracker Manager</span>
      </div>

      {/* Breadcrumb */}
      <div className="w-full px-8 py-3 border-b shadow-sm" style={{ backgroundColor: "var(--sap-panel-bg)", borderColor: "var(--sap-border)" }}>
        <p className="text-xs" style={{ color: "var(--sap-text-secondary)" }}>
          Home &rsaquo; <span style={{ color: "var(--sap-text-primary)" }}>DXR Issue Tracker Manager</span>
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "var(--sap-text-primary)" }}>Manage your DXR issue tracker deployments</h1>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--sap-border)" }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer"
              style={{
                color: tab === t ? "var(--sap-brand)" : "var(--sap-text-secondary)",
                borderColor: tab === t ? "var(--sap-brand)" : "transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="bg-white border border-t-0 rounded-b-lg shadow-sm p-6" style={{ borderColor: "var(--sap-border)", backgroundColor: "var(--sap-panel-bg)" }}>
          {tab === "List Projects" && <ListProjects />}
          {tab === "Create Project" && <CreateProject />}
          {tab === "Redeploy" && <Redeploy />}
        </div>
      </div>
    </div>
  );
}