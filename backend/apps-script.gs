/**
 * Cold-Chain Site Cockpit — response collector (Google Apps Script)
 * Appends each survey submission as a row in the bound Google Sheet.
 *
 * SETUP (see backend/README.md for the click-by-click version):
 *   1. Create a Google Sheet (any name).
 *   2. Extensions -> Apps Script. Delete the stub, paste this file, Save.
 *   3. Deploy -> New deployment -> type "Web app".
 *        Execute as: Me     Who has access: Anyone
 *   4. Copy the Web app URL into shared/config.js -> survey.endpoint
 *      and set survey.mode = "appscript".
 *
 * The browser posts JSON as text/plain (avoids a CORS preflight); we parse it here.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(20000);
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Responses')
      || SpreadsheetApp.getActiveSpreadsheet().insertSheet('Responses');

    var data = {};
    try { data = JSON.parse(e.postData.contents); } catch (err) { data = e.parameter || {}; }

    // Establish/lengthen the header row from whatever keys arrive.
    var headers = sheet.getLastRow() > 0
      ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      : ['timestamp'];
    Object.keys(data).forEach(function (k) { if (headers.indexOf(k) === -1) headers.push(k); });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    var row = headers.map(function (h) {
      if (h === 'timestamp') return new Date();
      return data[h] != null ? data[h] : '';
    });
    sheet.appendRow(row);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Lets you open the Web app URL in a browser to confirm it's live.
function doGet() {
  return ContentService.createTextOutput('Cold-Chain Cockpit collector is live.');
}
