// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.2.0-pa2
// @description  Change language.
// @author       LianSheng
// @include      https://kater.me*
// @grant        GM_registerMenuCommand
// @grant        GM_info
// @require      https://greasyfork.org/scripts/377302-general-source-code-injection-tool/code/General%20Source%20Code%20Injection%20Tool.js?version=667827
// @compatible   chrome >= 71, firefox >= ??
// @license      MIT
// ==/UserScript==

// Todo List
// 0.2.0 overwrite @someone link by uid instead of by name.
// 0.3.0 Tag someone in article by uid (20%) (delay from v0.2.0-pa1)

// 更改界面語系
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

// for 0.3.0 (incomplete)
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

// for 0.3.0 (incomplete)
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
    GM_registerMenuCommand("切換語言", function () {
        changeLang();
        location.reload(true);
    });

    // for 0.3.0 (incomplete)
    try {
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