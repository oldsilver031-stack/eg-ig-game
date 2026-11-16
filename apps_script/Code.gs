/**
 * EG@IG 연구 페이지 서버 (Google Apps Script 웹 앱)
 *
 * 스프레드시트에 시트 두 개가 필요하다.
 *  - key       : 정답표. A열 file, B열 answer(AI/REAL), C열 type(face/scene), D열 strength. 1행은 머리글.
 *                정답표는 이 시트에만 두고 GitHub에는 올리지 않는다.
 *  - responses : 응답 저장. 처음 제출 때 머리글이 자동으로 만들어진다.
 *
 * 배포: 확장 프로그램 → Apps Script에 이 파일을 붙여넣기 → 배포 → 새 배포 → 유형 '웹 앱'
 *       실행 사용자 '나', 액세스 권한 '모든 사용자' → 나온 URL을 config.js의 API_URL에 넣는다.
 *
 * 개인정보: Apps Script는 익명 방문자의 IP·계정 정보를 스크립트에 넘기지 않으며, 이 코드도 그런 정보를 기록하지 않는다.
 */

const N_VERSIONS = 10;
const HEADER = ['saved_date', 'pid', 'version', 'score', 'n_trials', 'att_pass', 'duration_sec', 'device', 'screen', 'viewport',
  'age', 'gender', 'genai_freq', 'confidence', 'law_aware', 'source', 'prior_game', 'test', 'trials_json', 'attention_json'];

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** GET ?action=assign : 완료자가 가장 적은 버전을 배정한다(동률이면 무작위). */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  if (action !== 'assign') return json_({ ok: false, error: 'unknown action' });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const counts = new Array(N_VERSIONS).fill(0);
    const sh = sheet_('responses');
    const last = sh.getLastRow();
    if (last > 1) {
      const vals = sh.getRange(2, 3, last - 1, 1).getValues(); // version 열
      vals.forEach(r => { const v = Number(r[0]); if (v >= 1 && v <= N_VERSIONS) counts[v - 1]++; });
    }
    const min = Math.min.apply(null, counts);
    const cand = [];
    counts.forEach((c, i) => { if (c === min) cand.push(i + 1); });
    const version = cand[Math.floor(Math.random() * cand.length)];
    return json_({ ok: true, version: version });
  } finally {
    lock.releaseLock();
  }
}

/** POST(JSON 본문) : 응답 한 줄 저장, 서버에서 채점해 점수만 돌려준다. */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const key = {};
    const ks = sheet_('key');
    if (ks.getLastRow() > 1) {
      ks.getRange(2, 1, ks.getLastRow() - 1, 2).getValues().forEach(r => { key[String(r[0])] = String(r[1]); });
    }
    const trials = Array.isArray(d.trials) ? d.trials : [];
    let score = 0;
    trials.forEach(t => { if (key[t.img] && key[t.img] === t.choice) score++; });
    const att = Array.isArray(d.attention) ? d.attention : [];
    const attPass = att.filter(a => a.pass).length;
    const s = d.survey || {};

    const sh = sheet_('responses');
    if (sh.getLastRow() === 0) sh.appendRow(HEADER);
    sh.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'), // 날짜만 기록
      String(d.pid || ''), Number(d.version) || '', score, trials.length, attPass,
      Number(d.durationSec) || '', String(d.device || ''), String(d.screen || ''), String(d.viewport || ''),
      s.age || '', s.gender || '', s.genai_freq || '', s.confidence || '', s.law_aware || '', s.source || '', s.prior_game || '',
      d.test ? 'TRUE' : 'FALSE', JSON.stringify(trials), JSON.stringify(att),
    ]);
    return json_({ ok: true, score: score });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
