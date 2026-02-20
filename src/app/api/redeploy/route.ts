export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

    const deploymentsRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`,
      { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
    );
    if (!deploymentsRes.ok) throw new Error(await deploymentsRes.text());
    const { deployments } = await deploymentsRes.json();

    if (!deployments?.length) throw new Error('No deployments found for this project');

    const latest = deployments[0];

    const redeployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: latest.name,
        deploymentId: latest.uid,
        target: 'production',
      }),
    });

    if (!redeployRes.ok) throw new Error(await redeployRes.text());
    const data = await redeployRes.json();
    return NextResponse.json({ url: data.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}