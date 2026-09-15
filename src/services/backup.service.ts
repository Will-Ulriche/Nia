import { appDataDir, join } from '@tauri-apps/api/path';
import { copyFile, exists, mkdir } from '@tauri-apps/plugin-fs';
import { save, open, message } from '@tauri-apps/plugin-dialog';
import { SyncService } from './sync.service';

export class BackupService {
  private static readonly DB_FILENAME = 'kemitia.db';

  /**
   * Retourne le chemin absolu vers le fichier de base de données SQLite local.
   */
  private static async getDbPath(): Promise<string> {
    const dataDir = await appDataDir();
    // Le plugin sql place souvent le fichier à la racine de appDataDir
    return await join(dataDir, this.DB_FILENAME);
  }

  /**
   * Sauvegarde manuelle (boîte de dialogue native).
   */
  static async createManualBackup(): Promise<boolean> {
    try {
      const dbPath = await this.getDbPath();
      if (!(await exists(dbPath))) {
        await message("Le fichier de base de données n'existe pas encore.", { title: 'Erreur', kind: 'error' });
        return false;
      }

      const defaultName = `kemitia_backup_${new Date().toISOString().split('T')[0]}.db`;
      const savePath = await save({
        filters: [{ name: 'Base de données Kemitia', extensions: ['db', 'sqlite'] }],
        defaultPath: defaultName,
        title: 'Sauvegarder la base de données'
      });

      if (savePath) {
        await copyFile(dbPath, savePath);
        await message('La sauvegarde a été effectuée avec succès !', { title: 'Succès', kind: 'info' });
        return true;
      }
      return false; // L'utilisateur a annulé
    } catch (error) {
      console.error('[BackupService] createManualBackup failed:', error);
      await message("Une erreur est survenue lors de la sauvegarde.", { title: 'Erreur', kind: 'error' });
      return false;
    }
  }

  /**
   * Sauvegarde automatique (effectuée lors de la fermeture ou en tâche de fond).
   * Crée un dossier "AutoBackups" dans AppData et y place une copie de sécurité.
   */
  static async createAutoBackup(): Promise<void> {
    try {
      const dbPath = await this.getDbPath();
      if (!(await exists(dbPath))) return;

      const dataDir = await appDataDir();
      const backupDir = await join(dataDir, 'AutoBackups');
      
      if (!(await exists(backupDir))) {
        await mkdir(backupDir, { recursive: true });
      }

      const filename = `kemitia_autobackup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
      const targetPath = await join(backupDir, filename);

      await copyFile(dbPath, targetPath);
      console.log('[BackupService] Auto-backup created at', targetPath);
    } catch (error) {
      console.error('[BackupService] createAutoBackup failed:', error);
    }
  }

  /**
   * Restauration à partir d'un fichier sélectionné.
   */
  static async restoreBackup(): Promise<boolean> {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Base de données Kemitia', extensions: ['db', 'sqlite'] }],
        title: 'Choisir le fichier de sauvegarde'
      });

      if (selected && typeof selected === 'string') {
        const dbPath = await this.getDbPath();
        
        // Copie du fichier sélectionné par-dessus la DB existante
        await copyFile(selected, dbPath);
        
        await message('La restauration a réussi. L\'application va redémarrer.', { title: 'Succès', kind: 'info' });
        window.location.reload();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[BackupService] restoreBackup failed:', error);
      await message("Erreur lors de la restauration du fichier.", { title: 'Erreur', kind: 'error' });
      return false;
    }
  }

  /**
   * Vérifie l'état de la sauvegarde Cloud.
   * Si des mutations sont en attente, on force un Sync.
   */
  static async checkCloudBackup(schoolId: string): Promise<{ success: boolean; message: string }> {
    try {
      const pendingCount = await SyncService.getPendingMutationCount();
      if (pendingCount === 0) {
        return { success: true, message: 'La sauvegarde cloud est à jour (aucune donnée en attente).' };
      }
      
      await SyncService.fullSync(schoolId);
      
      // On revérifie après la synchro
      const countAfter = await SyncService.getPendingMutationCount();
      if (countAfter === 0) {
        return { success: true, message: 'La sauvegarde cloud a été synchronisée avec succès.' };
      } else {
        return { success: false, message: `Synchronisation partielle : il reste ${countAfter} éléments non synchronisés.` };
      }
    } catch (error: any) {
      console.error('[BackupService] Cloud backup failed:', error);
      return { success: false, message: error.message || 'Erreur lors de la synchronisation cloud.' };
    }
  }
}
