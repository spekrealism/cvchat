import { p as push, d as bind_props, c as pop } from './index3-DJpGRPaU.js';

function _page($$payload, $$props) {
  push();
  let data = $$props["data"];
  {
    $$payload.out += "<!--[-->";
    $$payload.out += `<div class="loading svelte-1klhsf2"><p>Загрузка профиля...</p></div>`;
  }
  $$payload.out += `<!--]-->`;
  bind_props($$props, { data });
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-DbW7ey08.js.map
