/* AI 개입 정도에 따른 이미지 진위 판별 연구: 참가자 페이지
   화면 순서: 설명문·동의 → 지시문 → 연습 2 → 본 문항 40 + 주의 확인 2 → 설문 7 → 제출 → 결과
   응답은 마지막 제출 때만 서버로 보낸다. IP·이름·연락처는 다루지 않는다. */
(function () {
  "use strict";
  const CFG = window.STUDY_CONFIG;
  const app = document.getElementById("app");
  const TITLE = "AI 개입 정도에 따른 이미지 진위 판별률 측정 연구: 인물·장면 이미지 비교";

  const S = { // 진행 상태(브라우저 메모리에만 존재)
    pid: rid(), version: null, practice: [], items: [], seq: [], i: 0,
    trials: [], attention: [], survey: {}, startedAt: null,
  };

  if (CFG.IS_TEST) document.getElementById("testbar").hidden = false;

  // ---------- 유틸 ----------
  function rid() {
    const a = new Uint8Array(8); crypto.getRandomValues(a);
    return Array.from(a, b => b.toString(16).padStart(2, "0")).join("");
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const r = new Uint32Array(1); crypto.getRandomValues(r);
      const j = r[0] % (i + 1); [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function h(html) { app.innerHTML = html; window.scrollTo(0, 0); }
  function $(s) { return app.querySelector(s); }
  function $$(s) { return Array.from(app.querySelectorAll(s)); }
  function deviceInfo() {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const w = Math.min(screen.width, screen.height);
    return { device: touch && w < 820 ? "mobile" : "pc", screen: `${screen.width}x${screen.height}`, viewport: `${innerWidth}x${innerHeight}` };
  }
  function done() { try { return localStorage.getItem(CFG.DONE_KEY) === "1"; } catch (e) { return false; } }
  function markDone() { try { localStorage.setItem(CFG.DONE_KEY, "1"); } catch (e) { /* 저장 불가 환경은 무시 */ } }

  async function api(action, body) {
    if (!CFG.API_URL) return null; // 미리보기 모드
    const opt = body
      ? { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=utf-8" } }
      : { method: "GET" };
    const url = body ? CFG.API_URL : `${CFG.API_URL}?action=${encodeURIComponent(action)}`;
    const res = await fetch(url, opt);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  // ---------- 1. 설명문·동의 ----------
  const EXPL = [
    ["1. 연구 제목", TITLE],
    ["2. 연구의 목적과 내용", "이 연구는 사람들이 실제 사진과 AI로 만들거나 수정한 이미지를 얼마나 구별하는지 알아보기 위한 것입니다. 약 100명이 참여할 예정입니다."],
    ["3. 연구비 지원기관", "없습니다."],
    ["4. 연구대상자 모집 방법", "대학생 커뮤니티, 단체 대화방, SNS의 공개 게시글로 모집합니다."],
    ["5. 참여 절차", "이미지 40장을 차례로 보고 각 이미지가 실제 사진인지 AI 이미지인지 고르고 얼마나 확신하는지 선택합니다. 끝으로 짧은 질문 7개에 답합니다. 약 6~8분이 걸리며 시간 제한은 없습니다. 이미지는 연구용으로 공개된 사진 데이터셋의 얼굴·건물 사진과, 이를 AI로 수정한 이미지입니다. 불쾌감을 주는 장면은 없습니다."],
    ["6. 위험과 이익", "화면을 보는 피로 외에 예상되는 위험은 없습니다. 직접적인 이익과 별도 보상은 없으며 끝난 뒤 본인의 결과와 연구 설명을 볼 수 있습니다."],
    ["7. 수집하는 정보와 비밀 유지", "이미지별 응답과 확신도, 응답 시간, 설문 응답(연령대, 성별, AI 이용 경험, 연구를 알게 된 경로 등), 접속 기기 종류와 화면 크기, 참여 일시만 수집합니다. 이름, 연락처, IP 주소 등 여러분을 알아볼 수 있는 정보는 수집하지 않습니다. 응답은 연구진만 접근할 수 있는 곳에 보관하고 연구 종료 3년 뒤 폐기합니다. 연구 검증을 위해 개인을 알아볼 수 없는 응답 자료는 온라인 연구 저장소(OSF)에 공개될 수 있습니다. 생명윤리위원회와 관계 기관은 관련 규정의 범위 안에서 연구 기록을 열람할 수 있습니다."],
    ["8. 자발적 참여와 철회", "참여는 자유입니다. 참여하지 않거나 중간에 창을 닫아도 불이익은 없습니다. 응답은 마지막 '제출' 버튼을 눌렀을 때만 저장되므로 중간에 그만두면 아무 기록도 남지 않습니다. 제출된 응답은 누구의 것인지 알 수 없어 나중에 골라 삭제할 수 없습니다."],
    ["9. 참여 자격", "만 19세 이상인 분만 참여할 수 있으며, 아래 두 항목에 직접 체크하셔야 시작됩니다."],
    ["10. 기타", "연구진에게 이해상충은 없습니다. 이 화면은 저장하거나 캡처해 보관하실 수 있습니다."],
  ];

  function screenConsent() {
    if (done()) return screenAlready();
    h(`<section class="card">
      <h1>연구 참여 안내</h1>
      <p class="small">연구진: 연구책임자 김고은(중앙대학교)·류봄(이화여자대학교), 공동연구자 김효주(서울여자대학교)·우서현(중앙대학교)</p>
      <ol class="info" style="list-style:none;padding-left:0">${EXPL.map(([t, d]) => `<li><b>${t}</b>${d}</li>`).join("")}</ol>
      <h2>문의</h2>
      <p class="small">연구 내용: 연구책임자 김고은(oldsilver031@naver.com), 류봄(bomryu@ewha.ac.kr)<br>
      참여자 권리: 중앙대학교 생명윤리위원회(02-820-6346, ethics@cau.ac.kr)</p>
      <h2>동의 확인</h2>
      <p>본인은 본 연구와 관련된 설명을 읽고 이해하였으며, 궁금한 사항은 위 연락처로 문의할 수 있음을 알고 있습니다. 충분히 생각한 이후에 본인은 상기 연구에 참여하기를 자발적인 의사에 의하여 동의합니다.</p>
      <div class="checks">
        <label><input type="checkbox" id="c1"> 나는 만 19세 이상입니다.</label>
        <label><input type="checkbox" id="c2"> 위 내용을 읽고 이해하였으며, 연구에 참여하는 데 자발적으로 동의합니다.</label>
      </div>
      <div class="row">
        <button class="pri wide" id="go" disabled>동의하고 시작하기</button>
        <button class="wide" id="no">참여하지 않기</button>
      </div>
      <p class="err" id="err" hidden></p>
    </section>`);
    const sync = () => { $("#go").disabled = !($("#c1").checked && $("#c2").checked); };
    $("#c1").onchange = sync; $("#c2").onchange = sync;
    $("#no").onclick = screenDeclined;
    $("#go").onclick = start;
  }

  async function start() {
    const btn = $("#go"); btn.disabled = true; btn.textContent = "준비 중…";
    try {
      const v = await (await fetch("versions.json", { cache: "no-store" })).json();
      let version = String(1 + Math.floor(Math.random() * 10)); // 미리보기 모드 기본값
      const r = await api("assign");
      if (r && r.version) version = String(r.version);
      S.version = version;
      S.practice = v.practice;
      S.items = shuffle(v.versions[version]);
      S.seq = buildSeq(S.items);
      S.startedAt = Date.now();
      preload(S.practice.concat(S.items.slice(0, 3)));
      screenInstruction();
    } catch (e) {
      btn.disabled = false; btn.textContent = "동의하고 시작하기";
      const el = $("#err"); el.hidden = false; el.textContent = "연결에 문제가 있어 시작하지 못했습니다. 잠시 뒤 다시 눌러 주세요.";
    }
  }

  function buildSeq(items) { // 본 문항 사이에 주의 확인 문항 2개 삽입
    const seq = []; let a = 0;
    items.forEach((img, k) => {
      seq.push({ kind: "img", img, n: k + 1 });
      if (CFG.ATTENTION_POSITIONS.includes(k + 1)) {
        a += 1;
        seq.push(a === 1
          ? { kind: "att", id: 1, text: "이 문항에서는 'AI 이미지'를 누르고, 확신도는 ②를 골라 주세요.", want: ["AI", 2] }
          : { kind: "att", id: 2, text: "이 문항에서는 '실제 사진'을 누르고, 확신도는 ③을 골라 주세요.", want: ["REAL", 3] });
      }
    });
    return seq;
  }
  function preload(list) { list.forEach(f => { const im = new Image(); im.src = "img/" + f; }); }

  function screenDeclined() {
    h(`<section class="card"><h1>참여하지 않기를 선택하셨습니다</h1>
      <p>어떤 자료도 저장되지 않았습니다. 창을 닫으셔도 됩니다.</p></section>`);
  }
  function screenAlready() {
    h(`<section class="card"><h1>이미 참여하셨습니다</h1>
      <p>이 기기에서 참여가 완료된 기록이 있습니다. 한 분이 한 번만 참여할 수 있습니다. 참여해 주셔서 감사합니다.</p></section>`);
  }

  // ---------- 2. 지시문 ----------
  function screenInstruction() {
    h(`<section class="card"><h1>안내</h1>
      <p>이제 이미지 40장을 차례로 봅니다. 일부는 실제로 촬영한 사진이고, 일부는 AI로 만들거나 수정한 이미지입니다. 각 이미지가 실제 사진인지 AI 이미지인지 골라 주세요. 시간 제한은 없습니다. 먼저 연습 문항 2개를 풀어 봅니다.</p>
      <div class="row"><button class="pri wide" id="go">연습 시작</button></div></section>`);
    $("#go").onclick = () => trial({ kind: "prac", img: S.practice[0], n: 1 }, () =>
      trial({ kind: "prac", img: S.practice[1], n: 2 }, screenAfterPractice));
  }
  function screenAfterPractice() {
    h(`<section class="card"><h1>연습이 끝났습니다</h1>
      <p>이제 본 문항 40개가 시작됩니다. 연습과 같은 방식으로 답해 주세요. 중간에 안내 문구가 나오는 문항이 2개 있으니 안내대로 눌러 주세요.</p>
      <div class="row"><button class="pri wide" id="go">본 문항 시작</button></div></section>`);
    $("#go").onclick = next;
  }

  // ---------- 3. 문항 ----------
  function next() {
    if (S.i >= S.seq.length) return screenSurvey();
    const step = S.seq[S.i++];
    const ahead = S.seq.slice(S.i, S.i + 3).filter(s => s.kind === "img").map(s => s.img);
    preload(ahead);
    trial(step, next);
  }

  const CONF = ["① 전혀 확신하지 못함", "② 조금 확신함", "③ 꽤 확신함", "④ 매우 확신함"];

  function trial(step, after) {
    const total = S.seq.length;
    const pos = step.kind === "prac" ? `연습 문항 ${step.n} / 2` : `${S.i} / ${total}`;
    const pct = step.kind === "prac" ? 0 : Math.round((S.i - 1) / total * 100);
    const stim = step.kind === "att"
      ? `<div class="stim note">${step.text}</div>`
      : `<div class="stim"><img id="im" alt="판단할 이미지" src="img/${step.img}"></div>`;
    h(`<div class="progress"><span>${pos}</span></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <section class="card">
        ${stim}
        <p class="q">이 이미지는 무엇인가요?</p>
        <div class="choices">
          <button class="wide" data-c="REAL">실제 사진</button>
          <button class="wide" data-c="AI">AI 이미지</button>
        </div>
        <p class="q">얼마나 확신하나요?</p>
        <div class="conf">${CONF.map((t, k) => `<button data-k="${k + 1}" disabled>${t}</button>`).join("")}</div>
      </section>`);
    let t0 = performance.now(), choice = null, rt = null;
    const im = $("#im");
    if (im && !im.complete) { im.onload = () => { t0 = performance.now(); }; }
    $$(".choices button").forEach(b => b.onclick = () => {
      if (rt === null) rt = Math.round(performance.now() - t0); // 첫 판단까지의 시간
      choice = b.dataset.c;
      $$(".choices button").forEach(x => x.classList.toggle("on", x === b));
      $$(".conf button").forEach(x => x.disabled = false);
    });
    $$(".conf button").forEach(b => b.onclick = () => {
      if (!choice) return;
      const conf = Number(b.dataset.k);
      b.classList.add("on");
      const rec = { choice, conf, rt, rtTotal: Math.round(performance.now() - t0) };
      if (step.kind === "img") S.trials.push({ n: step.n, img: step.img, ...rec });
      if (step.kind === "att") S.attention.push({ id: step.id, ...rec, pass: choice === step.want[0] && conf === step.want[1] });
      setTimeout(after, 180);
    });
  }

  // ---------- 4. 설문 ----------
  const SURVEY = [
    ["age", "연령대를 골라 주세요.", ["만 19~29세", "30대", "40대", "50대 이상"]],
    ["gender", "성별을 골라 주세요.", ["남성", "여성"]],
    ["genai_freq", "AI 이미지 생성 도구(예: ChatGPT 이미지 생성, Midjourney)를 얼마나 자주 사용하나요?", ["사용해 본 적 없음", "한두 번", "한 달에 몇 번", "일주일에 한 번 이상"]],
    ["confidence", "나는 AI로 만든 이미지를 실제 사진과 구별할 자신이 있다.", ["① 전혀 아니다", "②", "③", "④", "⑤ 매우 그렇다"]],
    ["law_aware", "2026년 1월부터 AI로 만든 이미지 등에 표시를 하도록 정한 법(인공지능기본법)이 시행된 것을 알고 있었나요?", ["예", "아니오", "잘 모르겠음"]],
    ["source", "이 연구를 어디에서 알게 되었나요?", ["대학생 커뮤니티", "단체 대화방", "SNS", "지인 소개", "기타"]],
    ["prior_game", "이전에 '진짜 사진 vs AI 이미지' 맞히기 게임에 참여해 본 적이 있나요?", ["예", "아니오", "기억나지 않음"]],
  ];
  function screenSurvey() {
    h(`<section class="card survey"><h1>마지막으로 짧은 질문 7개입니다</h1>
      <p class="small">모든 문항에 '응답하지 않음'을 고를 수 있습니다.</p>
      ${SURVEY.map(([k, q, opts], i) => `<div class="item"><p class="q">${i + 1}. ${q}</p><div class="opts">
        ${opts.concat(["응답하지 않음"]).map(o => `<label><input type="radio" name="${k}" value="${o}"> ${o}</label>`).join("")}
      </div></div>`).join("")}
      <div class="row"><button class="pri wide" id="go" disabled>제출</button></div>
      <p class="err" id="err" hidden></p></section>`);
    const check = () => { $("#go").disabled = !SURVEY.every(([k]) => app.querySelector(`input[name="${k}"]:checked`)); };
    $$("input[type=radio]").forEach(r => r.onchange = check);
    $("#go").onclick = submit;
  }

  // ---------- 5. 제출과 결과 ----------
  async function submit() {
    SURVEY.forEach(([k]) => { S.survey[k] = app.querySelector(`input[name="${k}"]:checked`).value; });
    const btn = $("#go"); btn.disabled = true; btn.textContent = "제출 중…";
    const payload = {
      pid: S.pid, version: S.version, date: new Date().toISOString().slice(0, 10),
      durationSec: Math.round((Date.now() - S.startedAt) / 1000),
      ...deviceInfo(), trials: S.trials, attention: S.attention, survey: S.survey, test: !!CFG.IS_TEST,
    };
    try {
      const r = await api("submit", payload);
      markDone();
      screenResult(r && typeof r.score === "number" ? r.score : null);
    } catch (e) {
      btn.disabled = false; btn.textContent = "다시 제출";
      const el = $("#err"); el.hidden = false; el.textContent = "제출하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 눌러 주세요. 응답은 아직 저장되지 않았습니다.";
    }
  }
  function screenResult(score) {
    const line = score === null
      ? `<p class="small">(미리보기 모드: 서버가 연결되지 않아 응답이 저장되지 않았고 점수도 계산되지 않았습니다.)</p>`
      : `<div class="score">40문항 중 ${score}문항</div>`;
    h(`<section class="card"><h1>참여해 주셔서 감사합니다</h1>
      ${line}
      <p>이 연구의 이미지 가운데 일부는 실제 사진을 AI로 조금에서 크게까지 수정한 것이며, 일부는 사람이 구분하기 어렵도록 만들어졌습니다. 연구팀은 AI 수정의 정도에 따라 사람들의 판단이 어떻게 달라지는지 알아보고 있습니다. 이미지별 정답은 다른 참여자를 위해 자료 수집이 끝난 뒤 공개합니다.</p>
      <p class="small">이미지 출처: Face Research Lab London Set(CC BY 4.0), RAISE 데이터셋. <a href="credits.html" target="_blank" rel="noopener">자세히 보기</a></p>
    </section>`);
  }

  screenConsent();
})();
