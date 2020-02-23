// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.3.3
// @description  切換界面語系、覆寫 @某人 的連結（避免找不到資源的錯誤）、用 UID 取得可標註其他使用者的文字
// @author       LianSheng
// @include      https://kater.me*
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @require      https://greasyfork.org/scripts/377302-general-source-code-injection-tool/code/General%20Source%20Code%20Injection%20Tool.js?version=667827
// @require      https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.4/clipboard.min.js
// @compatible   chrome >= 71, firefox >= ??
// @license      MIT
// ==/UserScript==

// Todo List
// 0.4.0 Filter notifications.
//     - Upvote / Downvote
//     - Specified user reply
//     - Specified user tag
// 0.X.0 Setting sync.

// 更改界面語系 (v0.1)
// 用 fetch 改寫。統一整體腳本風格 (v0.3.2)
function changeLang() {
    let nowLang = app.data.locale;
    let selectLang = (nowLang == "en") ? "zh-hant" : "en";
    let yourUID = app.session.user.data.id;
    let dataObj = {
        "data": {
            "type": "users",
            "id": yourUID,
            "attributes": {"preferences": {"locale": selectLang }}
        }
    };

    let option = {
        body: JSON.stringify(dataObj),
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'x-csrf-token': app.session.csrfToken,
            'x-http-method-override': 'PATCH'
        },
        method: 'POST'
    }

    fetch(`https://kater.me/api/users/${yourUID}`, option).then(function(response){
        let status = response.status;
        if(status == 200) {
            location.reload(true);
        } else {
            console.log(`Locale change failed: status code ${status}`);
            alert(`切換語系失敗，請重試。\nStatus code = ${status}`);
        }
    });
}

// 覆寫提及使用者連結 (v0.2)
function overwriteUserMention(node) {
    let re = /kater.me\/u\/(.+)$/;
    let name = node.href.match(re)[1];
    node.classList.add("overwrited");

    fetch(`https://kater.me/api/users?filter%5Bq%5D=${name}&page%5Blimit%5D=1`).then(function (response) {
        return response.json();
    }).then(function (json) {
        node.href = `https://kater.me/u/${json.data[0].id}`;
    });
}

// 用 UID 提及使用者 (v0.3)
// 暫時以僅複製爲解法，使用者需自行貼上（避免一些奇怪問題）
function mentionUserById(uid) {
    let footer = document.querySelector("ul.TextEditor-controls.Composer-footer");
    let display = document.querySelector("div#us_display");
    let input = document.querySelector("input#us_searchUid")
    let result = document.querySelector("div#us_result");
    let result_avatar = document.querySelector("div#us_resultAvatar");
    let result_name = document.querySelector("div#us_resultName");

    fetch(`https://kater.me/api/users/${uid}`).then(function (response) {
        return response.json();
    }).then(function (json) {
        let avatar = json.data.attributes.avatarUrl;
        let avatar_exist = (typeof avatar != typeof null);
        let name = json.data.attributes.displayName;
        let clipboard = new ClipboardJS(result);

        if (avatar_exist) {
            result_avatar.style.background = `url("${avatar}")`;
            result_avatar.style.backgroundSize = "contain";
        } else {
            result_avatar.style.background = "#ccc";
        }

        result_name.innerText = name;
        result.setAttribute("data-clipboard-text", `@${name}`);

        result.onclick = function () {
            let textarea = document.querySelector("textarea.FormControl.Composer-flexible");
            textarea.focus();
            clipboard.destroy();

            result_avatar.style.background = "#ccc";
            result_name.innerText = "已複製";
            setTimeout(function () {
                input.value = "";
                result_name.innerText = "Username";
                display.style.display = "none";
            }, 1000);
        }
    });
}

(function () {
    'use strict';
    // v0.1: 切換語言
    GM_registerMenuCommand("切換語言", function () {
        changeLang();
    });

    // v0.2: 覆寫提及使用者連結
    setInterval(function () {
        let match_nodes = document.querySelectorAll("a.UserMention:not(.overwrited)");
        if (match_nodes.length > 0) {
            match_nodes.forEach(function (node) {
                overwriteUserMention(node);
            });
        }
    }, 100);

    // v0.3: 用 UID 提及使用者（與原生選單共存）
    // (重寫) 避免 MutationObserver 無限迴圈問題，改用 setInterval 偵測
    let markold = "init";
    let max_uid = 0;
    fetch("https://kater.me/api/users?sort=-joinedAt&page[limit]=1").then(function (response) {
        return response.json();
    }).then(function (json) {
        max_uid = json.data[0].id;
    }).then(function () {
        setInterval(function () {
            // 撰寫貼文框的下方功能列
            let nodes = document.querySelectorAll("li.TextEditor-toolbar");
            if (nodes.length > 0) {
                let node = nodes[0];
                let display, button;
                // 自定義搜尋框
                if (document.querySelectorAll("div#us_display").length == 0) {
                    let appendDisplay = `<div id="us_display" style="cursor: pointer; user-select: none; display: inline-block; width: 10rem; min-width: min-content; border: 2px solid #333; border-radius: 4px; position: relative; bottom: 0; right: 0; z-index: 9999; background: #eee;"><div style="border-bottom: 1px solid #000; text-align: center; user-select: none; background: #e88; font-weight: bold;">用 UID 搜尋要標註的人</div><div><input id="us_searchUid" style="width: 100%; text-align: center;"></div><div id="us_result"><table><tr><td><div id="us_resultAvatar" style="height: 2rem; width: 2rem; display: inline-block; margin: 0.5rem; border-radius: 100px; background: #ccc; background-size: contain;"></div></td><td><div id="us_resultName" style="width: calc(100% - 3rem); display: inline-block;">Username</div></td></tr></table></div><input id="us_hiddenInput" style="display: none;"></div>`;
                    addHTML(appendDisplay, "ul.TextEditor-controls.Composer-footer", "beforeend");
                    display = document.querySelector("div#us_display");
                    display.style.display = "none";
                }
                // 自定義搜尋按鈕
                if (document.querySelectorAll("button#us_tagByUid").length == 0) {
                    let appendButton = `<button id="us_tagByUid" class="Button Button--icon Button--link hasIcon" type="button" title="用 UID 標註他人" data-original-title="用 UID 標註他人"><i class="icon fas fa-user-tag" style="color: #e88;"></i><span class="Button-label">用 UID 標註他人</span></button>`;
                    addHTML(appendButton, "li.TextEditor-toolbar", "beforeend");
                    button = document.querySelector("button#us_tagByUid");
                    button.addEventListener("click", function (e) {
                        let input = document.querySelector("input#us_searchUid")
                        if (display.style.display == "none") {
                            display.style.display = "inline-block";
                            input.focus();
                        } else {
                            display.style.display = "none";
                            document.querySelector("textarea.FormControl.Composer-flexible").focus();
                        }

                        input.addEventListener("input", function (e) {
                            input.value = input.value.replace(/[^0-9]/g, "");
                            let search = parseInt(input.value);

                            if (search != "") {
                                if (search <= max_uid) {
                                    mentionUserById(search);
                                }
                            }
                        });
                    });
                }
            }
        }, 200);
    });
})();