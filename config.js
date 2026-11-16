// 연구 페이지 설정. 배포 전에 API_URL만 바꾸면 된다.
window.STUDY_CONFIG = {
  // Google Apps Script 웹 앱 배포 URL (https://script.google.com/macros/s/.../exec)
  // 비워 두면 서버 없이 화면 흐름만 확인하는 미리보기 모드로 동작하며, 응답은 어디에도 저장되지 않는다.
  API_URL: "https://script.google.com/macros/s/AKfycbzHYl1c1_OkRAErQ7s5x3qBAoU0F0gHkTbE5pGw_Ao89Wsf2ITd3YNr1hetVsnqN5ZIGw/exec",
  IS_TEST: true,               // 시험판 표시(상단 띠). 본 수집에서는 false
  ATTENTION_POSITIONS: [14, 29], // 본 문항 몇 번째 뒤에 주의 확인 문항을 넣을지(1부터)
  DONE_KEY: "egig_done_v1",    // 중복 참여 방지용 브라우저 저장 키(개인 식별 정보 아님)
};
