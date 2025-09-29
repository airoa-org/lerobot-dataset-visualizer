/**
 * Utility functions for checking dataset version compatibility
 */

const DATASET_URL = process.env.DATASET_URL || "https://huggingface.co/datasets";

/**
 * Dataset information structure from info.json
 */
interface DatasetInfo {
  codebase_version: string;
  robot_type: string | null;
  total_episodes: number;
  total_frames: number;
  total_tasks: number;
  chunks_size: number;
  data_files_size_in_mb: number;
  video_files_size_in_mb: number;
  fps: number;
  splits: Record<string, string>;
  data_path: string;
  video_path: string;
  features: Record<string, any>;
}

/**
 * Fetches dataset information from the main revision
 */
export async function getDatasetInfo(repoId: string, basePath: string = ""): Promise<DatasetInfo> {
  try {
  const prefix = basePath ? `${basePath.replace(/^\/+|\/+$/g, "")}/` : "";
  const testUrl = `${DATASET_URL}/${repoId}/resolve/main/${prefix}meta/info.json`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const headers: Record<string,string> = {};
    const token = process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response: Response | null = null;
    let attempt = 0;
    let lastError: any = null;
    const maxAttempts = 2; // 1 retry on transient issues
    while (attempt < maxAttempts) {
      try {
        response = await fetch(testUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers,
        });
        break; // success
      } catch (err: any) {
        lastError = err;
        if (err?.name === "AbortError") {
          // Abort -> no retry (already timed out)
          break;
        }
        attempt += 1;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 300 * attempt));
          continue;
        }
      }
    }
    
    clearTimeout(timeoutId);
    
    if (!response) {
      throw lastError || new Error("Unknown network error while fetching dataset info");
    }
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Failed to fetch dataset info: ${response.status}. ` +
          `The dataset ${repoId} may be private or gated. ` +
          `If it's private, set an access token via HF_TOKEN env variable. ` +
          `URL tried: ${testUrl}`
        );
      }
      throw new Error(`Failed to fetch dataset info: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if it has the required structure
    if (!data.features) {
      throw new Error("Dataset info.json does not have the expected features structure");
    }
    
    return data as DatasetInfo;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Dataset ${repoId} is not compatible with this visualizer. ` +
      "Failed to read dataset information from the main revision."
    );
  }
}


/**
 * Gets the dataset version by reading the codebase_version from the main revision's info.json
 */
export async function getDatasetVersion(repoId: string, basePath: string = ""): Promise<string> {
  try {
  const datasetInfo = await getDatasetInfo(repoId, basePath);
    
    // Extract codebase_version
    const codebaseVersion = datasetInfo.codebase_version;
    if (!codebaseVersion) {
      throw new Error("Dataset info.json does not contain codebase_version");
    }
    
    // Validate that it's a supported version
    const supportedVersions = ["v3.0", "v2.1", "v2.0"];
    if (!supportedVersions.includes(codebaseVersion)) {
      throw new Error(
        `Dataset ${repoId} has codebase version ${codebaseVersion}, which is not supported. ` +
        "This tool only works with dataset versions 3.0, 2.1, or 2.0. " +
        "Please use a compatible dataset version."
      );
    }
    
    return codebaseVersion;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Dataset ${repoId} is not compatible with this visualizer. ` +
      "Failed to read dataset information from the main revision."
    );
  }
}

export function buildVersionedUrl(repoId: string, version: string, path: string, basePath: string = ""): string {
  const prefix = basePath ? `${basePath.replace(/^\/+|\/+$/g, "")}/` : "";
  return `${DATASET_URL}/${repoId}/resolve/main/${prefix}${path}`;
}

