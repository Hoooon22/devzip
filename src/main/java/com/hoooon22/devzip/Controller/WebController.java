package com.hoooon22.devzip.Controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class WebController {

    // Frontend(React)의 클라이언트 사이드 라우팅 처리 - SPA 경로를 index.html로 포워드한다.
    //
    // 핵심: "/{path:[^.]*}" 패턴이 점(.)이 없는 단일 세그먼트 최상위 경로를 모두 잡아준다.
    // 따라서 새 실험/페이지 라우트(예: /edge-run, /murmuration 등)를 추가할 때
    // 이 컨트롤러를 더 이상 수정할 필요가 없다. (과거에는 경로를 일일이 나열해
    // 새 페이지마다 누락되어 직접 접근/새로고침 시 500(TB001)이 발생했다.)
    //
    // 제외 대상은 자연스럽게 걸러진다:
    //  - 정적 리소스(/static/..., /favicon.ico, /manifest.json 등): 확장자의 점(.) 때문에 미매칭
    //  - REST API(/api/**), SockJS 핸드셰이크(/ws-livechat/**): 다중 세그먼트라 단일 세그먼트 패턴에 미매칭
    // 하위 경로를 갖는 SPA 라우트만 아래에 명시적으로 등록한다.
    @GetMapping(value = {
        "/",
        "/{path:[^.]*}",        // 단일 세그먼트 SPA 라우트 전체 (신규 실험 페이지 자동 포함)
        "/dashboard/**",
        "/traceboard/**",
        "/chat/**",
        "/livechat/**",
        "/commandstack/**",
        "/api-experiment/**",
        "/error"
    })
    public String index() {
        return "forward:/index.html";
    }
}
