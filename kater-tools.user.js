// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.2.2
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

// for v0.3 (incomplete)
function getUserData(uid) {
    let callback = function () {
        let code = this.status;
        let resp = this.responseText;
        if (code == 200) {

        }
    }

    function checkData(resp) {
        let data = resp;
        console.log("ck404: " + data);

        return data;
    }

    let get = new XMLHttpRequest();
    get.addEventListener("loadend", checkData);
    get.open("GET", `https://kater.me/api/users/${uid}`);
    get.send();

    return "Get: " + name;
}

// for v0.3 (incomplete)
function postData(url, data) {
  // Default options are marked with *
  return fetch(url, {
    body: JSON.stringify(data), // must match 'Content-Type' header
    headers: {
      'user-agent': '',
      'content-type': 'application/json'
    },
    method: 'POST', // *GET, POST, PUT, DELETE, etc.
  })
  .then(response => response.json()) // 輸出成 json
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