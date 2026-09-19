/*************************************************
 * XI TKJ 1 WEBSITE — GOOGLE APPS SCRIPT BACKEND
 * Drive only — tanpa database / spreadsheet
 *
 * Main folder:
 * 1HYubSHq8072K2NVjEyi2H24C9wB-u_1m
 *************************************************/

const MAIN_FOLDER_ID = '1HYubSHq8072K2NVjEyi2H24C9wB-u_1m';
const FOLDERS = {
  attendance: 'Absensi Muka',
  barcode: 'Barcode Siswa',
  music: 'Music',
  covers: 'Music Covers',
  assets: 'Website Assets'
};

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || 'ping';
    let result;

    switch (action) {
      case 'ping':
        result = {ok:true, success:true, message:'API XI TKJ 1 aktif', time:new Date().toISOString()};
        break;
      case 'setup':
        result = setupFolders_();
        break;
      case 'attendanceStatus':
        result = attendanceStatus_(p.date || jakartaDate_(), p.nisn || '');
        break;
      case 'listFaceAttendance':
        result = {ok:true, face:listAttendance_(p.date || jakartaDate_()).face};
        break;
      case 'attendanceSummary':
        result = attendanceSummary_(p.date || jakartaDate_());
        break;
      case 'listAttendance':
        result = attendanceSummary_(p.date || jakartaDate_());
        break;
      case 'listAssets':
        result = listAllAssets_();
        break;
      case 'listBarcodes':
        result = listFolderFiles_(FOLDERS.barcode);
        break;
      case 'listMusic':
        result = listFolderFiles_(FOLDERS.music);
        break;
      case 'listCovers':
        result = listFolderFiles_(FOLDERS.covers);
        break;
      case 'listWebsiteAssets':
        result = listFolderFiles_(FOLDERS.assets);
        break;
      case 'listSongRequests':
        result = listSongRequests_();
        break;
      default:
        result = {ok:false, success:false, error:'Action tidak dikenal: '+action};
    }

    return output_(result, p.callback);
  } catch (err) {
    return output_({ok:false, success:false, error:String(err && err.message || err)}, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const action = p.action || '';
    let result;

    switch (action) {
      case 'uploadFaceAttendance':
      case 'attendance':
      case 'submitAttendance':
      case 'absenMuka':
        result = saveFaceAttendance_(p);
        break;
      case 'saveBarcodeAttendance':
        result = saveBarcodeAttendance_(p);
        break;
      case 'saveSongRequest':
        result = saveDriveImage_(p, 'REQUEST LAGU', 'song-request');
        break;
      case 'saveFinanceSnapshot':
        result = saveDriveImage_(p, 'SNAPSHOT KEUANGAN', 'finance-snapshot');
        break;
      case 'saveDriveImage':
        result = saveDriveImage_(p, 'CLASS EXPORT', p.kind || 'class-image');
        break;
      default:
        result = {ok:false, success:false, error:'Action POST tidak dikenal: '+action};
    }

    return output_(result, p.callback);
  } catch (err) {
    return output_({ok:false, success:false, error:String(err && err.message || err)}, e && e.parameter && e.parameter.callback);
  }
}

/* =========================
   ABSENSI FOTO MUKA
========================= */
function saveFaceAttendance_(p) {
  const nisn = clean_(p.nisn);
  const name = clean_(p.name || p.nama);
  const date = clean_(p.date) || jakartaDate_();
  const time = clean_(p.time) || jakartaTime_();
  const imageData = clean_(p.imageData || p.image || p.photo);

  if (!nisn) return {ok:false, error:'NISN belum dikirim'};
  if (!name) return {ok:false, error:'Nama siswa belum dikirim'};
  if (!imageData) return {ok:false, error:'Data foto belum dikirim'};

  const root = childFolder_(mainFolder_(), FOLDERS.attendance, true);
  const dayFolder = childFolder_(root, date, true);

  // Satu foto muka per siswa per hari. Kalau kirim ulang, foto lama dibuang.
  trashExisting_(dayFolder, nisn, 'FOTO MUKA');

  const bytes = decodeBase64_(imageData, 12000000);
  const fileName = safeFileName_(name)+'_'+nisn+'_'+date+'_'+String(time).replace(/:/g,'-')+'.jpg';
  const file = dayFolder.createFile(Utilities.newBlob(bytes, 'image/jpeg', fileName));

  const record = {
    nisn: nisn,
    name: name,
    kelas: clean_(p.kelas) || 'XI TKJ 1',
    date: date,
    time: time,
    timestamp: new Date().toISOString(),
    status: 'H',
    metode: 'FOTO MUKA',
    latitude: clean_(p.latitude),
    longitude: clean_(p.longitude),
    accuracy: clean_(p.accuracy),
    mapsUrl: clean_(p.mapsUrl),
    locationText: clean_(p.locationText || p.address),
    type: 'face-attendance'
  };

  file.setDescription(JSON.stringify(record));
  safeShare_(file);

  return withFileUrls_(record, file);
}

/* =========================
   ABSENSI BARCODE
========================= */
function saveBarcodeAttendance_(p) {
  const nisn = clean_(p.nisn);
  const name = clean_(p.name || p.nama);
  const date = clean_(p.date) || jakartaDate_();
  const time = clean_(p.time) || jakartaTime_();

  if (!nisn) return {ok:false, error:'NISN belum dikirim'};
  if (!name) return {ok:false, error:'Nama siswa belum dikirim'};

  const root = childFolder_(mainFolder_(), FOLDERS.attendance, true);
  const dayFolder = childFolder_(root, date, true);
  trashExisting_(dayFolder, nisn, 'BARCODE');

  // Bukti barcode berupa file TXT ringan. Tidak perlu database.
  const record = {
    nisn: nisn,
    name: name,
    kelas: clean_(p.kelas) || 'XI TKJ 1',
    date: date,
    time: time,
    timestamp: new Date().toISOString(),
    status: 'H',
    metode: 'BARCODE',
    type: 'barcode-attendance'
  };

  const text = [
    'ABSENSI BARCODE XI TKJ 1',
    'Nama: '+name,
    'NISN: '+nisn,
    'Tanggal: '+date,
    'Waktu: '+time,
    'Status: HADIR'
  ].join('\n');

  const file = dayFolder.createFile(
    Utilities.newBlob(text, 'text/plain', 'BARCODE_'+nisn+'_'+date+'.txt')
  );
  file.setDescription(JSON.stringify(record));

  return withFileUrls_(record, file);
}

function attendanceStatus_(date, nisn) {
  const summary = attendanceSummary_(date);
  const face = (summary.face || []).find(r => String(r.nisn) === String(nisn));
  const barcode = (summary.barcode || []).find(r => String(r.nisn) === String(nisn));
  return {
    ok:true,
    faceDone:!!face,
    barcodeDone:!!barcode,
    record: face || barcode || null
  };
}

function attendanceSummary_(date) {
  const data = listAttendance_(date);
  return {
    ok:true,
    success:true,
    date:date,
    face:data.face,
    barcode:data.barcode,
    totalFace:data.face.length,
    totalBarcode:data.barcode.length
  };
}

function listAttendance_(date) {
  const root = childFolder_(mainFolder_(), FOLDERS.attendance, false);
  if (!root) return {face:[], barcode:[]};
  const dayFolder = childFolder_(root, date, false);
  if (!dayFolder) return {face:[], barcode:[]};

  const face = [];
  const barcode = [];
  const files = dayFolder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const desc = file.getDescription();
    if (!desc) continue;
    try {
      const r = JSON.parse(desc);
      if (!r.nisn) continue;
      const out = withFileUrls_(r, file);
      if (r.type === 'face-attendance' || r.metode === 'FOTO MUKA') face.push(out);
      else if (r.type === 'barcode-attendance' || r.metode === 'BARCODE') barcode.push(out);
    } catch (_) {}
  }

  face.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  barcode.sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));
  return {face:face, barcode:barcode};
}

function trashExisting_(folder, nisn, method) {
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const desc = file.getDescription();
    if (!desc) continue;
    try {
      const r = JSON.parse(desc);
      if (String(r.nisn) === String(nisn) && String(r.metode || '') === String(method)) file.setTrashed(true);
    } catch (_) {}
  }
}

/* =========================
   DRIVE ASSETS
========================= */
function listAllAssets_() {
  return {
    ok:true,
    success:true,
    barcode:listFolderFiles_(FOLDERS.barcode),
    music:listFolderFiles_(FOLDERS.music),
    covers:listFolderFiles_(FOLDERS.covers),
    websiteAssets:listFolderFiles_(FOLDERS.assets)
  };
}

function listFolderFiles_(folderName) {
  const folder = childFolder_(mainFolder_(), folderName, false);
  if (!folder) return {success:false, folder:folderName, files:[]};

  const files = [];
  const it = folder.getFiles();
  while (it.hasNext()) {
    const file = it.next();
    const id = file.getId();
    // Asset files need to be readable by visitors on other phones.
    safeShare_(file);
    files.push({
      id:id,
      name:file.getName(),
      mimeType:file.getMimeType(),
      size:file.getSize(),
      viewUrl:'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1600',
      downloadUrl:'https://drive.google.com/uc?export=download&id='+encodeURIComponent(id),
      openUrl:'https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view'
    });
  }
  files.sort((a,b)=>a.name.localeCompare(b.name, undefined, {numeric:true, sensitivity:'base'}));
  return {success:true, folder:folderName, files:files, total:files.length};
}

/* =========================
   REQUEST / EXPORT LAMA
========================= */
function saveDriveImage_(p, folderName, kind) {
  const imageData = clean_(p.imageData);
  if (!imageData) return {ok:false, error:'imageData kosong'};
  const bytes = decodeBase64_(imageData, 12000000);
  const mime = clean_(p.mimeType) || 'image/png';
  const fileName = safeFileName_(p.fileName || ('XI-TKJ1-'+Date.now()+'.png'));
  const folder = childFolder_(mainFolder_(), folderName, true);
  const file = folder.createFile(Utilities.newBlob(bytes, mime, fileName));
  let meta = {};
  try { meta = JSON.parse(p.meta || '{}'); } catch (_) {}
  meta.type = kind;
  meta.createdAt = new Date().toISOString();
  meta.name = clean_(p.name);
  meta.nisn = clean_(p.nisn);
  meta.title = clean_(p.title);
  meta.artist = clean_(p.artist);
  file.setDescription(JSON.stringify(meta));
  safeShare_(file);
  return {ok:true, id:file.getId(), url:file.getUrl(), thumbnail:thumbnailUrl_(file.getId()), name:file.getName(), kind:kind};
}


function listSongRequests_() {
  const folder = childFolder_(mainFolder_(), 'REQUEST LAGU', false);
  if (!folder) return {ok:true, requests:[]};
  const requests = [];
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const desc = file.getDescription();
    if (!desc) continue;
    try {
      const m = JSON.parse(desc);
      if (m.type !== 'song-request') continue;
      requests.push({
        title:m.title || file.getName(),
        artist:m.artist || '',
        name:m.name || 'Siswa',
        nisn:m.nisn || '',
        date:m.date || '',
        time:m.time || '',
        url:file.getUrl(),
        id:file.getId(),
        thumbnail:thumbnailUrl_(file.getId())
      });
    } catch (_) {}
  }
  requests.sort((a,b)=>String(b.date+' '+b.time).localeCompare(String(a.date+' '+a.time)));
  return {ok:true, requests:requests};
}

/* =========================
   FOLDER HELPERS
========================= */
function setupFolders_() {
  const main = mainFolder_();
  const out = [];
  Object.keys(FOLDERS).forEach(k => {
    const name = FOLDERS[k];
    const folder = childFolder_(main, name, true);
    out.push({key:k, name:name, id:folder.getId(), url:'https://drive.google.com/drive/folders/'+folder.getId()});
  });
  return {ok:true, success:true, folders:out};
}

function mainFolder_() { return DriveApp.getFolderById(MAIN_FOLDER_ID); }

function childFolder_(parent, name, createIfMissing) {
  const it = parent.getFoldersByName(name);
  if (it.hasNext()) return it.next();
  return createIfMissing ? parent.createFolder(name) : null;
}

/* =========================
   UTIL
========================= */
function withFileUrls_(record, file) {
  const id = file.getId();
  const out = Object.assign({}, record);
  out.id = id;
  out.fileId = id;
  out.url = file.getUrl();
  out.thumbnail = thumbnailUrl_(id);
  out.viewUrl = thumbnailUrl_(id);
  out.downloadUrl = 'https://drive.google.com/uc?export=download&id='+encodeURIComponent(id);
  return out;
}

function thumbnailUrl_(id) {
  return 'https://drive.google.com/thumbnail?id='+encodeURIComponent(id)+'&sz=w1600';
}

function safeShare_(file) {
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
}

function decodeBase64_(value, maxBytes) {
  let s = String(value || '');
  if (s.indexOf(',') >= 0) s = s.split(',').pop();
  const bytes = Utilities.base64Decode(s);
  if (bytes.length > maxBytes) throw new Error('File terlalu besar.');
  return bytes;
}

function clean_(v) { return String(v == null ? '' : v).trim(); }

function safeFileName_(v) {
  return clean_(v).replace(/[\\/:*?"<>|#%{}]/g,'_').replace(/\s+/g,' ').substring(0,120) || 'file';
}

function jakartaDate_() { return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd'); }
function jakartaTime_() { return Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HH:mm:ss'); }

function output_(data, callback) {
  const body = JSON.stringify(data);
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$\.]*$/.test(callback)) {
    return ContentService.createTextOutput(callback+'('+body+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
