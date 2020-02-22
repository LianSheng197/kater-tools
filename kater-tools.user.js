// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.3.0-pa4
// @description  切換界面語系、覆寫 @某人 的連結（避免找不到資源的錯誤）
// @author       LianSheng
// @include      https://kater.me*
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @require      https://greasyfork.org/scripts/377302-general-source-code-injection-tool/code/General%20Source%20Code%20Injection%20Tool.js?version=667827
// @compatible   chrome >= 71, firefox >= ??
// @license      MIT
// ==/UserScript==

// Todo List
// 0.3.0 Tag someone in article by uid (delay from v0.2.0-pa1)
// 0.4.0 Filter notifications.
//     - Upvote / Downvote
//     - Specified user reply
//     - Specified user tag
// 0.X.0 Setting sync.

// 更改界面語系 (v0.1)
function changeLang() {
    let nowLang = app.data.locale;
    let selectLang = (nowLang == "en") ? "zh-hant" : "en";
    let yourUID = app.session.user.data.id;
    let url = `https://kater.me/api/users/${yourUID}`;
    let token = app.session.csrfToken;
    let dataObj = {
        "data": {
            "type": "users",
            "id": `${yourUID}`,
            "attributes": {
                "preferences": {
                    "locale": selectLang
                }
            }
        }
    };

    let xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.setRequestHeader("x-csrf-token", token);
    xhr.setRequestHeader("x-http-method-override", "PATCH");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log(`Language change into ${selectLang}.`);
        }
    };

    let data = JSON.stringify(dataObj);
    xhr.send(data);
}

// 覆寫提及使用者連結 (v0.2)
function overwriteUserMention(node) {
    let re = /kater.me\/u\/(.+)$/;
    let name = node.href.match(re)[1];
    node.classList.add("overwrited");

    fetch(`https://kater.me/api/users?filter%5Bq%5D=${name}&page%5Blimit%5D=1`)
        .then(function (response) {
            return response.json();
        }).then(function (json) {
            node.href = `https://kater.me/u/${json.data[0].id}`;
        });
}

// 用 UID 提及使用者 (v0.3)
function mentionUserById(uid) {
    let result_avatar = document.querySelector("div#us_resultAvatar");
    let result_name = document.querySelector("div#us_resultName");

    fetch(`https://kater.me/api/users/${uid}`).then(function (response) {
        return response.json();
    }).then(function (json) {
        let avatar = json.data.attributes.avatarUrl;
        let avatar_exist = (typeof avatar != typeof null);
        let name = json.data.attributes.displayName;

        if (avatar_exist) {
            result_avatar.style.background = `url("${avatar}")`;
            result_avatar.style.backgroundSize = "contain";
        } else {
            result_avatar.style.background = "#ddd";
        }

        result_name.innerText = name;
    });
}

(function () {
    'use strict';
    // v0.1: 切換語言
    GM_registerMenuCommand("切換語言", function () {
        changeLang();
        setTimeout(function () {
            location.reload(true);
        }, 200);
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
    fetch("https://kater.me/api/users?sort=-joinedAt&page[limit]=1")
        .then(function (response) {
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
                        let appendDisplay = `<div id="us_display" style="display: inline-block; width: 10rem; border: 2px solid #333; border-radius: 4px; position: relative; bottom: 0; right: 0; z-index: 9999; background: #eee;"><div style="border-bottom: 1px solid #000; text-align: center; user-select: none; background: #e88;">UID 搜尋</div><div><input id="us_searchUid" style="width: 100%;"></div><div id="us_result"><table><tr><td><div id="us_resultAvatar" style="height: 2rem; width: 2rem; display: inline-block; margin: 0.5rem; border-radius: 100px; background: #ddd; background-size: contain;"></div></td><td><div id="us_resultName" style="width: calc(100% - 3rem); display: inline-block;">Username</div></td></tr></table></div></div>`;
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
                                document.querySelector("textarea#textarea1").focus();
                            }

                            input.addEventListener("input", function (e) {
                                input.value = input.value.replace(/[^0-9]/g, "");
                                let search = parseInt(input.value);
                                console.log(search <= max_uid);
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