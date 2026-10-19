// School-owned PP5 receiver. Never return Google OAuth tokens.
// Incoming calls only carry a short-lived job key. All instructions and file
// bytes are fetched from the fixed PP5 server, not from the caller.
var PP5_ORIGIN = 'https://pp-5-gray.vercel.app';
var PP5_FOLDER_ID = '1_9hk4918HBD1wmy2vK92W83jzYsPbrh4';
function result_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function hash_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(function (b) {
      return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
    })
    .join('');
}
function inside_(file, rootId, depth) {
  depth = depth || 0;
  if (depth > 3) return false;
  var parents = file.getParents();
  while (parents.hasNext()) {
    var parent = parents.next();
    if (parent.getId() === rootId) return true;
    if (
      !parent.isTrashed() &&
      parent.getSharingAccess() === DriveApp.Access.PRIVATE &&
      inside_(parent, rootId, depth + 1)
    )
      return true;
  }
  return false;
}
function managedName_(f) {
  return 'PP5_' + f.id + '__' + f.name.replace(/[\\/\x00-\x1f]/g, '_');
}
function destination_(root, layout) {
  if (!layout) return root; // Backward compatibility while PP5 deployment is updated.
  if (!Array.isArray(layout) || layout.length !== 3) throw new Error('ACCESS');
  var folder = root;
  layout.forEach(function (name) {
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 140 ||
      /[\\/\x00-\x1f]/.test(name)
    )
      throw new Error('ACCESS');
    var folders = folder.getFoldersByName(name);
    folder = folders.hasNext() ? folders.next() : folder.createFolder(name);
    if (folder.isTrashed() || folder.getSharingAccess() !== DriveApp.Access.PRIVATE)
      throw new Error('PRIVATE_FOLDER');
  });
  return folder;
}
function metadataInside_(parents) {
  if (!Array.isArray(parents)) return false;
  return parents.some(function (id) {
    if (id === PP5_FOLDER_ID) return true;
    try {
      var folder = DriveApp.getFolderById(id);
      return (
        !folder.isTrashed() &&
        folder.getSharingAccess() === DriveApp.Access.PRIVATE &&
        inside_(folder, PP5_FOLDER_ID)
      );
    } catch (_) {
      return false;
    }
  });
}
// Owner-only maintenance in the Apps Script editor; never exposed by doPost.
// Only unambiguous PP5-generated filenames directly inside the bound root qualify.
function legacyOrganizationPlan_() {
  var root = DriveApp.getFolderById(PP5_FOLDER_ID);
  if (root.getSharingAccess() !== DriveApp.Access.PRIVATE) throw new Error('PRIVATE_FOLDER');
  var files = root.getFiles(),
    rows = [],
    names = {};
  while (files.hasNext()) {
    var file = files.next(),
      name = file.getName();
    var match =
      /^PP5_[a-f0-9-]{36}__ปพ5_(25\d{2})_(?:ภาคเรียนที่)?([12])_([ปม]\.\d-\d+)_([^_]+)_([^_]+)/.exec(
        name,
      );
    if (!match || file.isTrashed()) continue;
    var key = match.slice(1, 5).join('|');
    var subject = match[5].replace(/\.(pdf|xlsx)$/i, '');
    if (!/^V\d+$/i.test(subject)) {
      if (names[key] === undefined) names[key] = subject;
      else if (names[key] !== subject) names[key] = null;
    }
    rows.push({
      file: file,
      key: key,
      year: match[1],
      semester: match[2],
      grade: match[3],
      code: match[4],
    });
  }
  return {
    root: root,
    rows: rows
      .filter(function (row) {
        return !!names[row.key];
      })
      .map(function (row) {
        row.layout = [
          'ปีการศึกษา ' + row.year + ' ภาคเรียนที่ ' + row.semester,
          'ชั้น ' + row.grade,
          (row.code + ' ' + names[row.key]).replace(/[\\/\x00-\x1f]/g, '-').slice(0, 140),
        ];
        return row;
      }),
  };
}
function previewLegacyOrganization() {
  var plan = legacyOrganizationPlan_();
  console.log(
    JSON.stringify({
      files: plan.rows.length,
      folders: Array.from(
        new Set(
          plan.rows.map(function (row) {
            return row.layout.join(' → ');
          }),
        ),
      ),
    }),
  );
}
function organizeLegacyRootFiles() {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var plan = legacyOrganizationPlan_(),
      moved = 0;
    plan.rows.forEach(function (row) {
      if (!inside_(row.file, PP5_FOLDER_ID, 3) || row.file.isTrashed()) throw new Error('CHANGED');
      row.file.moveTo(destination_(plan.root, row.layout));
      moved++;
    });
    console.log(JSON.stringify({ moved: moved, preservedFileIds: true, deleted: 0 }));
  } finally {
    lock.releaseLock();
  }
}
function doGet() {
  return result_({
    protocol: 'PP5-DRIVE-1',
    service: 'School PP5 receiver',
    capabilities: ['permanent-delete-v1', 'organized-folders-v1'],
  });
}
// Owner-run readiness check: reads folder capabilities only; never deletes a file.
function checkPermanentDeleteApi() {
  var response = UrlFetchApp.fetch(
    'https://www.googleapis.com/drive/v3/files/' +
      PP5_FOLDER_ID +
      '?fields=id,capabilities(canDelete,canDeleteChildren)&supportsAllDrives=true',
    {
      headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
      muteHttpExceptions: true,
      followRedirects: false,
    },
  );
  var body = JSON.parse(response.getContentText());
  console.log(
    JSON.stringify({
      apiReady: response.getResponseCode() === 200,
      status: response.getResponseCode(),
      capabilities: body.capabilities || {},
      reason: body.error ? body.error.status : '',
    }),
  );
}
function deleteManagedFile_(driveId, f) {
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(driveId)) throw new Error('ACCESS');
  var url = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(driveId);
  var options = {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
    followRedirects: false,
  };
  var check = UrlFetchApp.fetch(
    url + '?fields=id,name,parents,size,mimeType&supportsAllDrives=true',
    options,
  );
  if (check.getResponseCode() === 404) return; // Retry after a completed delete is idempotent.
  if (check.getResponseCode() !== 200) throw new Error('ACCESS');
  var metadata = JSON.parse(check.getContentText());
  var expectedName = 'PP5_' + f.id + '__' + f.name.replace(/[\\/\x00-\x1f]/g, '_');
  if (
    !metadata.parents ||
    !metadataInside_(metadata.parents) ||
    metadata.name !== expectedName ||
    Number(metadata.size) !== f.size ||
    metadata.mimeType === 'application/vnd.google-apps.folder'
  )
    throw new Error('CHANGED');
  options.method = 'delete';
  var deleted = UrlFetchApp.fetch(url + '?supportsAllDrives=true', options);
  if ([204, 404].indexOf(deleted.getResponseCode()) < 0) throw new Error('ACCESS');
}
function doPost(e) {
  var common = { protocol: 'PP5-DRIVE-1', folderId: PP5_FOLDER_ID, private: false, ok: false };
  try {
    if (!e || e.contentLength > 300) throw new Error('ACCESS');
    var input = JSON.parse(e.postData.contents);
    if (!input || !/^[a-f0-9]{64}$/.test(input.key)) throw new Error('ACCESS');
    var response = UrlFetchApp.fetch(PP5_ORIGIN + '/api/pp5?action=drive-job', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ key: input.key }),
      muteHttpExceptions: true,
      followRedirects: false,
    });
    if (response.getResponseCode() !== 200) throw new Error('ACCESS');
    var job = JSON.parse(response.getContentText());
    if (job.protocol !== 'PP5-DRIVE-1' || job.folderId !== PP5_FOLDER_ID) throw new Error('ACCESS');
    var root;
    try {
      root = DriveApp.getFolderById(PP5_FOLDER_ID);
    } catch (_) {
      throw new Error('ACCESS');
    }
    if (root.getSharingAccess() !== DriveApp.Access.PRIVATE) throw new Error('PRIVATE_FOLDER');
    common.private = true;
    if (job.kind === 'probe') {
      // Exercise create/read on a synthetic file, then trash only that new file.
      var sample = Utilities.newBlob(
        'PP5 storage connection test. No student data.',
        'text/plain',
        'PP5_connection_test_' + Utilities.getUuid() + '.txt',
      );
      var testFile = root.createFile(sample);
      var checked = hash_(testFile.getBlob().getBytes()) === hash_(sample.getBytes());
      testFile.setTrashed(true);
      if (!checked) throw new Error('CHANGED');
      common.name = root.getName();
      common.ownerEmail = Session.getEffectiveUser().getEmail();
      common.verified = true;
    } else if (job.kind === 'delete') {
      var f = job.file;
      if (
        !f ||
        !/^[a-f0-9-]{36}$/.test(f.id) ||
        !Number.isInteger(f.size) ||
        f.size < 1 ||
        f.size > 25 * 1024 * 1024 ||
        typeof f.name !== 'string' ||
        f.name.length > 180 ||
        !['pdf', 'excel'].includes(f.kind)
      )
        throw new Error('ACCESS');
      if (f.driveId) deleteManagedFile_(f.driveId, f);
      else {
        // Also remove a verified upload whose response was lost before its pointer was saved.
        var named = DriveApp.getFilesByName(
          'PP5_' + f.id + '__' + f.name.replace(/[\\/\x00-\x1f]/g, '_'),
        );
        while (named.hasNext()) {
          var candidate = named.next();
          if (inside_(candidate, PP5_FOLDER_ID)) deleteManagedFile_(candidate.getId(), f);
        }
      }
      common.deleted = true;
      common.fileId = f.id;
    } else {
      var f = job.file;
      if (
        !f ||
        !/^[a-f0-9-]{36}$/.test(f.id) ||
        !Number.isInteger(f.size) ||
        f.size < 1 ||
        f.size > 25 * 1024 * 1024 ||
        !/^[a-f0-9]{64}$/.test(f.sha256) ||
        typeof f.name !== 'string' ||
        f.name.length > 180 ||
        !['pdf', 'excel'].includes(f.kind)
      )
        throw new Error('ACCESS');
      var file;
      if (job.kind === 'write' || job.kind === 'organize') {
        var bytes;
        if (job.kind === 'write') {
          bytes = Utilities.base64Decode(job.base64 || '');
          if (bytes.length !== f.size || hash_(bytes) !== f.sha256) throw new Error('CHANGED');
        }
        var name = managedName_(f);
        var lock = LockService.getScriptLock();
        lock.waitLock(15000);
        try {
          if (job.kind === 'organize') {
            if (!/^[A-Za-z0-9_-]{1,200}$/.test(f.driveId) || !f.layout) throw new Error('ACCESS');
            file = DriveApp.getFileById(f.driveId);
            if (!inside_(file, PP5_FOLDER_ID) || file.isTrashed() || file.getName() !== name)
              throw new Error('ACCESS');
          } else {
            var existing = DriveApp.getFilesByName(name);
            while (existing.hasNext()) {
              var candidate = existing.next();
              if (inside_(candidate, PP5_FOLDER_ID)) {
                file = candidate;
                break;
              }
            }
          }
          if (file && (file.getSize() !== f.size || hash_(file.getBlob().getBytes()) !== f.sha256))
            throw new Error('CHANGED');
          var target = destination_(root, f.layout);
          if (!file)
            file = target.createFile(
              Utilities.newBlob(
                bytes,
                f.kind === 'pdf'
                  ? 'application/pdf'
                  : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                name,
              ),
            );
          if (file.getSize() !== f.size || hash_(file.getBlob().getBytes()) !== f.sha256)
            throw new Error('CHANGED');
          if (!inside_(file, target.getId(), 3)) file.moveTo(target);
          common.parentId = target.getId();
          common.organized = !!f.layout;
        } finally {
          lock.releaseLock();
        }
        common.id = file.getId();
        common.size = f.size;
        common.sha256 = f.sha256;
      } else if (job.kind === 'read') {
        if (!/^[A-Za-z0-9_-]{1,200}$/.test(f.driveId)) throw new Error('ACCESS');
        file = DriveApp.getFileById(f.driveId);
        if (!inside_(file, PP5_FOLDER_ID) || file.isTrashed() || file.getSize() !== f.size)
          throw new Error('ACCESS');
        var data = file.getBlob().getBytes();
        if (data.length !== f.size || hash_(data) !== f.sha256) throw new Error('CHANGED');
        common.base64 = Utilities.base64Encode(data);
      } else throw new Error('ACCESS');
    }
    common.ok = true;
    return result_(common);
  } catch (error) {
    var message = error && error.message;
    common.error = ['PRIVATE_FOLDER', 'ACCESS', 'CHANGED'].includes(message)
      ? message
      : /quota|limit|storage|space/i.test(message || '')
        ? 'QUOTA'
        : 'FAILED';
    return result_(common);
  }
}
