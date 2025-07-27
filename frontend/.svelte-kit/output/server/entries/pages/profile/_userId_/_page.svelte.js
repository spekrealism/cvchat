import { d as bind_props, c as pop, p as push } from "../../../../chunks/index3.js";
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
export {
  _page as default
};
