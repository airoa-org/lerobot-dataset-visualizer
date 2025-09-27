import { redirect } from "next/navigation";
import EpisodeViewer from "../[episode]/episode-viewer";
import { getEpisodeDataSafe } from "../[episode]/fetch-data";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function DatasetSubpathPage({
  params,
}: {
  params: Promise<{ org: string; dataset: string; rest: string[] }>;
}) {
  const { org, dataset, rest } = await params;
  const last = rest?.[rest.length - 1] || "";

  // If no episode segment, redirect to episode_0 within this subpath
  if (!/^episode_\d+$/.test(last)) {
    const episodeN = process.env.EPISODES
      ?.split(/\s+/)
      .map((x) => parseInt(x.trim(), 10))
      .filter((x) => !isNaN(x))[0] ?? 0;
    const base = rest?.length ? `${rest.join("/")}/` : "";
    redirect(`/${org}/${dataset}/${base}episode_${episodeN}`);
  }

  // Render the episode inside this subpath
  const basePath = rest.slice(0, -1).join("/");
  const episodeNumber = Number(last.replace(/^episode_/, ""));
  const { data, error } = await getEpisodeDataSafe(org, dataset, episodeNumber, basePath);
  return (
    <Suspense fallback={null}>
      <EpisodeViewer data={data} error={error} org={org} dataset={dataset} basePath={basePath} />
    </Suspense>
  );
}
