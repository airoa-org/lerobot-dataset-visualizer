"use client";
import { useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HomeInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle redirects with useEffect instead of direct redirect
  useEffect(() => {
    // Redirect to the first episode of the dataset if REPO_ID is defined
    if (process.env.REPO_ID) {
      const episodeN = process.env.EPISODES
        ?.split(/\s+/)
        .map((x) => parseInt(x.trim(), 10))
        .filter((x) => !isNaN(x))[0] ?? 0;

      router.push(`/${process.env.REPO_ID}/episode_${episodeN}`);
      return;
    }
    
    // sync with hf.co/spaces URL params
    if (searchParams.get('path')) {
      router.push(searchParams.get('path')!);
      return;
    }

    // legacy sync with hf.co/spaces URL params
    let redirectUrl: string | null = null;
    if (searchParams.get('dataset') && searchParams.get('episode')) {
      redirectUrl = `/${searchParams.get('dataset')}/episode_${searchParams.get('episode')}`;
    } else if (searchParams.get('dataset')) {
      redirectUrl = `/${searchParams.get('dataset')}`;
    }

    if (redirectUrl && searchParams.get('t')) {
      redirectUrl += `?t=${searchParams.get('t')}`;
    }

    if (redirectUrl) {
      router.push(redirectUrl);
      return;
    }
  }, [searchParams, router]);

  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Load YouTube IFrame API if not already present
    if (!(window as any).YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
    let interval: NodeJS.Timeout;
    (window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player("yt-bg-player", {
        videoId: "Er8SPJsIYr0",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          showinfo: 0,
          modestbranding: 1,
          rel: 0,
          loop: 1,
          fs: 0,
          playlist: "Er8SPJsIYr0",
          start: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
            event.target.mute();
            interval = setInterval(() => {
              const t = event.target.getCurrentTime();
              if (t >= 60) {
                event.target.seekTo(0);
              }
            }, 500);
          },
        },
      });
    };
    return () => {
      if (interval) clearInterval(interval);
      if (playerRef.current && playerRef.current.destroy)
        playerRef.current.destroy();
    };
  }, []);

  const repoPathRef = useRef<HTMLInputElement>(null);
  const subfolderRef = useRef<HTMLInputElement>(null);

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    const repoPath = repoPathRef.current?.value.trim();
    const subfolder = subfolderRef.current?.value.trim();
    
    if (repoPath) {
      // Validate that repoPath contains org/repo format
      const parts = repoPath.split('/');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        let path = repoPath;
        if (subfolder) {
          path += `/${subfolder}`;
        }
        // Automatically add /episode_0 at the end
        path += '/episode_0';
        router.push(path);
      }
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* YouTube Video Background */}
      <div className="video-background">
        <div id="yt-bg-player" />
      </div>
      {/* Overlay */}
      <div className="fixed top-0 right-0 bottom-0 left-0 bg-black/60 -z-0" />
      {/* Centered Content */}
      <div className="relative z-10 h-screen flex flex-col items-center justify-center text-white text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-lg">
          LeRobot Dataset Visualizer
        </h1>
        <a
          href="https://x.com/RemiCadene/status/1825455895561859185"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 font-medium text-lg underline mb-8 inline-block hover:text-sky-300 transition-colors"
        >
          create & train your own robots
        </a>
        <form onSubmit={handleGo} className="flex flex-col gap-4 justify-center mt-6 max-w-md mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              ref={repoPathRef}
              type="text"
              placeholder="org/repo (e.g. lerobot/pusht)"
              className="px-4 py-2 rounded-md text-base text-white bg-white/10 border border-white/20 focus:outline-none focus:border-sky-400 shadow-md"
            />
            <input
              ref={subfolderRef}
              type="text"
              placeholder="Sub-folder (optional)"
              className="px-4 py-2 rounded-md text-base text-white bg-white/10 border border-white/20 focus:outline-none focus:border-sky-400 shadow-md"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-md bg-sky-400 text-black font-semibold text-base hover:bg-sky-300 transition-colors shadow-md mx-auto"
          >
            Go to Dataset
          </button>
        </form>
        {/* Example Datasets */}
        <div className="mt-8">
          <div className="font-semibold mb-2 text-lg">Example Datasets:</div>
          <div className="flex flex-col gap-2 items-center">
            {[
              { org: "lerobot", repo: "aloha_static_cups_open", subfolder: "" },
              { org: "lerobot", repo: "columbia_cairlab_pusht_real", subfolder: "" },
              { org: "lerobot", repo: "taco_play", subfolder: "" },
            ].map((dataset) => (
              <button
                key={`${dataset.org}/${dataset.repo}`}
                type="button"
                className="px-4 py-2 rounded bg-slate-700 text-sky-200 hover:bg-sky-700 hover:text-white transition-colors shadow"
                onClick={() => {
                  if (repoPathRef.current && subfolderRef.current) {
                    repoPathRef.current.value = `${dataset.org}/${dataset.repo}`;
                    subfolderRef.current.value = dataset.subfolder;
                  }
                  const path = dataset.subfolder 
                    ? `${dataset.org}/${dataset.repo}/${dataset.subfolder}`
                    : `${dataset.org}/${dataset.repo}`;
                  router.push(path);
                }}
              >
                {dataset.org}/{dataset.repo}
              </button>
            ))}
          </div>
        </div>

        <Link
          href="/explore"
          className="inline-block px-6 py-3 mt-8 rounded-md bg-sky-500 text-white font-semibold text-lg shadow-lg hover:bg-sky-400 transition-colors"
        >
          Explore Open Datasets
        </Link>
      </div>
    </div>
  );
}
