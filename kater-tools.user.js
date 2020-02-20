// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.3.0-pa1
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
// 0.3.0 Tag someone in article by uid (20%) (delay from v0.2.0-pa1)

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
        .then(function(response) {
        return response.json();
    }).then(function(json){
        node.href = `https://kater.me/u/${json.data[0].id}`;
    });
}

// 用 UID 提及使用者 (v0.3)
function mentionUserById(search) {
    // 原生清單採用添加制，故必須把先前添加的元素先刪除
    if(document.querySelectorAll(".add_by_userscript").length > 0) {
        document.querySelectorAll(".add_by_userscript").forEach(function(each){
            each.remove();
        });
    }

    try {
        let re = /^(\d+)$/
        let uid = search.match(re)[1];
        console.log(uid);

        // fetch(`https://kater.me/api/users/${search}`)
        // let userdata = getUserData(search);
        // let avatar = userdata.data.attributes.avatarUrl;
        // let avatar_exist = (userdata.data.attributes.avatarUrl != "null");
        // let name = userdata.data.attributes.displayName;

        let appendHTML = `<div class="add_by_userscript" style="padding-left: 1rem; padding-bottom: 0.5rem;">由 UID 搜尋</div><li class="add_by_userscript"><button class="PostPreview MentionsDropdown-user"><span class="PostPreview-content"><img class="Avatar" src="https://kater.me/assets/avatars/yuLiHEwFFcvaAUzP.png"><span class="username">UID</span></span></button></li><div class="add_by_userscript" style="border-bottom: 2px solid #f00;"></div></div>`;
        addHTML(appendHTML, "ul.Dropdown-menu.MentionsDropdown", "afterbegin");
    } catch (e) {}
}

(function () {
    'use strict';
    // v0.1: 切換語言
    GM_registerMenuCommand("切換語言", function () {
        changeLang();
        setTimeout(function(){
            location.reload(true);
        }, 200);
    });

    // v0.2: 覆寫提及使用者連結
    setInterval(function(){
        let match_nodes = document.querySelectorAll("a.UserMention:not(.overwrited)");
        if(match_nodes.length > 0) {
            match_nodes.forEach(function(node){
                overwriteUserMention(node);
            });
        }
    }, 100);

    // v0.3: 用 UID 提及使用者（與原生選單共存）
    // (重寫) 避免 MutationObserver 無限迴圈問題，改用 setInterval 偵測
    let markold = "init";
    let marknew = "init2";

    setInterval(function(){
        let nodes = document.querySelectorAll("ul.Dropdown-menu.MentionsDropdown");

        if(nodes.length > 0){
            let node = nodes[0];
            if(node.querySelectorAll("mark").length > 0){
                let search = node.querySelector("mark").innerText;

                // 確定搜尋文字是否變更
                markold = marknew;
                marknew = search;

                if(node.querySelectorAll(".add_by_userscript").length == 0 || markold != marknew) {
                    mentionUserById(search);
                }
            }
        }
    }, 200);

    // for 0.3 (incomplete)
    try {
        // force error (temp)
        throw "feature is incomplete (v0.3)";

        // append search by uid
        let first = true;

        let callback = function (records) {
            records.map(function (record) {
                if (record.addedNodes.length != 0) {
                    try {
                        let element = document.querySelector("ul.Dropdown-menu.MentionsDropdown");
                        let search = element.querySelector("mark").innerText;
                        let re = /(\d+)/;
                        let userdata = getUserData(search);
                        let avatar = userdata.data.attributes.avatarUrl;
                        let avatar_exist = (userdata.data.attributes.avatarUrl != "null");
                        let name = userdata.data.attributes.displayName;

                        let appendHTML =
                            `<li class="active" id="search_by_uid"><button class="PostPreview MentionsDropdown-user"><span class="PostPreview-content">${ avatar_exist ? '<img class="Avatar" src="https://kater.me/assets/avatars/dkGhtANlW0vbR1Yu.png>' : '<span class="Avatar" style="background: rgb(160, 229, 195);">???</span>'}<span class="username"><mark>12</mark></span></span></button></li>`;

                        if (search.match(re).length == 2) {
                            let append = element.querySelector("li#search_by_uid");
                            let nodelist = record.addedNodes;
                            let array = Array.apply(null, nodelist);

                            if (document.querySelectorAll("li#search_by_uid").length != 0) {
                                first = false;
                            } else {
                                first = true;
                            }

                            if (first && (!array.includes(append))) {
                                console.log(record.addedNodes);
                                addHTML(appendHTML, "ul.Dropdown-menu.MentionsDropdown", "afterbegin");
                                added = true;
                            } else {
                                if (avatar_exist) {
                                    append.querySelector("img.Avatar").src = avatar;
                                } else {
                                    append.querySelector("img.Avatar").src = avatar;
                                }
                            }
                        }
                    } catch (e) {}
                }
            });
        }

        let mo = new MutationObserver(callback);
        let target = document.querySelector("div#composer");
        let option = {
            'childList': true,
            'subtree': true
        };
        mo.observe(target, option);
    } catch (e) {
        console.log(`ErrorCatcher [Kater Tools v${GM_info.script.version}]: ${e}`);
    }
})();