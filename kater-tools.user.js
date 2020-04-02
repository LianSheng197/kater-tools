// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.4.1
// @description  切換界面語系，覆寫「@某人」的連結（避免找不到資源的錯誤），用 UID 取得可標註其他使用者的文字
// @author       LianSheng

// @include      https://kater.me/*
// @exclude      https://kater.me/api/*

// @grant        GM_registerMenuCommand
// @grant        GM_info

// @run-at       document-start
// @noframes

// @require      https://greasyfork.org/scripts/377302-general-source-code-injection-tool/code/General%20Source%20Code%20Injection%20Tool.js?version=667827
// @require      https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.4/clipboard.min.js
// @require      https://greasyfork.org/scripts/398932-kater-tools-real-part/code/Kater%20Tools%20(Real%20Part).js

// @compatible   chrome Chrome 71 + Tampermonkey + v0.4.1 可正常使用
// @compatible   firefox Firefox 70 + Tampermonkey + v0.4.1 可正常使用

// @license      MIT
// ==/UserScript==

// 拋棄原定於 0.4 的通知過濾。
// 0.4.1 起，所有程式碼改從外部呼叫。