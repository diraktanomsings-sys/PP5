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
function inside_(file, rootId) {
  var parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === rootId) return true;
  return false;
}
function doGet() {
  return result_({
    protocol: 'PP5-DRIVE-1',
    service: 'School PP5 receiver',
    capabilities: ['permanent-delete-v1'],
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
    metadata.parents.indexOf(PP5_FOLDER_ID) < 0 ||
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
        var named = root.getFilesByName(
          'PP5_' + f.id + '__' + f.name.replace(/[\\/\x00-\x1f]/g, '_'),
        );
        while (named.hasNext()) deleteManagedFile_(named.next().getId(), f);
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
      if (job.kind === 'write') {
        var bytes = Utilities.base64Decode(job.base64 || '');
        if (bytes.length !== f.size || hash_(bytes) !== f.sha256) throw new Error('CHANGED');
        var name = 'PP5_' + f.id + '__' + f.name.replace(/[\\/\x00-\x1f]/g, '_');
        var lock = LockService.getScriptLock();
        lock.waitLock(15000);
        try {
          var existing = root.getFilesByName(name);
          file = existing.hasNext()
            ? existing.next()
            : root.createFile(
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
