export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const GITHUB_REPO = process.env.GITHUB_REPO!;
const SUBDIRECTORY = process.env.SUBDIRECTORY!;

export async function GET() {
  try {
    const res = await fetch('https://api.vercel.com/v9/projects?limit=100', {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return NextResponse.json(data.projects);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, envVars } = await req.json();

    if (!name) return NextResponse.json({ error: 'Project name is required' }, { status: 400 });

    const createRes = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        framework: 'nextjs',
        rootDirectory: SUBDIRECTORY,
        gitRepository: { type: 'github', repo: GITHUB_REPO },
      }),
    });

    if (!createRes.ok) throw new Error(await createRes.text());
    const project = await createRes.json();

    // Merge in the API key from the manager app's own env vars
    const allEnvVars = [
      { key: 'AIRTABLE_API_KEY', value: process.env.AIRTABLE_API_KEY! },
      ...(envVars ?? []).filter(({ key }: { key: string }) => key !== 'AIRTABLE_API_KEY'),
    ];

    const envRes = await fetch(`https://api.vercel.com/v10/projects/${project.id}/env`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        allEnvVars.map(({ key, value }: { key: string; value: string }) => ({
          key,
          value,
          target: ['production', 'preview', 'development'],
          type: 'encrypted',
        }))
      ),
    });
    if (!envRes.ok) throw new Error(await envRes.text());

    // 3. Get GitHub repo ID
    const [owner, repo] = GITHUB_REPO.split('/');
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!repoRes.ok) throw new Error(await repoRes.text());
    const repoData = await repoRes.json();

    // 4. Trigger initial deployment
    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: project.name,
        target: 'production',
        gitSource: {
          type: 'github',
          repo: GITHUB_REPO,
          ref: 'main',
          repoId: repoData.id,
        },
      }),
    });
    if (!deployRes.ok) throw new Error(await deployRes.text());

    return NextResponse.json({ id: project.id, name: project.name });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}