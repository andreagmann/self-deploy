'use client';

import { useState, useEffect } from "react";

const TABS = ["List Projects", "Create Project", "Redeploy"];

interface EnvVar { key: string; value: string; }
interface Project {
  id: string;
  name: string;
  latestDeployments?: { url: string; readyState: string }[];
}

const statusColor = (state?: string) => ({
  READY: "bg-green-100 text-green-700",
  ERROR: "bg-red-100 text-red-700",
  BUILDING: "bg-yellow-100 text-yellow-700",
}[state ?? ""] ?? "bg-gray-100 text-gray-600");

function EnvVarEditor({ envVars, setEnvVars }: { envVars: EnvVar[]; setEnvVars: (v: EnvVar[]) => void }) {
  const add = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const remove = (i: number) => setEnvVars(envVars.filter((_, j) => j !== i));
  const update = (i: number, field: string, val: string) =>
    setEnvVars(envVars.map((e, j) => j === i ? { ...e, [field]: val } : e));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Environment Variables</label>
      {envVars.map((e, i) => (
        <div key={i} className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2 text-sm font-mono"
            placeholder="KEY"
            value={e.key}
            onChange={ev => update(i, "key", ev.target.value)}
          />
          <input
            className="flex-1 border rounded px-3 py-2 text-sm font-mono"
            placeholder="VALUE"
            type={e.key === "AIRTABLE_API_KEY" ? "password" : "text"}
            value={e.value}
            onChange={ev => update(i, "value", ev.target.value)}
          />
          <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 px-2 text-lg">×</button>
        </div>
      ))}
      <button onClick={add} className="text-sm text-blue-600 hover:underline">+ Add variable</button>
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

  if (loading) return <div className="text-sm text-gray-400 text-center py-8">Loading projects...</div>;
  if (error) return <div className="text-sm text-red-500 text-center py-8">{error}</div>;

  return (
    <div className="space-y-4">
      <input
        className="w-full border rounded px-3 py-2 text-sm"
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
            className="border rounded-lg p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div>
              <div className="font-medium text-sm">{p.name}</div>
              <div className="text-xs text-gray-500">{p.latestDeployments?.[0]?.url}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(p.latestDeployments?.[0]?.readyState)}`}>
              {p.latestDeployments?.[0]?.readyState ?? "NO DEPLOY"}
            </span>
          </a>
        ))}
        {filtered.length === 0 && <div className="text-sm text-gray-400 text-center py-8">No projects found</div>}
      </div>
    </div>
  );
}

function CreateProject() {
  const [name, setName] = useState("");
  const [envVars, setEnvVars] = useState<EnvVar[]>([
    { key: "AIRTABLE_API_KEY", value: "patd1xNEucLwX2u0a." },
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
        { key: "AIRTABLE_API_KEY", value: "patd1xNEucLwX2u0a." },
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
        <input
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="my-new-project"
          value={name}
          onChange={e => setName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
        />
        <p className="text-xs text-gray-400 mt-1">Lowercase letters, numbers, and hyphens only</p>
      </div>
      <EnvVarEditor envVars={envVars} setEnvVars={setEnvVars} />
      {status && (
        <div className={`text-sm px-3 py-2 rounded ${status.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {status.msg}
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
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
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
        <select
          className="w-full border rounded px-3 py-2 text-sm"
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
        <div className={`text-sm px-3 py-2 rounded ${status.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
          {status.msg}
        </div>
      )}
      <button
        onClick={handleRedeploy}
        disabled={loading || fetching}
        className="w-full bg-black text-white rounded px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Triggering..." : "Trigger Redeploy"}
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("List Projects");

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">DXR Issue Tracker Project Manager</h1>
          <p className="text-sm text-gray-500">Manage your DXR Issue Tracker deployments</p>
        </div>
        <div className="flex border-b mb-6">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? "border-black text-black" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="bg-white border rounded-lg p-6">
          {tab === "List Projects" && <ListProjects />}
          {tab === "Create Project" && <CreateProject />}
          {tab === "Redeploy" && <Redeploy />}
        </div>
      </div>
    </div>
  );
}