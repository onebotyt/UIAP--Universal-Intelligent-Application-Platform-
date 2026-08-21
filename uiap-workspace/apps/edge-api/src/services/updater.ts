import { exec } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const GITHUB_REPO = 'onebotyt/UIAP--Universal-Intelligent-Application-Platform-';

export interface UpdateInfo {
  updateAvailable: boolean;
  version?: string;
  releaseNotes?: string;
  assetUrl?: string;
}

/**
 * Checks GitHub releases for a newer version than the current package version.
 * @param currentVersion The version from package.json
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateInfo> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'User-Agent': 'UIAP-Edge-Updater',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // No releases found yet
        return { updateAvailable: false };
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const release: any = await response.json();
    let latestVersion = release.tag_name;

    // Strip leading 'v' if present (e.g. 'v0.2.0' -> '0.2.0')
    if (latestVersion.startsWith('v')) {
      latestVersion = latestVersion.substring(1);
    }

    // Basic version comparison (assumes semver e.g. 0.1.0)
    // A robust app might use the 'semver' package, but this works for basic checks.
    if (latestVersion !== currentVersion) {
      // Find the .exe asset
      const setupAsset = release.assets?.find((a: any) => a.name.endsWith('.exe'));

      if (setupAsset) {
        return {
          updateAvailable: true,
          version: latestVersion,
          releaseNotes: release.body,
          assetUrl: setupAsset.browser_download_url,
        };
      }
    }

    return { updateAvailable: false };
  } catch (error) {
    console.error('[Updater] Failed to check for updates:', error);
    return { updateAvailable: false };
  }
}

/**
 * Downloads the update asset to a temporary directory.
 */
export async function downloadUpdate(assetUrl: string): Promise<string> {
  const tempPath = join(tmpdir(), `UIAP-Setup-${Date.now()}.exe`);
  console.log(`[Updater] Downloading update to ${tempPath}`);

  // Fetch supports following redirects by default which GitHub uses for assets
  const response = await fetch(assetUrl, {
    headers: {
      'User-Agent': 'UIAP-Edge-Updater',
      Accept: 'application/octet-stream',
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download update: ${response.statusText}`);
  }

  const fileStream = createWriteStream(tempPath);

  // Convert Web stream to Node readable stream
  // @ts-ignore
  const readable = Readable.fromWeb(response.body);

  return new Promise((resolve, reject) => {
    readable.pipe(fileStream);
    readable.on('error', reject);
    fileStream.on('finish', () => resolve(tempPath));
    fileStream.on('error', reject);
  });
}

/**
 * Spawns the downloaded installer silently and allows it to kill the current process.
 */
export function applyUpdate(installerPath: string): void {
  console.log(`[Updater] Launching installer: ${installerPath}`);

  // Launch detached process
  const child = exec(
    `"${installerPath}" /VERYSILENT /SUPPRESSMSGBOXES /FORCECLOSEAPPLICATIONS /LOG`,
    {
      windowsHide: true,
    },
  );

  child.unref();

  // The installer will forcefully close this node process,
  // but we can proactively exit if we want, or just wait to be killed.
  // Wait a moment before exiting to ensure the installer has time to launch.
  setTimeout(() => {
    console.log('[Updater] Exiting process to allow update to proceed...');
    process.exit(0);
  }, 3000);
}
