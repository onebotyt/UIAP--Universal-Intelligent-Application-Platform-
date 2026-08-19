import { Router } from 'express';
import { checkForUpdates, downloadUpdate, applyUpdate } from '../services/updater.js';
import { requireAuth } from '../middleware/auth.js';
import * as fs from 'fs';
import * as path from 'path';

export const systemRouter = Router();

// Read current version from package.json
// Note: In a bundled build, we need to ensure the path to package.json is correct,
// or inject the version at build time. For UIAP Edge, we'll read it relative to cwd
// or assume a fallback if it's missing.
function getCurrentVersion(): string {
  try {
    const pkgPath = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.version) return pkg.version;
    }
  } catch (err) {
    console.error('Failed to read package version:', err);
  }
  // Fallback version if unable to read (so it can always trigger an update if github has > 0.1.0)
  return '0.1.0';
}

/**
 * GET /api/system/update
 * Checks GitHub for the latest release and returns update status.
 */
systemRouter.get('/update', requireAuth, async (req, res) => {
  try {
    const currentVersion = getCurrentVersion();
    const updateInfo = await checkForUpdates(currentVersion);
    
    res.json({
      success: true,
      currentVersion,
      ...updateInfo
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/system/update/apply
 * Downloads the latest update and spawns the installer to apply it.
 */
systemRouter.post('/update/apply', requireAuth, async (req, res) => {
  try {
    const currentVersion = getCurrentVersion();
    const updateInfo = await checkForUpdates(currentVersion);

    if (!updateInfo.updateAvailable || !updateInfo.assetUrl) {
      res.status(400).json({ success: false, error: 'No update available to apply' });
      return;
    }

    // Acknowledge the request immediately before starting the long download
    res.json({ 
      success: true, 
      message: 'Update download started. The system will restart shortly when the update is applied.' 
    });

    // Start background download and apply
    // We do this async so the API response isn't blocked by the download
    (async () => {
      try {
        const installerPath = await downloadUpdate(updateInfo.assetUrl!);
        applyUpdate(installerPath);
      } catch (err) {
        console.error('[Updater] Failed to apply update in background:', err);
      }
    })();

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
