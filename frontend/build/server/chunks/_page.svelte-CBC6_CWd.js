import { e as escape_html } from './escaping-CqgfEcN3.js';
import { p as push, c as pop } from './index3-DJpGRPaU.js';

const replacements = {
  translate: /* @__PURE__ */ new Map([
    [true, "yes"],
    [false, "no"]
  ])
};
function attr(name, value, is_boolean = false) {
  if (value == null || !value && is_boolean) return "";
  const normalized = name in replacements && replacements[name].get(value) || value;
  const assignment = is_boolean ? "" : `="${escape_html(normalized, true)}"`;
  return ` ${name}${assignment}`;
}
function _page($$payload, $$props) {
  push();
  let connectionCode = "";
  let connecting = false;
  $$payload.out += `<div class="connect-container svelte-b0xw87"><h1 class="svelte-b0xw87">Подключение устройства</h1> `;
  {
    $$payload.out += "<!--[!-->";
    $$payload.out += `<div class="connect-form"><p class="instruction svelte-b0xw87">Введите код подключения, чтобы добавить это устройство к вашему профилю</p> <div class="input-group svelte-b0xw87"><input type="text" placeholder="Введите код подключения"${attr("value", connectionCode)}${attr("disabled", connecting, true)} class="svelte-b0xw87"> <button${attr("disabled", true, true)} class="connect-button svelte-b0xw87">${escape_html("Подключить")}</button></div> `;
    {
      $$payload.out += "<!--[!-->";
    }
    $$payload.out += `<!--]--></div>`;
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}

export { _page as default };
//# sourceMappingURL=_page.svelte-CBC6_CWd.js.map
