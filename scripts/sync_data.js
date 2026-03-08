const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const MASTER_PATH = path.join(DATA_DIR, 'master.json');
const INBOX_DIR = path.join(DATA_DIR, 'inbox');
const TRIAGED_DIR = path.join(DATA_DIR, 'triaged');
const IMPORT_DIR = path.join(DATA_DIR, 'import');
const MANUAL_QUEUE_PATH = path.join(DATA_DIR, 'manual_queue.json');

const TODAY = new Date().toISOString().split('T')[0].split('-').reverse().join('_'); // DD_MM_YYYY
const SNAPSHOT_PATH = path.join(DATA_DIR, `${TODAY}.json`);

function sync() {
  console.log('--- immoSearch Data Sync Cycle Started ---');

  let master = [];
  if (fs.existsSync(MASTER_PATH)) {
    master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
  }

  const dailySnapshot = [];

  // 1. Process Manual Queue (PRIORITY 1)
  if (fs.existsSync(MANUAL_QUEUE_PATH)) {
    let manualItems = JSON.parse(fs.readFileSync(MANUAL_QUEUE_PATH, 'utf8'));
    
    // Only process Pending items
    const pendingItems = manualItems.filter(item => !item.status || item.status === 'Pending');
    
    if (pendingItems.length > 0) {
      console.log(`Processing ${pendingItems.length} pending manual leads...`);
      
      manualItems = manualItems.map(item => {
        if (!item.status || item.status === 'Pending') {
          try {
            // Basic validation
            if (!item.address || !item.area) throw new Error('Missing address or area');
            
            const processedItem = processItem(item, master, true);
            dailySnapshot.push(processedItem);
            
            return {
              ...item,
              status: 'Completed',
              processed_at: new Date().toISOString()
            };
          } catch (e) {
            return {
              ...item,
              status: 'Failed',
              error: e.message,
              processed_at: new Date().toISOString()
            };
          }
        }
        return item;
      });
      
      fs.writeFileSync(MANUAL_QUEUE_PATH, JSON.stringify(manualItems, null, 2));
    }
  }

  // 2. Process Import Directory (PRIORITY 2)
  if (fs.existsSync(IMPORT_DIR)) {
    const importFiles = fs.readdirSync(IMPORT_DIR).filter(f => f.endsWith('.json'));
    importFiles.forEach(file => {
      console.log(`Importing ${file}...`);
      try {
        const items = JSON.parse(fs.readFileSync(path.join(IMPORT_DIR, file), 'utf8'));
        items.forEach(item => {
          const processedItem = processItem(item, master);
          dailySnapshot.push(processedItem);
        });
        
        // Archive imports
        const archiveDir = path.join(DATA_DIR, 'archive/imports');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        fs.renameSync(path.join(IMPORT_DIR, file), path.join(archiveDir, `${Date.now()}_${file}`));
      } catch (e) {
        console.error(`Failed to import ${file}: ${e.message}`);
      }
    });
  }

  // 3. Process Triaged Inbox Leads (PRIORITY 3)
  if (fs.existsSync(TRIAGED_DIR)) {
    const triagedFiles = fs.readdirSync(TRIAGED_DIR).filter(f => f.endsWith('.json'));
    if (triagedFiles.length > 0) {
      console.log(`Processing ${triagedFiles.length} triaged inbox leads...`);
      
      triagedFiles.forEach(file => {
        try {
          const item = JSON.parse(fs.readFileSync(path.join(TRIAGED_DIR, file), 'utf8'));
          const processedItem = processItem(item, master);
          dailySnapshot.push(processedItem);
          
          // Archive triaged lead
          const archiveDir = path.join(DATA_DIR, 'archive/triaged');
          if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
          fs.renameSync(path.join(TRIAGED_DIR, file), path.join(archiveDir, `${Date.now()}_${file}`));
        } catch (e) {
          console.error(`Failed to sync triaged lead ${file}: ${e.message}`);
        }
      });
    }
  }

  // 4. Update Master Registry
  dailySnapshot.forEach(newItem => {
    const index = master.findIndex(m => m.address === newItem.address && m.area === newItem.area);
    if (index > -1) {
      // Update existing
      master[index] = {
        ...master[index],
        ...newItem,
        metadata: {
          ...master[index].metadata,
          last_seen: new Date().toISOString().split('T')[0],
          discovery_count: (master[index].metadata.discovery_count || 1) + 1,
          is_new: false
        }
      };
    } else {
      // Add new
      master.push({
        ...newItem,
        id: newItem.id || crypto.randomUUID(),
        metadata: {
          first_seen: new Date().toISOString().split('T')[0],
          last_seen: new Date().toISOString().split('T')[0],
          discovery_count: 1,
          is_new: true
        }
      });
    }
  });

  // 5. Save Outputs
  if (dailySnapshot.length > 0) {
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(dailySnapshot, null, 2));
    updateManifest(path.basename(SNAPSHOT_PATH));
  }
  
  fs.writeFileSync(MASTER_PATH, JSON.stringify(master, null, 2));

  console.log(`--- Sync Cycle Complete. Snapshot: ${dailySnapshot.length} assets, Master: ${master.length} assets ---`);
}

function processItem(item, master, isManual = false) {
  const listPrice = item.list_price || 0;
  const realisticPrice = item.realistic_price || (listPrice * 0.97); 
  
  // Remove lifecycle-only fields from the registry item
  const { status, processed_at, error, ...cleanItem } = item;

  return {
    ...cleanItem,
    realistic_price: Math.round(realisticPrice),
    is_value_buy: item.is_value_buy !== undefined ? item.is_value_buy : (realisticPrice < listPrice)
  };
}

function updateManifest(filename) {
  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  let manifest = [];
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  if (!manifest.includes(filename)) {
    manifest.unshift(filename);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest.slice(0, 30), null, 2));
  }
}

sync();
