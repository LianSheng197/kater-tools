// ==UserScript==
// @name         Kater Tools
// @namespace    -
// @version      0.1.1
// @description  Change language.
// @author       LianSheng
// @include      https://kater.me*
// @grant        GM_registerMenuCommand
// @compatible   chrome >= 71
// @license      MIT
// ==/UserScript==

// 更改界面語系
function changeLang() {
    let nowLang = app.data.locale;
    let selectLang = (nowLang == "en") ? "zh-hant" : "en";
    var yourUID = app.session.user.data.id;
    var url = `https://kater.me/api/users/${yourUID}`;
    var token = app.session.csrfToken;
    var dataObj = {
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

    var xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    xhr.setRequestHeader("x-csrf-token", token);
    xhr.setRequestHeader("x-http-method-override", "PATCH");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log(`Language change into ${selectLang}.`);
        }
    };

    var data = JSON.stringify(dataObj);
    xhr.send(data);
}

(function () {
    'use strict';
    GM_registerMenuCommand("切換語言", function () {
        changeLang();
        location.reload();
    });
})();